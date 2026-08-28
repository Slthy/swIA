create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('athlete', 'coach', 'admin');
create type public.team_category as enum ('men', 'women', 'unassigned');
create type public.log_type as enum ('wellness', 'monday_test', 'friday_test', 'practice');
create type public.date_source as enum ('device', 'server_fallback', 'manual', 'staff_backfill');
create type public.session_key as enum (
  'daily_wellness',
  'monday_am_test',
  'monday_lift',
  'monday_pm_swim',
  'tuesday_am_swim',
  'tuesday_lift',
  'wednesday_am_swim',
  'wednesday_pm_swim',
  'thursday_am_swim',
  'thursday_lift',
  'friday_am_test',
  'friday_pm_swim',
  'saturday_am_swim'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username ~ '^[a-z0-9.-]{3,80}$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athletes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team_category public.team_category not null default 'unassigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  color text not null default '#2d7db6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  athlete_id uuid not null references public.athletes(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, athlete_id)
);

create table public.athlete_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(user_id) on delete restrict,
  log_type public.log_type not null,
  session_key public.session_key not null,
  activity_date date not null,
  date_source public.date_source not null,
  device_recorded_at timestamptz,
  device_timezone text,
  device_utc_offset_minutes integer check (device_utc_offset_minutes between -840 and 840),
  soreness smallint check (soreness between 1 and 10),
  academic_stress smallint check (academic_stress between 1 and 10),
  nutrition smallint check (nutrition between 1 and 10),
  resting_hr smallint check (resting_hr between 20 and 250),
  sleep_hours numeric(4,2) check (sleep_hours between 0 and 24),
  rpe smallint check (rpe between 1 and 10),
  fatigue smallint check (fatigue between 1 and 10),
  pace_3x100_seconds numeric(7,3) check (pace_3x100_seconds > 0 and pace_3x100_seconds <= 600),
  time_25y_seconds numeric(7,3) check (time_25y_seconds > 0 and time_25y_seconds <= 300),
  kick_count integer check (kick_count between 0 and 10000),
  stroke_count integer check (stroke_count between 0 and 10000),
  zone1_minutes numeric(6,2) check (zone1_minutes between 0 and 360),
  zone2_minutes numeric(6,2) check (zone2_minutes between 0 and 360),
  zone3_minutes numeric(6,2) check (zone3_minutes between 0 and 360),
  zone4_minutes numeric(6,2) check (zone4_minutes between 0 and 360),
  zone5_minutes numeric(6,2) check (zone5_minutes between 0 and 360),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, activity_date, session_key),
  constraint log_type_matches_session check (
    (log_type = 'wellness' and session_key = 'daily_wellness') or
    (log_type = 'monday_test' and session_key = 'monday_am_test') or
    (log_type = 'friday_test' and session_key = 'friday_am_test') or
    (log_type = 'practice' and session_key not in ('daily_wellness', 'monday_am_test', 'friday_am_test'))
  ),
  constraint required_fields_match_log check (
    (log_type = 'wellness' and soreness is not null and academic_stress is not null and nutrition is not null) or
    (log_type <> 'wellness' and rpe is not null and fatigue is not null)
  ),
  constraint session_matches_weekday check (
    (session_key = 'daily_wellness') or
    (session_key in ('monday_am_test', 'monday_lift', 'monday_pm_swim') and extract(isodow from activity_date) = 1) or
    (session_key in ('tuesday_am_swim', 'tuesday_lift') and extract(isodow from activity_date) = 2) or
    (session_key in ('wednesday_am_swim', 'wednesday_pm_swim') and extract(isodow from activity_date) = 3) or
    (session_key in ('thursday_am_swim', 'thursday_lift') and extract(isodow from activity_date) = 4) or
    (session_key in ('friday_am_test', 'friday_pm_swim') and extract(isodow from activity_date) = 5) or
    (session_key = 'saturday_am_swim' and extract(isodow from activity_date) = 6)
  )
);

