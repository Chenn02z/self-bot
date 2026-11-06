-- Flat single-transaction ingest for iOS Shortcuts (Wallet automation for Revolut/YouTrip).
-- Shortcuts can't easily build a JSON array of objects, so this takes plain fields and
-- delegates to ingest_transactions (one insert path, same key check).
-- p_amount is text: "S$5.20", "RM 70.60", "1,234.50" all work (non-numeric chars are stripped).
create function public.ingest_one(
  p_key text, p_amount text, p_merchant text, p_source text, p_currency text default 'SGD'
) returns int
language sql security definer set search_path = '' as $$
  select public.ingest_transactions(p_key, jsonb_build_array(jsonb_build_object(
    'occurred_at', now(),
    'amount', nullif(regexp_replace(p_amount, '[^0-9.]', '', 'g'), '')::numeric,
    'currency', coalesce(nullif(trim(p_currency), ''), 'SGD'),
    'direction', 'out',
    'merchant_raw', p_merchant,
    'source', p_source
  )))
$$;
revoke execute on function public.ingest_one from public;
grant execute on function public.ingest_one to anon, authenticated;
