-- End-to-end check of the init migration. Runs in a transaction and rolls back.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'smoke-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'smoke-b@test.local');

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  k text; w text; n int; s json;
  rows jsonb := '[
    {"external_id":"g1","occurred_at":"2026-11-06T09:00:00+08:00","amount":10,"direction":"OUT","merchant_raw":" Mothers Work Pte. Ltd. ","source":"OCBC"},
    {"external_id":"g2","occurred_at":"2026-11-06T10:00:00+08:00","amount":4,"direction":"in","merchant_raw":"JANE","source":"DBS"},
    {"external_id":"g3","occurred_at":"2026-11-06T11:00:00+08:00","amount":50,"direction":"out","merchant_raw":"REVOLUT","source":"DBS"},
    {"occurred_at":"2026-11-06T12:00:00+08:00","amount":7.5,"currency":"myr","direction":"out","merchant_raw":"KFC","source":"Revolut"}
  ]';
begin
  -- seed trigger
  assert (select count(*) from public.categories where user_id = a) = 11, 'seeded categories';
  assert exists (select 1 from public.profiles where user_id = a), 'seeded profile';

  -- keys (as user a)
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  k := public.create_api_key('apps script', 'ingest');
  w := public.create_api_key('widget', 'widget');
  assert (select count(*) from public.api_keys where user_id = a) = 2, 'keys stored';
  assert not exists (select 1 from public.api_keys where key_hash = k), 'plaintext not stored';

  -- ingest + dedupe
  n := public.ingest_transactions(k, rows);
  assert n = 4, 'inserted 4, got ' || n;
  n := public.ingest_transactions(k, rows);
  assert n = 1, 'only the null-external_id row re-inserts, got ' || n;
  assert (select merchant from public.transactions where external_id = 'g1') = 'Mothers Work Pte. Ltd.', 'trimmed merchant';
  assert (select currency from public.transactions where merchant_raw = 'KFC' limit 1) = 'MYR', 'currency upper';

  begin
    perform public.ingest_transactions('nope', rows);
    assert false, 'bad key accepted';
  exception when sqlstate '28000' then null;
  end;
  begin
    perform public.widget_summary(k);  -- ingest key must not read widget data
    assert false, 'ingest key accepted by widget';
  exception when sqlstate '28000' then null;
  end;

  -- spend math: 10 (uncategorised out) - 4 (reimbursement in) + 0 (transfer) + 7.5*2 (KFC) = 21
  update public.transactions set category_id =
    (select id from public.categories where user_id = a and name = 'Reimbursement') where external_id = 'g2';
  update public.transactions set category_id =
    (select id from public.categories where user_id = a and name = 'Transfer') where external_id = 'g3';
  s := public.widget_summary(w);
  assert (s->>'month_spend')::numeric = 21, 'month_spend ' || s;
end $$;

-- RLS: user b sees nothing of user a
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert (select count(*) from public.transactions) = 0, 'rls transactions';
  assert (select count(*) from public.categories) = 11, 'rls categories (own only)';
  assert (select count(*) from public.api_keys) = 0, 'rls api_keys';
end $$;
reset role;

select 'smoke ok' as result;
rollback;
