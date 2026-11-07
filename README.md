# Life

A personal PWA that puts daily-life tools (spending, habits, and future modules) behind one login.

## Layout

- `web/`: the PWA (React, Vite, Supabase). Run with `npm run dev`, build with `npm run build`, and run the logic checks with `npm run check`.
- `supabase/`: migrations, edge functions, and tests.
- `apps-script/`: Google Apps Script that reads DBS and OCBC alert emails and posts the transactions to Supabase.
- `widget/`: Scriptable iOS widget that shows spending totals.

Domain terms are in `GLOSSARY.md`, and decisions are in `docs/adr/`.
