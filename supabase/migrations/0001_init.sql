-- JobBot core schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  location text not null default '',
  target_comp_min integer,
  target_comp_max integer,
  target_currency text not null default 'USD',
  onboarding_stage text not null default 'upload'
    check (onboarding_stage in ('upload', 'analyzing', 'results', 'done')),
  autopilot_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: owner insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- resumes (the parsed master résumé, produced by the resume-analyze function)
-- ---------------------------------------------------------------------------
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text,
  raw_text text not null,
  parsed jsonb not null default '{}'::jsonb, -- {roles:[...], skills:[...], achievements:[...]}
  ats_score integer,
  keyword_have text[] not null default '{}',
  keyword_missing text[] not null default '{}',
  recruiter_tip text,
  is_master boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "resumes: owner all" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- resume_versions (tailored versions per role, shown in Résumé Studio)
-- ---------------------------------------------------------------------------
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  name text not null,
  target_role text,
  target_company text,
  ats_score integer not null default 0,
  bullets jsonb not null default '[]'::jsonb, -- [{original, rewrite, is_ai}]
  keyword_have text[] not null default '{}',
  keyword_missing text[] not null default '{}',
  recruiter_tip text,
  status text not null default 'draft' check (status in ('draft', 'tailoring', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resume_versions enable row level security;

create policy "resume_versions: owner all" on public.resume_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- jobs (shared catalog — seeded rows + room for a live aggregator to insert into)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'seed', -- 'seed' | 'jsearch' | ...
  external_id text,
  role text not null,
  company text not null,
  logo_text text not null default '',
  location text not null,
  region text not null check (region in ('india', 'uae', 'saudi', 'remote-intl')),
  tags text[] not null default '{}',
  salary_min integer,
  salary_max integer,
  currency text not null default 'USD',
  url text,
  description text,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

alter table public.jobs enable row level security;

create policy "jobs: public read" on public.jobs
  for select using (true);

-- ---------------------------------------------------------------------------
-- job_matches (per-user computed match score against the jobs catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  match_score integer not null default 0,
  matched_keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

alter table public.job_matches enable row level security;

create policy "job_matches: owner all" on public.job_matches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- applications (tracker board / pipeline)
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  role text not null,
  company text not null,
  logo_text text not null default '',
  stage text not null default 'applied'
    check (stage in ('applied', 'screening', 'interview', 'offer', 'rejected')),
  tag text,
  tag_color text,
  source text not null default 'manual' check (source in ('manual', 'autopilot')),
  offer_amount integer,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "applications: owner all" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- interviews (upcoming schedule)
-- ---------------------------------------------------------------------------
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  company text not null,
  role text not null,
  kind text not null default 'behavioral',
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.interviews enable row level security;

create policy "interviews: owner all" on public.interviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- star_answers (STAR builder, AI-assisted)
-- ---------------------------------------------------------------------------
create table if not exists public.star_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  situation text,
  task text,
  action text,
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question)
);

alter table public.star_answers enable row level security;

create policy "star_answers: owner all" on public.star_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- mock_sessions (mock interview scoring from the interview-coach function)
-- ---------------------------------------------------------------------------
create table if not exists public.mock_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  interview_id uuid references public.interviews (id) on delete set null,
  question text,
  answer_text text,
  structure_score integer,
  specificity_score integer,
  filler_word_count integer,
  readiness_score integer,
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.mock_sessions enable row level security;

create policy "mock_sessions: owner all" on public.mock_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- copilot_messages (chat log with the floating co-pilot)
-- ---------------------------------------------------------------------------
create table if not exists public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_insight boolean not null default false,
  cta_label text,
  created_at timestamptz not null default now()
);

alter table public.copilot_messages enable row level security;

create policy "copilot_messages: owner all" on public.copilot_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- helpful indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_resume_versions_user on public.resume_versions (user_id);
create index if not exists idx_applications_user_stage on public.applications (user_id, stage);
create index if not exists idx_interviews_user_time on public.interviews (user_id, scheduled_at);
create index if not exists idx_job_matches_user_score on public.job_matches (user_id, match_score desc);
create index if not exists idx_jobs_region on public.jobs (region);
create index if not exists idx_copilot_messages_user_time on public.copilot_messages (user_id, created_at);
