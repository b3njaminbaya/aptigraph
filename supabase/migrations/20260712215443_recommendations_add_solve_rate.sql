-- Add solve_rate to get_recommendations' output so the UI can show
-- "you're at N% on <topic>" instead of just naming the topic.
-- Postgres doesn't allow CREATE OR REPLACE to change a function's return
-- shape, so drop and recreate.
drop function if exists public.get_recommendations(integer);

create function public.get_recommendations(limit_count integer default 5)
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
    order by solve_rate asc, attempted_count desc
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
  )
  select problem_id, title, difficulty, topics, reason_topic, reason_solve_rate
  from candidates
  where rn <= 2
  order by rn
  limit limit_count;
$$;

grant execute on function public.get_recommendations(integer) to authenticated;
