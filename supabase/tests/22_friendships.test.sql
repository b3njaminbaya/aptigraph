select t.login('{alice}');
insert into public.friendships (requester_id, addressee_id) values ('{alice}', '{bob}');
select t.eq('new requests start pending', (select status from public.friendships where requester_id = '{alice}' and addressee_id = '{bob}'), 'pending');
select t.throws('you cannot befriend yourself', $$insert into public.friendships (requester_id, addressee_id) values ('{alice}', '{alice}')$$);
select t.throws('you cannot send a request on someone else''s behalf', $$insert into public.friendships (requester_id, addressee_id) values ('{bob}', '{carol}')$$);
select t.throws('you cannot skip consent by inserting an already-accepted friendship', $$insert into public.friendships (requester_id, addressee_id, status) values ('{alice}', '{carol}', 'accepted')$$);
select t.throws('the same request cannot be sent twice', $$insert into public.friendships (requester_id, addressee_id) values ('{alice}', '{bob}')$$);
select t.rows_affected('the requester cannot accept their own request', $$update public.friendships set status = 'accepted' where requester_id = '{alice}'$$, 0);
insert into public.friendships (requester_id, addressee_id) values ('{alice}', '{carol}');
select t.reset();

select t.login('{carol}');
select t.eq('a request is visible to its addressee', (select count(*) from public.friendships), 1::bigint);
select t.throws('an addressee cannot rewrite who a request came from', $$update public.friendships set requester_id = '{bob}' where requester_id = '{alice}' and addressee_id = '{carol}'$$);
select t.rows_affected('the addressee can decline', $$update public.friendships set status = 'declined' where requester_id = '{alice}' and addressee_id = '{carol}'$$, 1);
select t.reset();

select t.login('{bob}');
select t.eq('the addressee sees the incoming request', (select count(*) from public.friendships where addressee_id = '{bob}'), 1::bigint);
select t.throws('a mutual request cannot create a second row for the same pair', $$insert into public.friendships (requester_id, addressee_id) values ('{bob}', '{alice}')$$);
select t.throws('an addressee cannot set a request back to pending', $$update public.friendships set status = 'pending' where addressee_id = '{bob}'$$);
select t.throws('status is constrained to pending/accepted/declined', $$update public.friendships set status = 'blocked' where addressee_id = '{bob}'$$);
select t.rows_affected('the addressee can accept', $$update public.friendships set status = 'accepted' where requester_id = '{alice}' and addressee_id = '{bob}'$$, 1);
select t.reset();

-- A stranger to the (alice, bob) friendship can neither see nor change it.
select t.login('{carol}');
select t.eq('third parties cannot see a friendship', (select count(*) from public.friendships where addressee_id = '{bob}'), 0::bigint);
select t.rows_affected('third parties cannot delete a friendship', $$delete from public.friendships where addressee_id = '{bob}'$$, 0);
select t.reset();

select t.login('{alice}');
select t.rows_affected('either party can remove a friendship', $$delete from public.friendships where requester_id = '{alice}' and addressee_id = '{bob}'$$, 1);
select t.reset();
