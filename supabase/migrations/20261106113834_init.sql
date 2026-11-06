-- Expense tracker: schema, RLS, seed trigger, ingest + widget RPCs. See reference/plan.md.

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  own_accounts_hint text not null default ''
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  emoji text not null default '',
  color text not null default '#8E8E93',
  kind text not null default 'expense' check (kind in ('expense', 'income', 'transfer')),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  external_id text,
  occurred_at timestamptz not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'SGD',
  direction text not null check (direction in ('in', 'out')),
  merchant text not null,
  merchant_raw text not null,
  category_id uuid references public.categories on delete set null,
  category_source text check (category_source in ('user', 'ai')),
  note text,
  source text not null,
  raw text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index on public.transactions (user_id, occurred_at desc);

create table public.api_keys (
  key_hash text primary key,
  user_id uuid not null references auth.users on delete cascade,
  label text not null,
  scope text not null check (scope in ('ingest', 'widget')),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.api_keys enable row level security;

create policy own on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own on public.categories for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- keys are created only via create_api_key(); users can list and revoke
create policy own_select on public.api_keys for select to authenticated
  using (user_id = (select auth.uid()));
create policy own_delete on public.api_keys for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- triggers ----------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch before update on public.transactions
  for each row execute function public.touch_updated_at();

create function public.seed_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.categories (user_id, name, emoji, color, kind) values
    (new.id, 'Food',          '🍜', '#FF9500', 'expense'),
    (new.id, 'Groceries',     '🛒', '#34C759', 'expense'),
    (new.id, 'Transport',     '🚇', '#007AFF', 'expense'),
    (new.id, 'Shopping',      '🛍️', '#AF52DE', 'expense'),
    (new.id, 'Bills',         '🧾', '#5856D6', 'expense'),
    (new.id, 'Entertainment', '🎬', '#FF2D55', 'expense'),
    (new.id, 'Health',        '💊', '#FF3B30', 'expense'),
    (new.id, 'Other',         '📦', '#8E8E93', 'expense'),
    (new.id, 'Reimbursement', '↩️', '#30B0C7', 'expense'),
    (new.id, 'Income',        '💰', '#32D74B', 'income'),
    (new.id, 'Transfer',      '🔁', '#636366', 'transfer');
  return new;
end $$;

create trigger seed_new_user after insert on auth.users
  for each row execute function public.seed_new_user();

-- ---------- spend math (single source of truth) ----------
-- Counted rows: expense-kind or uncategorised, not deleted. out adds, in subtracts.
create view public.spend_rows with (security_invoker = true) as
select t.user_id, t.id, t.occurred_at, t.category_id,
       case t.direction when 'out' then t.amount else -t.amount end as signed_amount
from public.transactions t
left join public.categories c on c.id = t.category_id
where not t.is_deleted and (c.kind is null or c.kind = 'expense');

-- ---------- RPCs ----------

create function public.key_user(p_key text, p_scope text) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from public.api_keys
  where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex') and scope = p_scope
$$;
revoke execute on function public.key_user from public, anon, authenticated;

-- rows: [{external_id?, occurred_at, amount, currency?, direction, merchant_raw, source, raw?}]
create function public.ingest_transactions(p_key text, p_rows jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.key_user(p_key, 'ingest');
  n int;
begin
  if uid is null then raise exception 'invalid ingest key' using errcode = '28000'; end if;

  insert into public.transactions
    (user_id, external_id, occurred_at, amount, currency, direction, merchant, merchant_raw, source, raw)
  select uid, r.external_id, r.occurred_at, r.amount, coalesce(upper(r.currency), 'SGD'),
         lower(r.direction), trim(r.merchant_raw), trim(r.merchant_raw), r.source, left(r.raw, 2000)
  from jsonb_to_recordset(p_rows) as r(external_id text, occurred_at timestamptz, amount numeric,
       currency text, direction text, merchant_raw text, source text, raw text)
  on conflict (user_id, external_id) do nothing;

  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.ingest_transactions from public;
grant execute on function public.ingest_transactions to anon, authenticated;

create function public.widget_summary(p_key text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := public.key_user(p_key, 'widget');
  sgt timestamp := now() at time zone 'Asia/Singapore';
begin
  if uid is null then raise exception 'invalid widget key' using errcode = '28000'; end if;
  return (
    select json_build_object(
      'month_spend', coalesce(sum(signed_amount), 0),
      'today_spend', coalesce(sum(signed_amount) filter (
        where occurred_at >= date_trunc('day', sgt) at time zone 'Asia/Singapore'), 0))
    from public.spend_rows
    where user_id = uid and occurred_at >= date_trunc('month', sgt) at time zone 'Asia/Singapore'
  );
end $$;
revoke execute on function public.widget_summary from public;
grant execute on function public.widget_summary to anon, authenticated;

-- Returns the plaintext key once; only its hash is stored.
create function public.create_api_key(p_label text, p_scope text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  k text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.api_keys (key_hash, user_id, label, scope)
  values (encode(extensions.digest(k, 'sha256'), 'hex'), auth.uid(), p_label, p_scope);
  return k;
end $$;
revoke execute on function public.create_api_key from public, anon;
grant execute on function public.create_api_key to authenticated;
