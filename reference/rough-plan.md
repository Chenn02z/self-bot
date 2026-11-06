# Expense Tracker – Handover

## Goal
Personal expense tracker for my iPhone. Transactions are collected automatically from bank alert emails, with a UI in the style of Dime (/Users/yuchen/Projects/dimeApp), Home Screen widgets, and editing in the app.

## Decisions made
- **App type: PWA**, not native. Reasons: no 7-day expiry, no Apple Developer account, no App Store, instant updates, works on any device.
- **Widgets: Scriptable** (a free iOS app), because PWAs can't have widgets.
- **Database: Supabase** (Singapore region). It becomes the main record and replaces the Google Sheet. The Sheet is optional, as a backup only.
- **Collection: reference Google Apps Script** (/Users/yuchen/Projects/self-bot/reference/google-app-script.md, Gmail parser for DBS/PayLah/PayNow, OCBC, Revolut, YouTrip), can be changed
- **Edits are never overwritten:** `gmail_id` is unique, and inserts use `on_conflict=gmail_id` + `Prefer: resolution=ignore-duplicates`. Deletes are soft (`is_deleted`).
- **Auth: Supabase email OTP codes, not magic links.** On iOS, magic links open in Safari, which has separate storage from the Home Screen PWA.
- **Widget auth:** a `security definer` Postgres function `widget_summary(token)` that returns summary numbers only, with tokens stored in a `widget_tokens` table and revocable from the PWA.
- **Auto-categorisation:** a `rules` table plus a DB trigger on insert. Rules are created when I recategorise a transaction ("Always categorise X as Y?").
- **Hosting:** Vercel or Netlify (free), deployed from the repo.

## Stack
- Apps Script (managed with clasp)
- Supabase (Postgres, RLS, RPC functions, Realtime, CLI migrations)
- PWA: Vite + React + TypeScript + Tailwind + supabase-js + vite-plugin-pwa
- Scriptable widget (JS)

## Repo structure
expense-app/
├── apps-script/   # Code.gs
├── supabase/      # migrations: schema, RLS, triggers, functions
├── web/           # PWA
├── widget/        # Scriptable script
└── README.md

## Schema
- transactions: id, user_id, gmail_id (unique), timestamp, amount, currency, direction (IN/OUT), merchant_raw, merchant_display, category_id, note, source, is_deleted, created_at, updated_at
- categories: id, user_id, name, emoji, color, monthly_budget
- rules: id, user_id, match_text, category_id
- widget_tokens: token, user_id, created_at
- RLS on all tables: user_id = auth.uid()

## Keys
- Service role key → Apps Script Script Properties ONLY (never in the PWA or repo)
- Anon key → PWA env file + Scriptable script
- Widget token → Scriptable Keychain

## Known bugs to fix in the existing Apps Script
1. OCBC merchant regex stops at the first "." ("Mothers Work Pte. Ltd." → "Mothers Work Pte")
2. DBS outgoing: year is taken from the email date, so a transfer on 31 Dec whose email arrives 1 Jan gets the wrong year
3. Revolut/YouTrip are always marked OUT, so refunds aren't detected
4. YOUTRIP_LABEL is missing from labelsToCheck

## Build order
1. Supabase schema + RLS + rule trigger
2. Fix the Apps Script and point it at Supabase
3. One-time migration of existing Ledger rows (CSV → transactions)
4. PWA setup + OTP sign-in + hosting
5. UI: home summary, transaction list, edit sheet, manual add, budgets, settings (rules, CSV export, widget tokens)
6. Scriptable widget + widget_summary RPC
7. Extras: cash quick-add Shortcut, web push budget alerts, multiple currencies (amount_sgd), weekly backup