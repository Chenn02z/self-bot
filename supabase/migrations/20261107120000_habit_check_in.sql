-- One-tap check-in from an iOS Shortcut, authenticated by a habit-scoped API key.

alter table public.api_keys drop constraint api_keys_scope_check;
alter table public.api_keys add constraint api_keys_scope_check check (scope in ('ingest', 'widget', 'habit'));

create function public.habit_check_in(p_key text, p_habit_id uuid) returns json
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := public.key_user(p_key, 'habit');
  h public.habits;
  d date;
  n int;
begin
  if uid is null then raise exception 'invalid habit key' using errcode = '28000'; end if;
  select * into h from public.habits where id = p_habit_id and user_id = uid and archived_at is null;
  if not found then raise exception 'habit not found' using errcode = 'P0002'; end if;

  insert into public.check_ins (user_id, habit_id) values (uid, h.id) returning day into d; -- SGT today
  select count(*) into n from public.check_ins where habit_id = h.id and day = d;
  return json_build_object('count', n, 'target', h.target, 'name', h.name, 'emoji', h.emoji);
end $$;
revoke execute on function public.habit_check_in from public;
grant execute on function public.habit_check_in to anon, authenticated;
