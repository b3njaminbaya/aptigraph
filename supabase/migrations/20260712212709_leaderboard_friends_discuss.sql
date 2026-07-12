-- Leaderboard: aggregate function, SECURITY DEFINER so it can read across all
-- users' user_problem_status without relaxing that table's per-user RLS.
create function public.get_leaderboard(limit_count integer default 100, filter_user_ids uuid[] default null)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_solved bigint,
  last_active_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    count(*) filter (where ups.status = 'solved') as total_solved,
    max(ups.last_activity_at) as last_active_at
  from public.profiles p
  left join public.user_problem_status ups on ups.user_id = p.id
  where filter_user_ids is null or p.id = any(filter_user_ids)
  group by p.id
  order by total_solved desc, last_active_at desc nulls last
  limit limit_count;
$$;

grant execute on function public.get_leaderboard(integer, uuid[]) to authenticated, anon;

-- Friends
create table public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Addressees can respond to friend requests"
  on public.friendships for update
  using (auth.uid() = addressee_id);

create policy "Either party can remove a friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Discuss
create table public.discussion_posts (
  id uuid primary key default gen_random_uuid(),
  problem_id integer not null references public.problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  upvote_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index discussion_posts_problem_idx on public.discussion_posts (problem_id, created_at desc);

alter table public.discussion_posts enable row level security;

create policy "Discussion posts are viewable by everyone"
  on public.discussion_posts for select
  using (true);

create policy "Users can create their own discussion posts"
  on public.discussion_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own discussion posts"
  on public.discussion_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own discussion posts"
  on public.discussion_posts for delete
  using (auth.uid() = user_id);

create table public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.discussion_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index discussion_comments_post_idx on public.discussion_comments (post_id, created_at);

alter table public.discussion_comments enable row level security;

create policy "Discussion comments are viewable by everyone"
  on public.discussion_comments for select
  using (true);

create policy "Users can create their own discussion comments"
  on public.discussion_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own discussion comments"
  on public.discussion_comments for delete
  using (auth.uid() = user_id);

create table public.discussion_votes (
  post_id uuid not null references public.discussion_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.discussion_votes enable row level security;

create policy "Users can view their own votes"
  on public.discussion_votes for select
  using (auth.uid() = user_id);

create policy "Users can cast their own votes"
  on public.discussion_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own votes"
  on public.discussion_votes for delete
  using (auth.uid() = user_id);

create function public.adjust_discussion_upvote_count()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update public.discussion_posts set upvote_count = upvote_count + 1 where id = new.post_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.discussion_posts set upvote_count = upvote_count - 1 where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_discussion_vote_insert
  after insert on public.discussion_votes
  for each row execute function public.adjust_discussion_upvote_count();

create trigger on_discussion_vote_delete
  after delete on public.discussion_votes
  for each row execute function public.adjust_discussion_upvote_count();
