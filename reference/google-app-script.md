const CONFIG = {
  DBS_LABEL: "Finances/DBS",
  OCBC_LABEL: "Finances/OCBC",
  REVOLUT_LABEL: "Finances/Revolut",
  YOUTRIP_LABEL: "Finances/Youtrip",
  SHEET_NAME: "Ledger",
  MAX_THREADS_PER_RUN: 50,
  LOOKBACK_DAYS: 5
};

/**
 * Entry point: run on a time trigger (e.g. once daily).
 * Scans DBS + OCBC + Revolut labeled threads in the last LOOKBACK_DAYS,
 * parses new messages (by msgId), and appends to the Ledger sheet.
 */
function ingestFinanceAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet tab "${CONFIG.SHEET_NAME}" not found`);

  // Ensure labels exist
  const labelsToCheck = [CONFIG.DBS_LABEL, CONFIG.OCBC_LABEL, CONFIG.REVOLUT_LABEL];
  for (const labelName of labelsToCheck) {
    if (!GmailApp.getUserLabelByName(labelName)) {
      throw new Error(`Missing Gmail label: ${labelName}`);
    }
  }

  // Dedupe by Gmail message ID stored in sheet
  const seen = loadSeenMessageIds_(sheet);
  const rowsToAppend = [];

  const sources = [
    { label: CONFIG.DBS_LABEL, sourceName: "DBS", parser: parseDBS_ },
    { label: CONFIG.OCBC_LABEL, sourceName: "OCBC", parser: parseOCBC_ },
    { label: CONFIG.REVOLUT_LABEL, sourceName: "Revolut", parser: parseRevolut_ },
    { label: CONFIG.YOUTRIP_LABEL, sourceName: "Youtrip", parser: parseYoutrip_ }
  ];

  for (const src of sources) {
    const query = `label:"${src.label}" newer_than:${CONFIG.LOOKBACK_DAYS}d`;
    const threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS_PER_RUN);

    for (const thread of threads) {
      const messages = thread.getMessages();

      for (const msg of messages) {
        const msgId = msg.getId();
        if (seen.has(msgId)) continue;

        const subject = msg.getSubject() || "";
        const body = msg.getPlainBody() || "";
        const dateObj = msg.getDate();

        const parsed = src.parser(body, dateObj);
        if (!parsed) continue; // ignore non-matching templates

        rowsToAppend.push([
          parsed.timestamp,          // Timestamp
          parsed.amount,             // Amount
          parsed.currency,           // Currency
          parsed.direction,          // IN / OUT
          parsed.counterparty,       // Counterparty or Merchant
          src.sourceName,            // Source
          msgId,                     // GmailMessageId
          subject,                   // EmailSubject
          monthAbbrev_(parsed.timestamp),
        ]);

        seen.add(msgId);
      }
    }
  }

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
      .setValues(rowsToAppend);
  }
}

/**
 * =========================
 * PARSERS
 * =========================
 */

/**
 * Parse DBS iBanking alerts (two variants):
 * 1) IN: "You have received SGD X via PayNow on <date time> SGT."
 * 2) OUT: "transaction was completed" + fields like Amount / From / To
 *
 * Returns normalized object or null if not matched.
 */
function parseDBS_(plainText, fallbackDateObj) {
  const text = normalizeText_(plainText);

  // Variant A: Incoming
  if (/You have received\s+SGD/i.test(text)) {
    const amountStr = match1_(text, /You have received\s+SGD\s*([0-9]+(?:\.[0-9]+)?)/i);
    const counterparty = match1_(text, /From:\s*(.+)/i) || "";

    // "on 18 Dec 2025 22:45 SGT"
    const dateStr = match1_(text, /on\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2})\s+SGT/i);
    const timestamp = dateStr ? parseSGT_(dateStr) : toISO_(fallbackDateObj);

    if (!amountStr) return null;

    return {
      timestamp,
      amount: Number(amountStr),
      currency: "SGD",
      direction: "IN",
      counterparty: counterparty.trim()
    };
  }

  // Variant B: Outgoing
  if (/transaction was completed/i.test(text) || /We are pleased to confirm that the transaction was completed/i.test(text)) {
    const amountStr = match1_(text, /Amount:\s*SGD\s*([0-9]+(?:\.[0-9]+)?)/i);
    const counterparty = match1_(text, /To:\s*(.+)/i) || "";

    // "Date & Time: 18 Dec 22:40 (SGT)" (year missing)
    const dtStr = match1_(text, /Date\s*&\s*Time:\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2}:\d{2})\s*\(SGT\)/i);
    const timestamp = dtStr ? parseSGTWithYear_(dtStr, fallbackDateObj) : toISO_(fallbackDateObj);

    if (!amountStr) return null;

    return {
      timestamp,
      amount: Number(amountStr),
      currency: "SGD",
      direction: "OUT",
      counterparty: counterparty.trim()
    };
  }

  return null;
}

/**
 * Parse OCBC card charge alert:
 * "SGD41.90 was charged at 19:38 on 18-Dec-25 to your card (-9485) at Mothers Work Pte. Ltd. SI."
 *
 * Returns normalized object or null if not matched.
 */
function parseOCBC_(plainText, fallbackDateObj) {
  // IMPORTANT: collapse ALL whitespace (including newlines) into spaces
  const text = normalizeText_(plainText).replace(/\s+/g, " ");

  const re =
    /SGD\s*([0-9]+(?:\.[0-9]+)?)\s+was\s+charged\s+at\s+(\d{2}:\d{2})\s+on\s+(\d{1,2}-[A-Za-z]{3}-\d{2})\s+to\s+your\s+card\s+\(-(\d{4})\)\s+at\s+(.+?)(?:\s*(?:\.|$))/i;

  const m = text.match(re);
  if (!m) return null;

  const amount = Number(m[1]);
  const time = m[2];
  const date = m[3];
  const cardLast4 = m[4];
  const merchant = m[5].trim();

  const timestamp = parseOCBCDateTimeSGT_(date, time) || toISO_(fallbackDateObj);

  return {
    timestamp,
    amount,
    currency: "SGD",
    direction: "OUT",
    counterparty: merchant
  };
}

/**
 * Parse Revolut "shortcut email" format:
 *
 * SOURCE: REVOLUT
 * AMOUNT: SGD 12.34
 * MERCHANT: SOME MERCHANT
 * TIME: 20 Dec 2025 at 2:23 PM
 */
  function parseRevolut_(plainText, fallbackDateObj) {
  const text = normalizeText_(plainText);
  console.log(text);

  // Guard: ensure Revolut template
  if (!/^SOURCE:\s*REVOLUT/im.test(text)) return null;

  /**
   * AMOUNT line examples:
   * "AMOUNT: MYR 70.60"
   * "AMOUNT: SGD 12.34"
   */
  const m = text.match(/AMOUNT:\s*(?:([A-Z]{3})\s*|([€£$])\s*)([0-9]+(?:\.[0-9]+)?)/i);
  if (!m) return null;

  const code = m[1] ? m[1].toUpperCase() : null;
  const sym = m[2] || null;
  const amountStr = m[3];

  const symbolToCurrency = { "€": "EUR", "£": "GBP", "$": "USD" };
  const currency = code || symbolToCurrency[sym] || "UNKNOWN";

  // const currency = m[1] ? m[1].toUpperCase() : "EUR";
  // const amountStr = m[2];

  const merchant = match1_(text, /MERCHANT:\s*(.+)/i);
  if (!merchant) return null;

  // TIME: "22 Dec 2025 at 2:55 PM"
  const timeStr = match1_(text, /TIME:\s*(.+)$/im);
  const timestamp =
    (timeStr && parseRevolutTimeToISO_(timeStr)) ||
    toISO_(fallbackDateObj);

  return {
    timestamp,
    amount: Number(amountStr),
    currency,
    direction: "OUT",
    counterparty: merchant.trim()
  };
}

/**
 * Parse Youtrip "shortcut email" format:
 *
 * SOURCE: YOUTRIP
 * AMOUNT: SGD 12.34
 * MERCHANT: SOME MERCHANT
 * TIME: 20 Dec 2025 at 2:23 PM
 */
  function parseYoutrip_(plainText, fallbackDateObj) {
  const text = normalizeText_(plainText);
  console.log(text);

  // Guard: ensure Revolut template
  if (!/^SOURCE:\s*YOUTRIP/im.test(text)) return null;

  /**
   * AMOUNT line examples:
   * "AMOUNT: MYR 70.60"
   * "AMOUNT: SGD 12.34"
   */

  const m = text.match(/AMOUNT:\s*(?:([A-Z]{3})\s*|([€£$])\s*)([0-9]+(?:\.[0-9]+)?)/i);
  if (!m) return null;

  const code = m[1] ? m[1].toUpperCase() : null;
  const sym = m[2] || null;
  const amountStr = m[3];

  const symbolToCurrency = { "€": "EUR", "£": "GBP", "$": "USD" };
  const currency = code || symbolToCurrency[sym] || "UNKNOWN";


  const merchant = match1_(text, /MERCHANT:\s*(.+)/i);
  if (!merchant) return null;

  // TIME: "22 Dec 2025 at 2:55 PM"
  const timeStr = match1_(text, /TIME:\s*(.+)$/im);
  const timestamp =
    (timeStr && parseRevolutTimeToISO_(timeStr)) ||
    toISO_(fallbackDateObj);

  return {
    timestamp,
    amount: Number(amountStr),
    currency,
    direction: "OUT",
    counterparty: merchant.trim()
  };
}


/**
 * =========================
 * DATE PARSING HELPERS
 * =========================
 */

function toISO_(dateObj) {
  // Date object to ISO string in Asia/Singapore time
  return Utilities.formatDate(dateObj, "Asia/Singapore", "yyyy-MM-dd HH:mm:ss");
}

function parseSGT_(dateStr) {
  // dateStr format: "18 Dec 2025 22:45"
  const d = new Date(dateStr);
  return Utilities.formatDate(d, "Asia/Singapore", "yyyy-MM-dd HH:mm:ss");
}

function parseSGTWithYear_(dtStr, fallbackDateObj) {
  // dtStr format: "18 Dec 22:40" (no year)
  const year = fallbackDateObj.getFullYear();
  const d = new Date(`${dtStr} ${year}`);
  return Utilities.formatDate(d, "Asia/Singapore", "yyyy-MM-dd HH:mm:ss");
}

function parseOCBCDateTimeSGT_(ddMmmYy, hhmm) {
  // ddMmmYy like "18-Dec-25"
  const parts = ddMmmYy.split("-");
  if (parts.length !== 3) return null;

  const day = parts[0];
  const mon = parts[1];
  const yy = parts[2];
  const yyyy = Number(yy) + 2000;

  const dateStr = `${day} ${mon} ${yyyy} ${hhmm}`;
  const d = new Date(dateStr);
  return Utilities.formatDate(d, "Asia/Singapore", "yyyy-MM-dd HH:mm:ss");
}

/**
 * Revolut TIME line parser:
 * Example: "20 Dec 2025 at 2:23 PM"
 *
 * Produces ISO string in Asia/Singapore.
 * If parsing fails, returns null.
 */
function parseRevolutTimeToISO_(timeLine) {
  const s = (timeLine || "").trim();

  // Normalize: allow variations like "20 Dec 2025 at 2:23 PM"
  // We'll parse with JS Date by converting "at" to space and appending GMT+8.
  // NOTE: This relies on English month names from the iOS email.
  const normalized = s.replace(/\s+at\s+/i, " ");
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;

  return Utilities.formatDate(d, "Asia/Singapore", "yyyy-MM-dd HH:mm:ss");
}

/**
 * =========================
 * TEXT + DEDUPE HELPERS
 * =========================
 */

function normalizeText_(s) {
  return (s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function match1_(text, regex) {
  const m = text.match(regex);
  return m && m[1] ? m[1].trim() : null;
}

function loadSeenMessageIds_(sheet) {
  const seen = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return seen;

  // GmailMessageId column is 7th
  const values = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
  for (const [id] of values) {
    if (id) seen.add(String(id));
  }
  return seen;
}

function monthAbbrev_(timestampStr) {
  // timestampStr format: "yyyy-MM-dd HH:mm:ss"
  if (!timestampStr) return "";

  const d = new Date(timestampStr.replace(" ", "T") + "+08:00");
  if (isNaN(d.getTime())) return "";

  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}


