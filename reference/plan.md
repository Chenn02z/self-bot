# Expense Tracker – Plan

Supersedes `rough-plan.md`. `google-app-script.md` is reference only.

## Goal
Personal spend tracker for iPhone (me + partner, separate accounts). Transactions arrive automatically from bank alert emails and Wallet Shortcuts, get categorised by an AI model, and show up in a Dime-style PWA plus a Scriptable widget. Scope is "see how much I spend": no budgets.

## Architecture
```
Gmail (DBS, OCBC) ──Apps Script, every 10 min──┐
iOS Wallet automation (Revolut, YouTrip) ──────┼─► ingest_transactions(key, rows) RPC ─► transactions
PWA manual add ────────────────────────────────┘                                         │ insert webhook (pg_net)
                                                                                          ▼
                                                     Edge Function classify ─► OpenRouter (CLASSIFIER_MODEL)
PWA (Vercel, static) ◄── supabase-js + RLS
Scriptable widget ◄── widget_summary(key) RPC
```
- Supabase is the entire backend. Vercel only serves static files.
- Signups are disabled. Both users are created in the Supabase dashboard.
- No backups, no Google Sheet, no migration of old Ledger data.

## Repo layout (git root = self-bot/)
```
apps-script/   Code.gs (clasp)
supabase/      migrations/, functions/classify/
web/           PWA (Vite + React + TS + Tailwind + supabase-js + vite-plugin-pwa)
widget/        Scriptable script
reference/     this plan + old script
```

## Schema
```
categories   id, user_id, name, emoji, color, kind ('expense'|'income'|'transfer')
transactions id, user_id, external_id, occurred_at timestamptz, amount numeric(12,2),
             currency default 'SGD', direction ('in'|'out'), merchant, merchant_raw,
             category_id, category_source ('user'|'ai'), note, source, raw,
             is_deleted default false, created_at, updated_at
             unique (user_id, external_id)   -- gmail msg id; null for Shortcut/manual
api_keys     key_hash, user_id, label, scope ('ingest'|'widget'), created_at
profiles     user_id, own_accounts_hint text   -- e.g. "REVOLUT, YOUTRIP, <my PayNow name>"
```
- RLS on every table: `user_id = auth.uid()`.
- A trigger on `auth.users` insert seeds default categories (Food, Transport, Shopping, Groceries, Bills, Entertainment, Health, Other, Reimbursement as expense kind, Income, Transfer) and a `profiles` row.
- `updated_at` trigger on transactions.
- Deletes are soft (`is_deleted`).

## Ingest
- `ingest_transactions(key text, rows jsonb)` is `security definer`. It hashes `key`, looks it up in `api_keys` (scope `ingest`) to get the `user_id`, and inserts with `on conflict (user_id, external_id) do nothing`. Edits and soft deletes are therefore never overwritten.
- Callers use the anon key plus their ingest key. The service role key is never used outside Supabase.
- **Apps Script** (one copy per Gmail account, key stored in Script Properties) runs every 10 minutes with a 2-day lookback.
  - DBS parser: IN (PayNow received) and OUT (transaction completed).
  - OCBC parser: card charge.
  - Fixes:
    - Timestamps are output as ISO with `+08:00`.
    - DBS OUT year: if the parsed month is later than the email's month, use the email's year minus 1.
    - OCBC merchant regex no longer stops at the first "." and captures up to the end of the sentence.
  - `raw` = subject + plain body, trimmed to about 2 KB.
- **iOS Shortcuts** (Wallet transaction automation for Revolut and YouTrip cards) POST JSON `{amount, currency, merchant, time, source}` directly to the RPC. These replace the email round trip, so the Revolut and YouTrip parsers are removed.
- Refunds are handled manually with the direction toggle in the edit sheet.
- Currency: assume SGD for totals. `currency` is stored for a later FX feature.

## Classification
- A Database Webhook on `transactions` insert where `category_id is null` calls the `classify` Edge Function.
- The prompt contains:
  - the user's category list (id, name, kind)
  - the row's merchant_raw, direction and source
  - `own_accounts_hint`
  - the last ~30 rows where `category_source='user'`, as merchant → category examples
- The model returns structured JSON `{category_id}`. An invalid id or a timeout leaves the row uncategorised.
- Hints in the prompt:
  - Money in from people → Reimbursement.
  - Money between own accounts, in or out → Transfer.
- Secrets: `OPENROUTER_API_KEY`, `CLASSIFIER_MODEL=typesafe/jev-router`. Swap the model by changing the secret.
- The model only picks from existing categories and never creates new ones.
- Editing a category in the app sets `category_source='user'` and changes that row only. It also feeds future prompts as an example.

## Spend math
- Spend = Σ amount(out) − Σ amount(in), over rows in `expense`-kind categories or with no category, excluding `is_deleted`.
- `income` and `transfer` rows are listed but never counted, so moves between own accounts are not double counted.
- The same calculation runs per category for the breakdown.

## PWA
- Auth: email + password (free tier cannot edit email templates, so OTP codes are not possible). Accounts are created by admin; signups are disabled.
- Screens:
  - **Home:** month-to-date spend, category breakdown, ‹ › month switcher.
  - **List:** grouped by day, pull-to-refresh.
  - **Edit sheet:** merchant, amount, category, note, direction, delete.
  - **Manual add**
  - **Settings:** categories CRUD, API keys (create, shown once, revoke), own-accounts hint, sign out.
- No Realtime. Data refetches on focus and on pull-to-refresh.
- No budgets, CSV export, week/year views or search.
- Dime is a visual reference only. Its code is GPL, so nothing is copied from it.

## Widget
- Scriptable script with the anon key, plus a widget-scoped key stored in Keychain.
- `widget_summary(key)` (`security definer`) returns `{month_spend, today_spend}` using the spend math above.

## Build order
1. Supabase project (Singapore) + migrations: schema, RLS, seed trigger, `ingest_transactions`, `widget_summary`
2. `classify` Edge Function + insert webhook
3. Apps Script (DBS/OCBC) pointed at the RPC
4. Revolut/YouTrip Shortcut posting to the RPC
5. PWA: OTP sign-in, Home, List, Edit, Add, Settings, then deploy to Vercel
6. Scriptable widget

## Later (not now)
FX conversion (`amount_sgd`), web push alerts, cash quick-add Shortcut (it would reuse the ingest RPC).
