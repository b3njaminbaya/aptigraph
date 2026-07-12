-- Shared trigger function used by tables with an updated_at column.
-- The original profiles migration references this function without defining it
-- (it assumed a platform-provided default); this fresh project needs it defined explicitly.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
