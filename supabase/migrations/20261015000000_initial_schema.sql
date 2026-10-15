-- JobFlow initial schema
-- Tables: profiles, applications, follow_up_tasks, application_activity
-- Every user-owned table has Row Level Security enabled and is scoped to auth.uid().

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- security definer: runs as the table owner so it can insert into public.profiles
-- while the new user does not yet have a session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------

create table public.applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company          text not null check (char_length(trim(company)) between 1 and 120),
  job_title        text not null check (char_length(trim(job_title)) between 1 and 160),
  logo_url         text check (logo_url is null or logo_url ~* '^https?://'),
  location         text check (location is null or char_length(location) <= 120),
  work_type        text check (work_type in ('remote', 'hybrid', 'onsite')),
  job_url          text check (job_url is null or job_url ~* '^https?://'),
  status           text not null default 'saved'
                   check (status in ('saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn')),
  date_applied     date,
  interview_at     timestamptz,
  interview_notes  text check (interview_notes is null or char_length(interview_notes) <= 5000),
  salary_min       integer check (salary_min is null or salary_min >= 0),
  salary_max       integer check (salary_max is null or salary_max >= 0),
  salary_currency  char(3) check (salary_currency is null or salary_currency ~ '^[A-Z]{3}$'),
  notes            text check (notes is null or char_length(notes) <= 5000),
  -- Archiving hides an application from active views without deleting its history.
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint applications_salary_range check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  ),
  -- Lets child tables reference (id, user_id) so ownership is enforced by the database.
  constraint applications_id_user_unique unique (id, user_id)
);

create index applications_user_status_idx on public.applications (user_id, status);
create index applications_user_date_applied_idx on public.applications (user_id, date_applied desc);
create index applications_user_interview_idx on public.applications (user_id, interview_at)
  where interview_at is not null;

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- follow_up_tasks
-- ---------------------------------------------------------------------------

create table public.follow_up_tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id  uuid not null,
  title           text not null check (char_length(trim(title)) between 1 and 200),
  due_at          timestamptz not null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Composite FK: a task can only point at an application owned by the same user.
  constraint follow_up_tasks_application_fk
    foreign key (application_id, user_id)
    references public.applications (id, user_id)
    on delete cascade
);

create index follow_up_tasks_user_due_idx on public.follow_up_tasks (user_id, due_at)
  where completed_at is null;
create index follow_up_tasks_application_idx on public.follow_up_tasks (application_id);

create trigger follow_up_tasks_set_updated_at
  before update on public.follow_up_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- application_activity: append-only history used for analytics
-- ---------------------------------------------------------------------------

create table public.application_activity (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  application_id  uuid not null,
  type            text not null
                  check (type in ('created', 'status_changed', 'interview_scheduled', 'archived', 'restored')),
  from_status     text,
  to_status       text,
  occurred_at     timestamptz not null default now(),

  constraint application_activity_application_fk
    foreign key (application_id, user_id)
    references public.applications (id, user_id)
    on delete cascade
);

create index application_activity_user_time_idx on public.application_activity (user_id, occurred_at desc);
create index application_activity_application_idx on public.application_activity (application_id);

-- Activity is written only by this trigger. It is security definer and there is
-- no INSERT policy for users, so clients cannot forge history.
-- Mirrors deriveActivity() in src/core/domain/activity.ts (used by demo mode).
create or replace function public.log_application_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_activity (user_id, application_id, type, to_status)
    values (new.user_id, new.id, 'created', new.status);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.application_activity (user_id, application_id, type, from_status, to_status)
    values (new.user_id, new.id, 'status_changed', old.status, new.status);
  end if;

  if new.interview_at is not null and new.interview_at is distinct from old.interview_at then
    insert into public.application_activity (user_id, application_id, type, to_status)
    values (new.user_id, new.id, 'interview_scheduled', new.status);
  end if;

  if new.archived_at is not null and old.archived_at is null then
    insert into public.application_activity (user_id, application_id, type, to_status)
    values (new.user_id, new.id, 'archived', new.status);
  elsif new.archived_at is null and old.archived_at is not null then
    insert into public.application_activity (user_id, application_id, type, to_status)
    values (new.user_id, new.id, 'restored', new.status);
  end if;

  return new;
end;
$$;

create trigger applications_log_activity
  after insert or update on public.applications
  for each row execute function public.log_application_activity();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.application_activity enable row level security;

-- profiles: read and update only your own row (rows are created by trigger).
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- applications: full CRUD on your own rows only.
create policy "Users can view their own applications"
  on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own applications"
  on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own applications"
  on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own applications"
  on public.applications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- follow_up_tasks: full CRUD on your own rows only.
create policy "Users can view their own follow-ups"
  on public.follow_up_tasks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own follow-ups"
  on public.follow_up_tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own follow-ups"
  on public.follow_up_tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own follow-ups"
  on public.follow_up_tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- application_activity: read-only for users; written by the trigger above.
create policy "Users can view their own activity"
  on public.application_activity for select to authenticated
  using ((select auth.uid()) = user_id);
