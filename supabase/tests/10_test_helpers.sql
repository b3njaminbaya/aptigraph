-- A tiny assertion library. Every helper records a row in t.results instead of
-- aborting, so one run reports every failure at once.

create schema t;
grant usage on schema t to public;

create table t.results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);
grant all on t.results to public;
grant usage on sequence t.results_id_seq to public;

create function t.ok(test_name text, condition boolean, detail text default null)
returns void language sql as
$$ insert into t.results (name, passed, detail) values (test_name, coalesce(condition, false), detail) $$;

create function t.eq(test_name text, actual anyelement, expected anyelement)
returns void language sql as
$$ select t.ok(test_name, actual is not distinct from expected, format('expected %s, got %s', expected, actual)) $$;

-- Statement must fail (e.g. an RLS violation, 42501, or a CHECK violation, 23514).
-- If it unexpectedly succeeds, its effects are rolled back so a bug found here
-- cannot leak state into later tests.
create function t.throws(test_name text, stmt text)
returns void language plpgsql as
$$
declare state text;
begin
  begin
    execute stmt;
    raise exception 'statement succeeded' using errcode = 'T0001';
  exception when others then
    state := sqlstate;
  end;
  perform t.ok(
    test_name,
    state <> 'T0001',
    case when state = 'T0001' then 'expected an error, but the statement succeeded' else 'raised ' || state end
  );
end
$$;

-- Statement must succeed and touch exactly `expected` rows. RLS hides rows
-- silently, so "0 rows affected" is how a blocked UPDATE/DELETE shows up.
create function t.rows_affected(test_name text, stmt text, expected bigint)
returns void language plpgsql as
$$
declare n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  perform t.eq(test_name, n, expected);
end
$$;

-- Act as a signed-in user / an anonymous visitor / the superuser again.
create function t.login(uid uuid) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', uid::text, false); execute 'set role authenticated'; end $$;

create function t.anon() returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', '', false); execute 'set role anon'; end $$;

create function t.reset() returns void language plpgsql as
$$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;

-- Silence result rows from the assertions below; failures are reported at the end.
\o /dev/null
