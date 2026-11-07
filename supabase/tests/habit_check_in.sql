-- habit_check_in contract check. Runs in a transaction and rolls back.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/habit_check_in.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'shortcut-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'shortcut-b@test.local');

-- user a: a habit-scoped key, plus widget and ingest keys that must not work
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
create temp table k on commit drop as select
  public.create_api_key('shortcut', 'habit') as habit,
  public.create_api_key('widget', 'widget') as widget,
  public.create_api_key('ingest', 'ingest') as ingest;
insert into public.habits (user_id, name, emoji, target) values
  (auth.uid(), 'Water', '💧', 8), (auth.uid(), 'Old', '🗑', 1);
update public.habits set archived_at = now() where name = 'Old';
-- yesterday (SGT) must not count toward today
insert into public.check_ins (user_id, habit_id, day)
select auth.uid(), id, (now() at time zone 'Asia/Singapore')::date - 1 from public.habits where name = 'Water';

-- user b has a habit of their own
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
insert into public.habits (user_id, name, emoji, target) values (auth.uid(), 'Theirs', '🏃', 1);
grant select on k to anon;

-- the Shortcut calls with the publishable key only, i.e. as anon
set local role anon;
do $$ begin
  assert not exists (select 1 from public.habits), 'anon cannot read habits directly';
end $$;
reset role;

do $$
declare
  water uuid := (select id from public.habits where name = 'Water');
  old uuid := (select id from public.habits where name = 'Old');
  theirs uuid := (select id from public.habits where name = 'Theirs');
  r json;
begin
  set local role anon;

  r := public.habit_check_in((select habit from k), water);
  assert r::jsonb = '{"count":1,"target":8,"name":"Water","emoji":"💧"}'::jsonb, 'first check-in ' || r;
  r := public.habit_check_in((select habit from k), water);
  assert (r->>'count')::int = 2, 'second check-in ' || r;

  begin perform public.habit_check_in('nope', water); assert false, 'wrong key accepted';
  exception when sqlstate '28000' then null; end;
  begin perform public.habit_check_in((select widget from k), water); assert false, 'widget key accepted';
  exception when sqlstate '28000' then null; end;
  begin perform public.habit_check_in((select ingest from k), water); assert false, 'ingest key accepted';
  exception when sqlstate '28000' then null; end;
  begin perform public.habit_check_in((select habit from k), old); assert false, 'archived habit accepted';
  exception when sqlstate 'P0002' then null; end;
  begin perform public.habit_check_in((select habit from k), theirs); assert false, 'other user''s habit accepted';
  exception when sqlstate 'P0002' then null; end;
  begin perform public.habit_check_in((select habit from k), gen_random_uuid()); assert false, 'unknown habit accepted';
  exception when sqlstate 'P0002' then null; end;

  reset role;
  -- the two check-ins landed on SGT today (UTC+8, computed independently), owned by a; nothing on old/theirs
  assert (select count(*) from public.check_ins where habit_id = water
          and day = (now() at time zone 'UTC' + interval '8 hours')::date
          and user_id = '00000000-0000-0000-0000-00000000000a') = 2, 'SGT day + owner';
  assert (select count(*) from public.check_ins where habit_id in (old, theirs)) = 0, 'no stray check-ins';
end $$;

-- RLS: b sees only their own habit and none of a's check-ins
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert (select array_agg(name) from public.habits) = '{Theirs}', 'rls habits';
  assert (select count(*) from public.check_ins) = 0, 'rls check_ins';
end $$;
reset role;

select 'habit_check_in ok' as result;
rollback;
