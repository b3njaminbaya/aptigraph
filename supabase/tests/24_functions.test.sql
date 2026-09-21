-- Fixtures: alice solved {1, 2} and attempted 11; bob solved {1}; carol attempted 3.
select t.login('{alice}');
insert into public.user_problem_status (user_id, problem_id, status) values ('{alice}', 2, 'solved');
select t.reset();
select t.login('{carol}');
insert into public.user_problem_status (user_id, problem_id, status) values ('{carol}', 3, 'attempted');
select t.reset();

-- get_leaderboard (SECURITY DEFINER: aggregates only, callable by visitors) ---
select t.anon();
select t.eq('the leaderboard works for visitors', (select count(*) from public.get_leaderboard()), 3::bigint);
select t.eq('users are ranked by problems solved', (select array_agg(total_solved) from public.get_leaderboard()), array[2, 1, 0]::bigint[]);
select t.eq('attempted problems do not count as solved', (select total_solved from public.get_leaderboard() where user_id = '{carol}'), 0::bigint);
select t.eq('the leaderboard honours limit_count', (select count(*) from public.get_leaderboard(2)), 2::bigint);
select t.eq('the leaderboard can be scoped to a set of users (friends)', (select array_agg(user_id::text) from public.get_leaderboard(10, array['{bob}']::uuid[])), array['{bob}']::text[]);
select t.eq('visitors still cannot read private progress directly', (select count(*) from public.user_problem_status), 0::bigint);
select t.reset();

select t.eq(
  'the leaderboard exposes only public columns',
  pg_get_function_result('public.get_leaderboard(integer, uuid[])'::regprocedure),
  'TABLE(user_id uuid, display_name text, avatar_url text, total_solved bigint, last_active_at timestamp with time zone)'
);
select t.ok('the leaderboard pins its search_path (SECURITY DEFINER hardening)', exists (
  select 1 from pg_proc where oid = 'public.get_leaderboard(integer, uuid[])'::regprocedure and proconfig::text like '%search_path=public%'
));

-- get_recommendations (SECURITY INVOKER: runs inside the caller's RLS) --------
select t.login('{alice}');
select t.eq('recommendations never include solved problems', (select count(*) from public.get_recommendations(20) where problem_id in (1, 2)), 0::bigint);
select t.eq('the first recommendation comes from the weakest topic', (select reason_topic from public.get_recommendations(5) limit 1), 'Two Pointers');
select t.eq('the reason carries the solve rate behind it', (select reason_solve_rate from public.get_recommendations(5) limit 1), 0::numeric);
select t.eq('a problem is never recommended twice', (select count(*) - count(distinct problem_id) from public.get_recommendations(20)), 0::bigint);
select t.reset();

select t.login('{bob}');
select t.ok('recommendations only use the caller''s own history', (select bool_and(reason_topic in ('Array', 'Hash Table')) from public.get_recommendations(20)));
select t.reset();

select t.login('{carol}');
select t.ok('a different user gets recommendations from their own weak topics', (select bool_and(reason_topic in ('Hash Table', 'String', 'Sliding Window')) from public.get_recommendations(20)));
select t.reset();

select t.anon();
select t.eq('visitors get no recommendations', (select count(*) from public.get_recommendations()), 0::bigint);
select t.reset();
