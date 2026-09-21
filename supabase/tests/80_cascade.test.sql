-- Deleting an auth user (what the delete-account edge function does) must leave
-- nothing of theirs behind, and must keep other people's data consistent.
select t.login('{bob}');
insert into public.discussion_votes (post_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '{bob}');
select t.reset();
select t.eq('bob''s vote is counted before deletion', (select upvote_count from public.discussion_posts where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1);

delete from auth.users where id in ('{bob}', '{carol}');

select t.eq('deleting an account removes their profile', (select count(*) from public.profiles where id in ('{bob}', '{carol}')), 0::bigint);
select t.eq('...their progress', (select count(*) from public.user_problem_status where user_id in ('{bob}', '{carol}')), 0::bigint);
select t.eq('...their attempts', (select count(*) from public.attempts where user_id in ('{bob}', '{carol}')), 0::bigint);
select t.eq('...their comments', (select count(*) from public.discussion_comments where user_id = '{bob}'), 0::bigint);
select t.eq('...their votes', (select count(*) from public.discussion_votes where user_id = '{bob}'), 0::bigint);
select t.eq('...their friendships', (select count(*) from public.friendships where '{carol}' in (requester_id, addressee_id)), 0::bigint);
select t.eq('...and un-counts their votes on other people''s posts', (select upvote_count from public.discussion_posts where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0);
select t.eq('other users keep their own data', (select count(*) from public.user_problem_status where user_id = '{alice}'), 3::bigint);
select t.eq('...including their posts', (select count(*) from public.discussion_posts where user_id = '{alice}'), 1::bigint);
