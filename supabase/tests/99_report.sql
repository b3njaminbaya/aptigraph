\o
\pset tuples_only on
\pset format unaligned
\echo
select case when passed then '  ok    ' else '  FAIL  ' end || name || case when passed then '' else E'\n          -> ' || coalesce(detail, '') end
from t.results order by id;
\echo
select format('%s passed, %s failed', count(*) filter (where passed), count(*) filter (where not passed)) from t.results;
do $$ begin
  if exists (select 1 from t.results where not passed) then
    raise exception 'database tests failed';
  end if;
end $$;
