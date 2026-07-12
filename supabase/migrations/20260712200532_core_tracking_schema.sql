-- Problem catalog: public read-only reference data (LeetCode question metadata, no proprietary problem text)
create table public.problems (
  id integer primary key,
  slug text unique not null,
  title text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  topics text[] not null default '{}',
  url text not null,
  created_at timestamptz not null default now()
);

create index problems_topics_idx on public.problems using gin (topics);

alter table public.problems enable row level security;

create policy "Problems are viewable by everyone"
  on public.problems for select
  using (true);

-- Current status per user per problem
create table public.user_problem_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id integer not null references public.problems(id) on delete cascade,
  status text not null default 'unsolved' check (status in ('unsolved','attempted','solved')),
  notes text,
  attempts_count integer not null default 0,
  first_solved_at timestamptz,
  last_activity_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

alter table public.user_problem_status enable row level security;

create policy "Users can view their own problem status"
  on public.user_problem_status for select
  using (auth.uid() = user_id);

create policy "Users can insert their own problem status"
  on public.user_problem_status for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own problem status"
  on public.user_problem_status for update
  using (auth.uid() = user_id);

create policy "Users can delete their own problem status"
  on public.user_problem_status for delete
  using (auth.uid() = user_id);

-- Append-only attempt log
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id integer not null references public.problems(id) on delete cascade,
  minutes integer not null check (minutes >= 0),
  result text not null check (result in ('attempted','solved')),
  created_at timestamptz not null default now()
);

create index attempts_user_problem_idx on public.attempts (user_id, problem_id);

alter table public.attempts enable row level security;

create policy "Users can view their own attempts"
  on public.attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own attempts"
  on public.attempts for insert
  with check (auth.uid() = user_id);

-- Auto-create a profile row on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
