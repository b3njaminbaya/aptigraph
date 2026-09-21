-- Fixtures, written as the users themselves so RLS applies to the setup too.
select t.login('{alice}');
insert into public.user_problem_status (user_id, problem_id, status, notes) values
  ('{alice}', 1, 'solved', 'hash map'),
  ('{alice}', 11, 'attempted', null);
insert into public.attempts (user_id, problem_id, minutes, result) values ('{alice}', 1, 20, 'solved');
select t.reset();

select t.eq('new progress rows default to a 1-day interval', (select review_interval_days from public.user_problem_status where user_id = '{alice}' and problem_id = 1), 1);
select t.eq('new progress rows default to an ease factor of 2.5', (select ease_factor from public.user_problem_status where user_id = '{alice}' and problem_id = 1), 2.5::numeric);

-- Per-user progress ----------------------------------------------------------
select t.login('{bob}');
insert into public.user_problem_status (user_id, problem_id, status) values ('{bob}', 1, 'solved');
select t.eq('a user only sees their own progress', (select count(*) from public.user_problem_status), 1::bigint);
select t.eq('...never another user''s notes', (select count(*) from public.user_problem_status where user_id = '{alice}'), 0::bigint);
select t.throws('a user cannot write progress for someone else', $$insert into public.user_problem_status (user_id, problem_id, status) values ('{alice}', 2, 'solved')$$);
select t.rows_affected('a user cannot edit someone else''s progress', $$update public.user_problem_status set status = 'unsolved' where user_id = '{alice}'$$, 0);
select t.rows_affected('a user cannot delete someone else''s progress', $$delete from public.user_problem_status where user_id = '{alice}'$$, 0);
select t.throws('a user cannot hand their row to someone else', $$update public.user_problem_status set user_id = '{alice}' where user_id = '{bob}'$$);
select t.throws('status is constrained to unsolved/attempted/solved', $$update public.user_problem_status set status = 'mastered' where user_id = '{bob}'$$);
select t.rows_affected('a user can reset their own problem', $$delete from public.user_problem_status where user_id = '{bob}' and problem_id = 1$$, 1);
insert into public.user_problem_status (user_id, problem_id, status) values ('{bob}', 1, 'solved');

-- Attempt log ----------------------------------------------------------------
select t.eq('attempts are private to their owner', (select count(*) from public.attempts), 0::bigint);
select t.throws('a user cannot log an attempt as someone else', $$insert into public.attempts (user_id, problem_id, minutes, result) values ('{alice}', 1, 5, 'solved')$$);
insert into public.attempts (user_id, problem_id, minutes, result) values ('{bob}', 1, 35, 'solved');
select t.reset();

select t.login('{alice}');
select t.eq('a user sees their own attempts', (select count(*) from public.attempts), 1::bigint);
select t.rows_affected('the attempt log is append-only: no edits', $$update public.attempts set minutes = 1$$, 0);
select t.rows_affected('the attempt log is append-only: no deletes', $$delete from public.attempts$$, 0);
select t.throws('negative minutes are rejected', $$insert into public.attempts (user_id, problem_id, minutes, result) values ('{alice}', 2, -5, 'solved')$$);
select t.throws('an unknown attempt result is rejected', $$insert into public.attempts (user_id, problem_id, minutes, result) values ('{alice}', 2, 5, 'cheated')$$);
select t.reset();

-- Visitors -------------------------------------------------------------------
select t.anon();
select t.eq('visitors see no progress', (select count(*) from public.user_problem_status), 0::bigint);
select t.eq('visitors see no attempts', (select count(*) from public.attempts), 0::bigint);
select t.throws('visitors cannot record progress', $$insert into public.user_problem_status (user_id, problem_id, status) values ('{alice}', 3, 'solved')$$);
select t.reset();
