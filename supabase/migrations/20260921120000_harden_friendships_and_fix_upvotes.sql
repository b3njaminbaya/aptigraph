-- Fixes found by the database test suite (supabase/tests, run with `npm run test:db`).

-- 1. Upvotes on other people's posts were never counted. The trigger ran as the
--    voter, and the "authors can update their own posts" policy silently
--    filtered out the row, so upvote_count only ever moved for your own posts.
--    SECURITY DEFINER lets the trigger (and only the trigger) maintain the counter.
create or replace function public.adjust_discussion_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Heal any counters that drifted because of the bug above, then make the
-- invariant explicit.
update public.discussion_posts p
set upvote_count = (select count(*) from public.discussion_votes v where v.post_id = p.id);

alter table public.discussion_posts
  add constraint discussion_posts_upvote_count_nonneg check (upvote_count >= 0);

-- 2. Authors could also write upvote_count directly. Only the body is
--    user-editable; the counter belongs to the trigger.
revoke update on public.discussion_posts from anon, authenticated;
grant update (body) on public.discussion_posts to authenticated;

-- 3. Friendships: the INSERT policy let a user create a friendship that was
--    already 'accepted', skipping the other person's consent.
drop policy "Users can send friend requests" on public.friendships;
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');

-- 4. ...and the UPDATE policy let an addressee change *any* column, e.g.
--    requester_id, to forge a friendship between two other users. Responding
--    to a request may only change its status, and only to a decision.
drop policy "Addressees can respond to friend requests" on public.friendships;
create policy "Addressees can respond to friend requests"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status in ('accepted', 'declined'));

revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

-- 5. A and B could each send the other a request, leaving two rows for one
--    relationship. Keep the older row, then enforce one row per unordered pair.
delete from public.friendships f
using public.friendships g
where f.requester_id = g.addressee_id
  and f.addressee_id = g.requester_id
  and (f.created_at, f.requester_id) > (g.created_at, g.requester_id);

create unique index friendships_unordered_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- 6. Recommendations were ordered by rank-within-topic only, so the "weakest
--    topic" was not necessarily first, and a problem tagged with two weak topics
--    could appear twice. Order by weakness and keep one row per problem
--    (attributed to its weakest topic).
create or replace function public.get_recommendations(limit_count integer default 5)
returns table (
  problem_id integer,
  title text,
  difficulty text,
  topics text[],
  reason_topic text,
  reason_solve_rate numeric
)
language sql
stable
as $$
  with user_topic_stats as (
    select
      t.topic,
      count(*) filter (where ups.status = 'solved') as solved_count,
      count(*) as attempted_count
    from public.user_problem_status ups
    join public.problems p on p.id = ups.problem_id
    cross join lateral unnest(p.topics) as t(topic)
    where ups.user_id = auth.uid() and ups.status in ('attempted', 'solved')
    group by t.topic
  ),
  weak_topics as (
    select topic, solved_count::numeric / attempted_count as solve_rate
    from user_topic_stats
    where attempted_count > 0
    order by solve_rate asc, attempted_count desc, topic
    limit 3
  ),
  candidates as (
    select
      p.id as problem_id,
      p.title,
      p.difficulty,
      p.topics,
      wt.topic as reason_topic,
      wt.solve_rate as reason_solve_rate,
      row_number() over (
        partition by wt.topic
        order by case p.difficulty when 'Easy' then 1 when 'Medium' then 2 else 3 end, p.id
      ) as rn
    from weak_topics wt
    join public.problems p on wt.topic = any(p.topics)
    left join public.user_problem_status ups on ups.problem_id = p.id and ups.user_id = auth.uid()
    where ups.user_id is null or ups.status <> 'solved'
  ),
  one_per_problem as (
    select distinct on (problem_id) *
    from candidates
    where rn <= 2
    order by problem_id, reason_solve_rate asc, rn
  )
  select problem_id, title, difficulty, topics, reason_topic, reason_solve_rate
  from one_per_problem
  order by reason_solve_rate asc, rn, problem_id
  limit limit_count;
$$;
