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

-- ===================== SEED JOBS =====================
-- Seed listings for the Job Match module: 20 real jobs sourced from Indeed
-- across India, UAE, Saudi Arabia, and international remote (point-in-time
-- snapshot). The live JSearch search (jobs-search edge function) upserts
-- fresh listings alongside these using source='jsearch', so both coexist.
-- Salary shown as posted by Indeed where available; otherwise a regional estimate.

insert into public.jobs
  (source, external_id, role, company, logo_text, location, region, tags, salary_min, salary_max, currency, url, description, posted_at)
values
  -- India
  ('indeed', 'JOBSEARCH_12', 'Associate Product Manager', 'MillerKnoll', 'MK', 'Bengaluru, India', 'india',
    array['Product','Associate'], 1800000, 2800000, 'INR', 'https://to.indeed.com/aa6my9vn9zhl', 'Associate Product Manager role at MillerKnoll, Bengaluru.', '2026-06-22'),
  ('indeed', 'JOBSEARCH_13', 'Product Manager III', 'TE Connectivity', 'TE', 'Bengaluru, India', 'india',
    array['Hardware','Enterprise'], 3200000, 4500000, 'INR', 'https://to.indeed.com/aamsjtr2zlh7', 'Senior product management role at TE Connectivity, Bengaluru.', '2026-06-03'),
  ('indeed', 'JOBSEARCH_16', 'Product Manager', 'Lenskart.com', 'L', 'Bengaluru, India', 'india',
    array['D2C','Retail Tech'], 2800000, 4000000, 'INR', 'https://to.indeed.com/aaqhfgvbdlw8', 'Product Manager at Lenskart, Bengaluru.', '2026-05-21'),
  ('indeed', 'JOBSEARCH_17', 'Senior Product Manager', 'LexisNexis Legal & Professional', 'LN', 'Bengaluru, India', 'india',
    array['LegalTech','Enterprise'], 3500000, 4800000, 'INR', 'https://to.indeed.com/aarlkcbprl7x', 'Senior Product Manager at LexisNexis, Bengaluru.', '2026-03-04'),
  ('indeed', 'JOBSEARCH_21', 'Principal Product Manager', 'Acceldata', 'A', 'Bengaluru, India', 'india',
    array['Data Platform','B2B'], 4500000, 6000000, 'INR', 'https://to.indeed.com/aahbpndlm8x2', 'Principal Product Manager at Acceldata, Bengaluru.', '2026-06-24'),

  -- UAE
  ('indeed', 'JOBSEARCH_23', 'Product Manager', 'Highfly Sourcing', 'HS', 'Dubai, UAE', 'uae',
    array['Sourcing','Product'], 200000, 280000, 'AED', 'https://to.indeed.com/aax7sgk4xtv4', 'Product Manager role at Highfly Sourcing, Dubai.', '2026-03-03'),
  ('indeed', 'JOBSEARCH_24', 'Product Manager', 'Psdigital', 'P', 'Dubai, UAE', 'uae',
    array['Digital','Agency'], 190000, 260000, 'AED', 'https://to.indeed.com/aagbh6nmy28l', 'Product Manager at Psdigital, Dubai.', '2026-02-27'),
  ('indeed', 'JOBSEARCH_27', 'Product Manager', 'Hoxton Wealth', 'HW', 'Dubai, UAE', 'uae',
    array['Fintech','Wealth'], 210000, 290000, 'AED', 'https://to.indeed.com/aayd8lzc9bwz', 'Product Manager at Hoxton Wealth, Dubai.', '2026-06-09'),
  ('indeed', 'JOBSEARCH_28', 'Product Manager', 'WEbook.com', 'W', 'Dubai, UAE', 'uae',
    array['Consumer','Marketplace'], 180000, 240000, 'AED', 'https://to.indeed.com/aa79kn82pfw7', 'Product Manager at WEbook.com, Dubai.', '2026-01-21'),
  ('indeed', 'JOBSEARCH_30', 'Global Product Manager', 'zcreatix', 'Z', 'Dubai, UAE', 'uae',
    array['Global','Product'], 230000, 310000, 'AED', 'https://to.indeed.com/aazvpvbqcskr', 'Global Product Manager at zcreatix, Dubai.', '2026-05-05'),

  -- Saudi Arabia
  ('indeed', 'JOBSEARCH_33', 'Product Manager', 'almosafer', 'AL', 'Riyadh, Saudi Arabia', 'saudi',
    array['Travel','Consumer'], 190000, 260000, 'SAR', 'https://to.indeed.com/aagh7ck8ngkq', 'Product Manager at almosafer, Riyadh.', '2024-11-23'),
  ('indeed', 'JOBSEARCH_39', 'Customer Platforms Product Manager', 'Riyadh Air', 'RA', 'Riyadh, Saudi Arabia', 'saudi',
    array['Aviation','Customer Platforms'], 220000, 300000, 'SAR', 'https://to.indeed.com/aagvmglx9b4v', 'Customer Platforms Product Manager at Riyadh Air.', '2026-06-09'),
  ('indeed', 'JOBSEARCH_40', 'Senior Product Manager', 'Soar Software Development Company', 'S', 'Riyadh, Saudi Arabia', 'saudi',
    array['Software','B2B'], 210000, 280000, 'SAR', 'https://to.indeed.com/aalclm6ydyk8', 'Senior Product Manager at Soar Software, Riyadh.', '2026-06-29'),
  ('indeed', 'JOBSEARCH_32', 'Product Manager', 'SARJ', 'SARJ', 'Riyadh, Saudi Arabia', 'saudi',
    array['Product'], 180000, 240000, 'SAR', 'https://to.indeed.com/aayyxtdzskd8', 'Product Manager at SARJ, Riyadh.', '2026-04-16'),
  ('indeed', 'JOBSEARCH_38', 'Product Manager', 'Prime Gate', 'PG', 'Riyadh, Saudi Arabia', 'saudi',
    array['Product'], 170000, 230000, 'SAR', 'https://to.indeed.com/aac4hy6yxzft', 'Product Manager at Prime Gate, Riyadh.', '2026-04-07'),

  -- International remote
  ('indeed', 'JOBSEARCH_42', 'Medicaid Product Manager', 'Humana', 'H', 'Remote (US)', 'remote-intl',
    array['Healthcare','Medicaid'], 104000, 250000, 'USD', 'https://to.indeed.com/aasf4j9mch8z', 'Medicaid Product Manager at Humana, fully remote.', '2026-06-30'),
  ('indeed', 'JOBSEARCH_45', 'Senior Product Manager', 'FCT', 'FCT', 'Remote (US)', 'remote-intl',
    array['Real Estate Tech'], 129300, 172300, 'USD', 'https://to.indeed.com/aaznvf6qxzcc', 'Senior Product Manager (Remote) at FCT.', '2026-05-18'),
  ('indeed', 'JOBSEARCH_44', 'Senior Product Manager', 'Extra Duty Solutions', 'EDS', 'Remote (US)', 'remote-intl',
    array['EdTech','B2B'], 130000, 170000, 'USD', 'https://to.indeed.com/aakvz9867z79', 'Senior Product Manager at Extra Duty Solutions, fully remote.', '2026-06-18'),
  ('indeed', 'JOBSEARCH_50', 'Associate Product Manager', 'Cutsforth', 'C', 'Remote (US)', 'remote-intl',
    array['Industrial','IoT'], 117407, 146339, 'USD', 'https://to.indeed.com/aar66xyfj8qw', 'Associate Product Manager at Cutsforth, fully remote.', '2026-05-27'),
  ('indeed', 'JOBSEARCH_51', 'Product Operations Manager', 'Extra Duty Solutions', 'EDS', 'Remote (US)', 'remote-intl',
    array['Product Ops','Enablement'], 85000, 100000, 'USD', 'https://to.indeed.com/aal77xqnt4vb', 'Product Operations Manager: Practice & Enablement, fully remote.', '2026-06-18')
on conflict (source, external_id) do nothing;