create index athlete_logs_athlete_date_idx on public.athlete_logs (athlete_id, activity_date desc) where deleted_at is null;
create index athlete_logs_date_idx on public.athlete_logs (activity_date desc) where deleted_at is null;
create index profiles_role_idx on public.profiles (role) where active;
create index group_memberships_athlete_idx on public.group_memberships (athlete_id);

create table public.login_attempts (
  identifier_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('coach', 'admin'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.app_role;
begin
  new_role := coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'athlete');
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name',
    new_role
  );
  if new_role = 'athlete' then
    insert into public.athletes (user_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.set_log_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.athlete_id <> old.athlete_id or new.activity_date <> old.activity_date or new.session_key <> old.session_key or new.created_by <> old.created_by or new.created_at <> old.created_at then
      raise exception 'Log identity fields cannot be changed';
    end if;
    if (new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by) and not public.is_admin() then
      raise exception 'Only administrators can delete or restore logs';
    end if;
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger set_log_audit_fields
  before update on public.athlete_logs
  for each row execute function public.set_log_audit_fields();

create or replace function public.audit_log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'log.created'
      when new.deleted_at is not null and old.deleted_at is null then 'log.deleted'
      when new.deleted_at is null and old.deleted_at is not null then 'log.restored'
      else 'log.updated'
    end,
    'athlete_log',
    coalesce(new.id, old.id)::text,
    jsonb_build_object('athlete_id', coalesce(new.athlete_id, old.athlete_id), 'activity_date', coalesce(new.activity_date, old.activity_date))
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_log_change
  after insert or update on public.athlete_logs
  for each row execute function public.audit_log_change();

alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.athlete_logs enable row level security;
alter table public.login_attempts enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles select self or staff" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles admin update" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "athletes select self or staff" on public.athletes
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "athletes admin update" on public.athletes
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "groups authenticated select" on public.groups
  for select to authenticated using (true);
create policy "groups admin insert" on public.groups
  for insert to authenticated with check (public.is_admin());
create policy "groups admin update" on public.groups
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "groups admin delete" on public.groups
  for delete to authenticated using (public.is_admin());

create policy "memberships self or staff select" on public.group_memberships
  for select to authenticated using (athlete_id = auth.uid() or public.is_staff());
create policy "memberships admin insert" on public.group_memberships
  for insert to authenticated with check (public.is_admin());
create policy "memberships admin delete" on public.group_memberships
  for delete to authenticated using (public.is_admin());

create policy "logs self or staff select" on public.athlete_logs
  for select to authenticated
  using ((athlete_id = auth.uid() or public.is_staff()) and deleted_at is null);
create policy "logs admin select deleted" on public.athlete_logs
  for select to authenticated
  using (public.is_admin());
create policy "logs self or staff insert" on public.athlete_logs
  for insert to authenticated
  with check ((athlete_id = auth.uid() or public.is_staff()) and created_by = auth.uid() and updated_by = auth.uid() and deleted_at is null);
create policy "logs self or staff update" on public.athlete_logs
  for update to authenticated
  using (athlete_id = auth.uid() or public.is_staff())
  with check (athlete_id = auth.uid() or public.is_staff());
create policy "logs admin delete" on public.athlete_logs
  for delete to authenticated using (public.is_admin());

create policy "audit admin select" on public.audit_events
  for select to authenticated using (public.is_admin());

revoke all on public.login_attempts from anon, authenticated;
revoke all on public.audit_events from anon;
revoke all on public.profiles, public.athletes, public.groups, public.group_memberships, public.athlete_logs from anon;

grant select on public.profiles, public.athletes, public.groups, public.group_memberships, public.athlete_logs to authenticated;
grant insert, update on public.athlete_logs to authenticated;
grant update on public.profiles, public.athletes to authenticated;
grant insert, update, delete on public.groups, public.group_memberships to authenticated;
grant select on public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;
