-- Habits module: habits + one check-in row per tap. See GLOSSARY.md (Habit, Target, Check-in).

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  emoji text not null default '',
  color text not null default '#8E8E93',
  target int not null default 1 check (target >= 1),
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id) -- target of check_ins' composite FK
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  habit_id uuid not null,
  day date not null default (now() at time zone 'Asia/Singapore')::date, -- SGT calendar day
  created_at timestamptz not null default now(),
  -- a check-in can only point at its owner's habit
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);
create index on public.check_ins (habit_id, day);

alter table public.habits enable row level security;
alter table public.check_ins enable row level security;

create policy own on public.habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own on public.check_ins for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create trigger touch before update on public.habits
  for each row execute function public.touch_updated_at();
