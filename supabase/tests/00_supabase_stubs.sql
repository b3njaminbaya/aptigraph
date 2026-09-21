-- Minimal stand-ins for what the Supabase platform provides, so the project's
-- real migrations can run against a plain Postgres container.
-- Only used by scripts/test-db.sh - never applied to a real Supabase project.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase's auth.uid(): the signed-in user's id, taken from the request JWT.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Supabase grants API roles full table privileges by default and relies on
-- RLS (and column grants) to restrict access; replicate that so a missing
-- policy is a real failure here, exactly as it would be in production.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
