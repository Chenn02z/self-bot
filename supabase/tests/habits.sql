-- Habits schema check. Runs in a transaction and rolls back.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/habits.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'habits-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'habits-b@test.local');

set local role authenticated;

-- user a creates a habit and taps it; the day defaults to the Singapore calendar day
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$
declare
  h uuid;
begin
  insert into public.habits (user_id, name, emoji, color, target)
  values (auth.uid(), 'Water', '💧', '#007AFF', 8) returning id into h;
  insert into public.check_ins (user_id, habit_id) values (auth.uid(), h), (auth.uid(), h);
  assert (select count(*) from public.check_ins where habit_id = h
          and day = (now() at time zone 'Asia/Singapore')::date) = 2, 'check-ins on SGT today';
  assert (select sort_order = 0 and archived_at is null from public.habits where id = h), 'habit defaults';

  begin
    insert into public.habits (user_id, name, target) values (auth.uid(), 'Zero', 0);
    assert false, 'target 0 accepted';
  exception when check_violation then null;
  end;
end $$;

-- user b sees nothing of a, and cannot attach check-ins to a's habit
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert (select count(*) from public.habits) = 0, 'rls habits';
  assert (select count(*) from public.check_ins) = 0, 'rls check_ins';
  begin
    insert into public.habits (user_id, name) values ('00000000-0000-0000-0000-00000000000a', 'Spoof');
    assert false, 'inserted habit for another user';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  begin
    -- as b's own row, pointing at a's habit: the composite FK rejects it
    insert into public.check_ins (user_id, habit_id)
    select '00000000-0000-0000-0000-00000000000b', id from public.habits where name = 'Water';
    assert false, 'check-in on another user''s habit';
  exception when foreign_key_violation then null;
  end;
end $$;

select 'habits ok' as result;
rollback;
