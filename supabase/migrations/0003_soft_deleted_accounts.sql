alter table public.profiles
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_not_deleted_idx
  on public.profiles (role, display_name)
  where deleted_at is null;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true
    and deleted_at is null
$$;

comment on column public.profiles.deleted_at is
  'Marks an application account deleted while retaining its profile for historical log and audit references.';
