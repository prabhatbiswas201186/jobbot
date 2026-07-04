-- Career Path module: caches the Gemini-generated paths + a checkable skill
-- roadmap per user.

create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paths jsonb not null default '[]'::jsonb,
  skill_roadmap jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.career_paths enable row level security;

create policy "career_paths: owner all" on public.career_paths
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_career_paths_user on public.career_paths (user_id, created_at desc);
