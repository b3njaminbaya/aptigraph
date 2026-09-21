select t.login('{alice}');
insert into public.discussion_posts (id, problem_id, user_id, body)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 1, '{alice}', 'Use a hash map');
select t.throws('you cannot post as someone else', $$insert into public.discussion_posts (problem_id, user_id, body) values (1, '{bob}', 'hi')$$);
select t.throws('an empty post is rejected', $$insert into public.discussion_posts (problem_id, user_id, body) values (1, '{alice}', '')$$);
select t.throws('a post over 5000 characters is rejected', $$insert into public.discussion_posts (problem_id, user_id, body) values (1, '{alice}', repeat('x', 5001))$$);
select t.rows_affected('authors can edit their own post', $$update public.discussion_posts set body = 'Use a hash map, O(n)' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 1);
select t.throws('authors cannot move their post to another problem', $$update public.discussion_posts set problem_id = 2 where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$);
select t.reset();

select t.login('{bob}');
select t.eq('posts are public to every signed-in user', (select count(*) from public.discussion_posts), 1::bigint);
select t.rows_affected('you cannot edit someone else''s post', $$update public.discussion_posts set body = 'pwned' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0);
select t.rows_affected('you cannot delete someone else''s post', $$delete from public.discussion_posts where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0);

-- Comments
insert into public.discussion_comments (post_id, user_id, body) values ('aaaaaaaa-0000-0000-0000-000000000001', '{bob}', 'Nice');
select t.throws('you cannot comment as someone else', $$insert into public.discussion_comments (post_id, user_id, body) values ('aaaaaaaa-0000-0000-0000-000000000001', '{alice}', 'hi')$$);
select t.throws('a comment over 2000 characters is rejected', $$insert into public.discussion_comments (post_id, user_id, body) values ('aaaaaaaa-0000-0000-0000-000000000001', '{bob}', repeat('x', 2001))$$);
select t.rows_affected('comments cannot be edited', $$update public.discussion_comments set body = 'changed'$$, 0);

-- Votes
insert into public.discussion_votes (post_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '{bob}');
select t.eq('an upvote from another user is counted', (select upvote_count from public.discussion_posts where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1);
select t.throws('you cannot vote twice on a post', $$insert into public.discussion_votes (post_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '{bob}')$$);
select t.throws('you cannot vote as someone else', $$insert into public.discussion_votes (post_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '{carol}')$$);
select t.eq('you can see your own votes', (select count(*) from public.discussion_votes), 1::bigint);
select t.reset();

select t.eq('upvote counts can never go negative', (select count(*) from public.discussion_posts where upvote_count < 0), 0::bigint);

select t.login('{alice}');
select t.eq('other people''s votes are private', (select count(*) from public.discussion_votes), 0::bigint);
select t.rows_affected('you cannot remove someone else''s vote', $$delete from public.discussion_votes$$, 0);
select t.throws('an author cannot inflate their own upvote count', $$update public.discussion_posts set upvote_count = 999 where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$);
select t.reset();

select t.login('{bob}');
select t.rows_affected('a voter can withdraw their vote', $$delete from public.discussion_votes where user_id = '{bob}'$$, 1);
select t.eq('withdrawing a vote decrements the count', (select upvote_count from public.discussion_posts where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0);
select t.reset();

select t.anon();
select t.throws('visitors cannot post', $$insert into public.discussion_posts (problem_id, user_id, body) values (1, '{alice}', 'x')$$);
select t.reset();
