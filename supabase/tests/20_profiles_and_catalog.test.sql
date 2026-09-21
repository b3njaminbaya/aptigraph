-- Signup trigger -------------------------------------------------------------
select t.eq('signing up creates a profile for every user', (select count(*) from public.profiles), 3::bigint);
select t.eq('display name defaults to the email local part', (select display_name from public.profiles where id = '{alice}'), 'alice');

-- Profiles -------------------------------------------------------------------
select t.login('{alice}');
select t.rows_affected('a user can edit their own profile', $$update public.profiles set display_name = 'Alice' where id = '{alice}'$$, 1);
select t.rows_affected('a user cannot edit someone else''s profile', $$update public.profiles set display_name = 'pwned' where id = '{bob}'$$, 0);
select t.throws('a user cannot re-point their profile at another account', $$update public.profiles set id = '{carol}' where id = '{alice}'$$);
select t.throws('a user cannot create a profile for someone else', $$insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000ff')$$);
select t.eq('profiles are visible to other signed-in users', (select count(*) from public.profiles), 3::bigint);
select t.reset();

select t.ok('editing a profile bumps updated_at', (select updated_at > created_at from public.profiles where id = '{alice}'));

select t.anon();
select t.eq('visitors can read profiles (the public leaderboard needs names)', (select count(*) from public.profiles), 3::bigint);
select t.rows_affected('visitors cannot edit profiles', $$update public.profiles set display_name = 'x'$$, 0);
select t.reset();

-- Problem catalog (public, read-only) ----------------------------------------
select t.anon();
select t.ok('the problem catalog is public', (select count(*) from public.problems) >= 70);
select t.throws('visitors cannot add problems', $$insert into public.problems (id, slug, title, difficulty, url) values (9999, 'a', 'a', 'Easy', 'u')$$);
select t.reset();

select t.login('{alice}');
select t.throws('signed-in users cannot add problems', $$insert into public.problems (id, slug, title, difficulty, url) values (9998, 'b', 'b', 'Easy', 'u')$$);
select t.rows_affected('signed-in users cannot edit problems', $$update public.problems set title = 'x' where id = 1$$, 0);
select t.rows_affected('signed-in users cannot delete problems', $$delete from public.problems where id = 1$$, 0);
select t.reset();

select t.throws('difficulty is constrained to Easy/Medium/Hard', $$insert into public.problems (id, slug, title, difficulty, url) values (9997, 'c', 'c', 'Impossible', 'u')$$);
