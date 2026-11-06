// Spend widget for Scriptable (https://scriptable.app).
// Shows this month's and today's spend. The widget key comes from the PWA: Settings → API keys → scope "widget".
// First run: open the script inside Scriptable and paste the key when prompted (stored in Keychain).

const URL = "https://bfpeqizfymrmsoxjbmhp.supabase.co/rest/v1/rpc/widget_summary";
const PUBLISHABLE_KEY = "sb_publishable_mfloIXxPU2pDFhPKiomiJQ_DOYrZl4y"; // public by design
const KEYCHAIN = "spend_widget_key";

async function widgetKey() {
  if (Keychain.contains(KEYCHAIN)) return Keychain.get(KEYCHAIN);
  if (config.runsInWidget) return null;
  const a = new Alert();
  a.title = "Widget key";
  a.message = "Paste the widget key from the Spend app (Settings → API keys).";
  a.addSecureTextField("key");
  a.addAction("Save");
  a.addCancelAction("Cancel");
  if ((await a.present()) === -1) return null;
  const k = a.textFieldValue(0).trim();
  Keychain.set(KEYCHAIN, k);
  return k;
}

async function summary(key) {
  const req = new Request(URL);
  req.method = "POST";
  req.headers = { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" };
  req.body = JSON.stringify({ p_key: key });
  const res = await req.loadJSON();
  if (req.response.statusCode !== 200) {
    // revoked or wrong key: forget it so the next in-app run prompts again
    if (res.code === "28000") Keychain.remove(KEYCHAIN);
    throw new Error(res.message || `HTTP ${req.response.statusCode}`);
  }
  return res;
}

const money = (n) => "$" + Number(n).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function build(data, error) {
  const w = new ListWidget();
  w.backgroundColor = Color.dynamic(Color.white(), new Color("#1c1c1e"));
  w.url = "https://spend-nu-five.vercel.app";
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  const fg = Color.dynamic(new Color("#111111"), Color.white());
  const grey = Color.gray();

  const label = (text) => { const t = w.addText(text.toUpperCase()); t.font = Font.semiboldSystemFont(10); t.textColor = grey; };
  if (error) {
    label("Spend");
    w.addSpacer(4);
    const t = w.addText(error);
    t.font = Font.systemFont(12);
    t.textColor = Color.red();
    return w;
  }

  label(new Date().toLocaleDateString("en-SG", { month: "long" }));
  const m = w.addText(money(data.month_spend));
  m.font = Font.boldRoundedSystemFont(28);
  m.textColor = fg;
  m.minimumScaleFactor = 0.5;
  w.addSpacer();
  label("Today");
  const d = w.addText(money(data.today_spend));
  d.font = Font.semiboldRoundedSystemFont(17);
  d.textColor = fg;
  return w;
}

let widget;
try {
  const key = await widgetKey();
  widget = key ? build(await summary(key)) : build(null, "Open in Scriptable to add your widget key");
} catch (e) {
  widget = build(null, e.message);
}
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentSmall();
Script.complete();
