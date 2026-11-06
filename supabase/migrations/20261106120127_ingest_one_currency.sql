-- ingest_one: when p_currency is omitted, take the ISO code from the amount text ("MYR 70.60").
create or replace function public.ingest_one(
  p_key text, p_amount text, p_merchant text, p_source text, p_currency text default null
) returns int
language sql security definer set search_path = '' as $$
  select public.ingest_transactions(p_key, jsonb_build_array(jsonb_build_object(
    'occurred_at', now(),
    'amount', nullif(regexp_replace(p_amount, '[^0-9.]', '', 'g'), '')::numeric,
    'currency', coalesce(nullif(trim(p_currency), ''), substring(upper(p_amount) from '[A-Z]{3}'), 'SGD'),
    'direction', 'out',
    'merchant_raw', p_merchant,
    'source', p_source
  )))
$$;
revoke execute on function public.ingest_one from public;
grant execute on function public.ingest_one to anon, authenticated;
