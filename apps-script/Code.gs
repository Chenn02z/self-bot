/**
 * Expense tracker ingest: parses DBS + OCBC alert emails and posts them to Supabase.
 * Revolut/YouTrip come from iOS Shortcuts directly, not via this script.
 *
 * Setup (once per Gmail account):
 *   1. Project Settings → Script Properties → add INGEST_KEY = <your ingest key>
 *   2. Run testParsers() → should log "parsers ok"
 *   3. Run setup() → authorises Gmail/UrlFetch and installs the 10-minute trigger
 */
const CONFIG = {
  SUPABASE_URL: "https://bfpeqizfymrmsoxjbmhp.supabase.co",
  // Publishable key is public by design (also shipped in the PWA); the ingest key is the secret.
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mfloIXxPU2pDFhPKiomiJQ_DOYrZl4y",
  LOOKBACK_DAYS: 2,
  MAX_THREADS_PER_LABEL: 50,
  SOURCES: [
    { label: "Finances/DBS", source: "DBS", parse: (b, d) => parseDBS_(b, d) },
    { label: "Finances/OCBC", source: "OCBC", parse: (b, d) => parseOCBC_(b, d) },
  ],
};

function setup() {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === "ingest") ScriptApp.deleteTrigger(t);
  }
  ScriptApp.newTrigger("ingest").timeBased().everyMinutes(10).create();
  ingest();
}

