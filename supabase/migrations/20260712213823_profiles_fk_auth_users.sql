-- profiles.id was never given an explicit FK to auth.users(id) (an oversight
-- from the original migration) -- so deleting an auth.users row would leave
-- an orphaned profiles row instead of cascading like every other table.
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
