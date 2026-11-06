// Classifies one transaction into one of the user's existing categories via OpenRouter.
// Called by the transactions insert trigger (pg_net) with a secret API key: { id }.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const MODEL = Deno.env.get("CLASSIFIER_MODEL") ?? "typesafe/jev-router";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;

export default {
  fetch: withSupabase({ auth: "secret:classify_webhook" }, async (req, ctx) => {
    const db = ctx.supabaseAdmin;
    const { id } = await req.json();

    const { data: tx } = await db.from("transactions")
      .select("id, user_id, merchant_raw, direction, source, amount, currency, category_id")
      .eq("id", id).single();
    if (!tx || tx.category_id) return Response.json({ skipped: true });

    const [{ data: cats }, { data: profile }, { data: examples }] = await Promise.all([
      db.from("categories").select("id, name, kind").eq("user_id", tx.user_id),
      db.from("profiles").select("own_accounts_hint").eq("user_id", tx.user_id).single(),
      db.from("transactions").select("merchant_raw, direction, categories(name)")
        .eq("user_id", tx.user_id).eq("category_source", "user")
        .order("updated_at", { ascending: false }).limit(30),
    ]);
    if (!cats?.length) return Response.json({ skipped: true });

    const names = cats.map((c) => c.name);
    const prompt = [
      "Categorise this bank transaction for a personal spend tracker in Singapore.",
      `Categories (name: kind): ${cats.map((c) => `${c.name}: ${c.kind}`).join(", ")}.`,
      "Rules: money moved between the user's own accounts (either direction) is Transfer.",
      "Money received from another person is Reimbursement. Salary/interest is Income.",
      `The user's own accounts / names: ${profile?.own_accounts_hint || "(none given)"}.`,
      examples?.length
        ? "Past corrections by the user (follow these):\n" + examples
          // deno-lint-ignore no-explicit-any
          .map((e: any) => `- ${e.direction} "${e.merchant_raw}" -> ${e.categories?.name}`).join("\n")
        : "",
      `Transaction: ${tx.direction} ${tx.currency} ${tx.amount}, "${tx.merchant_raw}", via ${tx.source}.`,
    ].filter(Boolean).join("\n");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "category",
            strict: true,
            schema: {
              type: "object",
              properties: { category: { type: "string", enum: names } },
              required: ["category"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!res.ok) return Response.json({ error: await res.text() }, { status: 502 });

    const content = (await res.json()).choices?.[0]?.message?.content ?? "";
    let name: string | undefined;
    try { name = JSON.parse(content).category; } catch { /* invalid -> stays uncategorised */ }
    const cat = cats.find((c) => c.name === name);
    if (!cat) return Response.json({ uncategorised: true, content });

    // category_id is null guard: never overwrite a category the user set meanwhile
    await db.from("transactions").update({ category_id: cat.id, category_source: "ai" })
      .eq("id", tx.id).is("category_id", null);
    return Response.json({ category: cat.name });
  }),
};