function ingest() {
  const key = PropertiesService.getScriptProperties().getProperty("INGEST_KEY");
  if (!key) throw new Error("Missing Script Property INGEST_KEY");

  const rows = [];
  for (const src of CONFIG.SOURCES) {
    if (!GmailApp.getUserLabelByName(src.label)) throw new Error(`Missing Gmail label: ${src.label}`);
    const threads = GmailApp.search(`label:"${src.label}" newer_than:${CONFIG.LOOKBACK_DAYS}d`, 0, CONFIG.MAX_THREADS_PER_LABEL);
    for (const thread of threads) {
      for (const msg of thread.getMessages()) {
        const body = msg.getPlainBody() || "";
        const parsed = src.parse(body, msg.getDate());
        if (!parsed) continue; // not a transaction template
        rows.push(Object.assign(parsed, {
          external_id: msg.getId(),
          source: src.source,
          raw: `${msg.getSubject() || ""}\n\n${body}`.slice(0, 2000),
        }));
      }
    }
  }
  if (!rows.length) return;

  // Server dedupes on (user, external_id) and never overwrites edits.
  const res = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/ingest_transactions`, {
    method: "post",
    contentType: "application/json",
    headers: { apikey: CONFIG.SUPABASE_PUBLISHABLE_KEY },
    payload: JSON.stringify({ p_key: key, p_rows: rows }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error(`Ingest failed ${res.getResponseCode()}: ${res.getContentText()}`);
  }
  console.log(`sent ${rows.length}, inserted ${res.getContentText()}`);
}

/* ========================= PARSERS ========================= */
// Each returns {occurred_at, amount, direction, merchant_raw} or null.

function parseDBS_(plainText, emailDate) {
  const text = normalizeText_(plainText);

  // IN: "You have received SGD 25.00 via PayNow on 18 Dec 2025 22:45 SGT" ... "From: NAME"
  if (/You have received\s+SGD/i.test(text)) {
    const amount = match1_(text, /You have received\s+SGD\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (!amount) return null;
    const m = text.match(/on\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2})\s+SGT/i);
    return {
      occurred_at: m ? sgtIso_(+m[3], monthIndex_(m[2]), +m[1], m[4], m[5]) : emailIso_(emailDate),
      amount: toAmount_(amount),
      direction: "in",
      merchant_raw: match1_(text, /From:\s*(.+)/i) || "Unknown",
    };
  }

  // OUT: "transaction was completed" ... "Amount: SGD 12.30" "To: NAME" "Date & Time: 18 Dec 22:40 (SGT)"
  if (/transaction was completed/i.test(text)) {
    const amount = match1_(text, /Amount:\s*SGD\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (!amount) return null;
    const m = text.match(/Date\s*&\s*Time:\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2}):(\d{2})\s*\(SGT\)/i);
    let occurred_at = emailIso_(emailDate);
    if (m) {
      // Year isn't in the email: use the email's SGT year, minus 1 if the month is after the email's
      // month (a 31 Dec transfer whose email arrives 1 Jan).
      const [ey, em] = Utilities.formatDate(emailDate, "Asia/Singapore", "yyyy-M").split("-").map(Number);
      const mon = monthIndex_(m[2]);
      occurred_at = sgtIso_(mon + 1 > em ? ey - 1 : ey, mon, +m[1], m[3], m[4]);
    }
    return {
      occurred_at,
      amount: toAmount_(amount),
      direction: "out",
      // "TAX EX HERXX (MOBILE ending 7542)" -> "TAX EX HERXX"
      merchant_raw: (match1_(text, /To:\s*(.+)/i) || "Unknown").replace(/\s*\((?:MOBILE|UEN|NRIC)[^)]*\)\s*$/i, ""),
    };
  }
  return null;
}

// "SGD343.35 was charged at 00:44 on 06-Nov-26 to your card\n(-9485) at FLYSCOOT.COM SINGAPORE SG.\nDid not make this transaction?"
function parseOCBC_(plainText, emailDate) {
  const text = normalizeText_(plainText).replace(/\s+/g, " "); // sentence wraps across lines
  const m = text.match(
    /SGD\s*([0-9,]+(?:\.[0-9]+)?)\s+was\s+charged\s+at\s+(\d{2}):(\d{2})\s+on\s+(\d{1,2})-([A-Za-z]{3})-(\d{2})\s+to\s+your\s+card\s+\(-\d{4}\)\s+at\s+(.+)/i);
  if (!m) return null;
  // Merchant names contain dots ("Pte. Ltd.", "FLYSCOOT.COM"), so cut at the sentence that follows
  // the merchant in OCBC's template, not at the first ".".
  // ponytail: tied to OCBC's wording; if they change it, merchants run long, and rows keep `raw` for re-parsing.
  const merchant = m[7]
    .split(/\.\s+(?=Did not make|If |Please |Thank )/)[0]
    .replace(/\.\s*$/, "")
    .trim();
  return {
    occurred_at: sgtIso_(2000 + +m[6], monthIndex_(m[5]), +m[4], m[2], m[3]),
    amount: toAmount_(m[1]),
    direction: "out",
    merchant_raw: merchant,
  };
}

/* ========================= HELPERS ========================= */

const MONTHS_ = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function monthIndex_(mmm) { return MONTHS_.indexOf(mmm.slice(0, 3).toLowerCase()); }

// Builds an ISO timestamp with an explicit +08:00 offset, so Postgres never reads it as UTC.
function sgtIso_(y, monIdx, d, hh, mm) {
  const p = (n) => String(n).padStart(2, "0");
  return `${y}-${p(monIdx + 1)}-${p(d)}T${p(hh)}:${p(mm)}:00+08:00`;
}
function emailIso_(dateObj) { return Utilities.formatDate(dateObj, "Asia/Singapore", "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function toAmount_(s) { return Number(String(s).replace(/,/g, "")); }

function normalizeText_(s) {
  return (s || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function match1_(text, regex) {
  const m = text.match(regex);
  return m && m[1] ? m[1].trim() : null;
}

/* ========================= SELF-CHECK ========================= */
// Run from the editor. Throws on the first mismatch.
function testParsers() {
  const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
  const jan1 = new Date("2026-01-01T00:30:00+08:00");

  const nov6 = new Date("2026-11-06T00:44:00+08:00");
  const oct9 = new Date("2026-10-09T21:48:00+08:00");

  // Real samples from reference/email/
  eq(parseOCBC_("Dear Valued Customer\n\nWe wish to inform you that SGD343.35 was charged at 00:44 on 06-Nov-26 to your card\n(-9485) at FLYSCOOT.COM SINGAPORE SG.\n\nDid not make this transaction?\n- Lock your card and/or report it as lost: OCBC app > More", nov6),
    { occurred_at: "2026-11-06T00:44:00+08:00", amount: 343.35, direction: "out", merchant_raw: "FLYSCOOT.COM SINGAPORE SG" }, "ocbc");
  eq(parseOCBC_("SGD41.90 was charged at 19:38 on 18-Dec-25 to your card (-9485) at Mothers Work Pte. Ltd. SG.\nDid not make this transaction?", nov6).merchant_raw,
    "Mothers Work Pte. Ltd. SG", "ocbc dotted merchant");

  const dbsOut = "Dear Customer,\n\nWe refer to your PAYNOW dated 09 Oct. We are pleased to confirm that the\ntransaction was completed.\n\nDate & Time:\n09 Oct 21:48 (SGT)\nAmount:\nSGD32.00\nFrom:\nMain A/C ending 4890\nTo:\nTAX EX HERXX (MOBILE ending 7542)\n\nIf unauthorised, please call our DBS hotline.";
  eq(parseDBS_(dbsOut, oct9),
    { occurred_at: "2026-10-09T21:48:00+08:00", amount: 32, direction: "out", merchant_raw: "TAX EX HERXX" }, "dbs out");
  eq(parseDBS_(dbsOut.replace(/09 Oct/g, "31 Dec"), jan1).occurred_at, "2025-12-31T21:48:00+08:00", "dbs out year rollover");

  eq(parseDBS_("Transaction Ref: PIB2610112187420971 C120621858685\n\nDear Customer,\n\nYou have received SGD 16.70 via PayNow on 11 Oct 2026 23:09 SGT.\n\nFrom: LIM YONG XU\nTo:Your DBS/ POSB account ending 4890", oct9),
    { occurred_at: "2026-10-11T23:09:00+08:00", amount: 16.7, direction: "in", merchant_raw: "LIM YONG XU" }, "dbs in");
  eq(parseDBS_("Some marketing email", jan1), null, "non-match");
  console.log("parsers ok");
}
