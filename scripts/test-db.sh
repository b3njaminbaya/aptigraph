#!/usr/bin/env bash
# Runs the SQL tests in supabase/tests against the project's REAL migrations, on
# a throwaway Postgres container, with row-level security enforced for the
# `anon` and `authenticated` roles. Requires Docker.
#
#   npm run test:db
#
# The container is removed on exit, and nothing else on your machine is touched.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="${PG_IMAGE:-postgres:16}"
NAME="aptigraph-dbtest-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Fixed identities the tests refer to as {alice}, {bob}, {carol}.
ALICE=00000000-0000-0000-0000-00000000000a
BOB=00000000-0000-0000-0000-00000000000b
CAROL=00000000-0000-0000-0000-00000000000c

echo "Starting $IMAGE ..."
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
# The official image restarts once after initialising, so wait for the 2nd "ready".
for _ in $(seq 1 90); do
  [ "$(docker logs "$NAME" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ] && break
  sleep 1
done

emit() { for f in "$@"; do cat "$f"; echo; done; }

{
  emit supabase/tests/00_supabase_stubs.sql
  emit supabase/migrations/*.sql
  emit supabase/tests/10_test_helpers.sql supabase/tests/15_fixtures.sql
  emit supabase/tests/[2-8]*.test.sql
  emit supabase/tests/99_report.sql
} | sed -e "s/{alice}/$ALICE/g" -e "s/{bob}/$BOB/g" -e "s/{carol}/$CAROL/g" \
  | docker exec -i "$NAME" psql -U postgres -X -q -v ON_ERROR_STOP=1
