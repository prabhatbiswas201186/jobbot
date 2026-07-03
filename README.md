# JobBot — AI Career Operating System

A live web app for running your job search: résumé intelligence, live job
matching, interview coaching, an application tracker, and an AI co-pilot —
all grounded in your real data.

**Stack**: React + Vite frontend (hosted on Vercel, auto-deployed from this
repo) · Supabase (Postgres + Auth + Edge Functions) · Google Gemini for the AI.

**→ See [DEPLOY.md](./DEPLOY.md) for setup and deployment.**

## What's inside

- `web/` — React + Vite + TypeScript frontend
- `supabase/migrations/` — Postgres schema with per-user row-level security
- `supabase/seed_jobs.sql` — seeded job listings (Indeed snapshot)
- `supabase/functions/` — six Gemini/JSearch-backed edge functions:
  `resume-analyze`, `resume-tailor`, `interview-coach`, `job-match`,
  `copilot-chat`, `jobs-search`
- `project/`, `chats/` — the original Claude Design prototype this was built from

## Features

- **Auth** — email/password login; each user's data is isolated by RLS.
- **Onboarding** — upload a résumé (PDF/DOCX/paste) or import from GitHub;
  Gemini produces a real ATS score, keyword coverage, and rewritten bullets.
- **Mission Control** — career health score, pipeline, upcoming interviews,
  AI next-best-actions computed from your actual data.
- **Résumé Studio** — tailored résumé versions per role; auto-tailor with Gemini.
- **Job Match** — seeded Indeed listings plus **live search** (JSearch API:
  Indeed/LinkedIn/Glassdoor/ZipRecruiter) by role + location, scored against
  your résumé; every card links to the real posting to apply.
- **Interview Coach** — STAR answer scoring, readiness, tailored question bank.
- **Tracker** — drag-and-drop kanban of your applications.
- **Co-pilot** — floating Gemini chat grounded in your real pipeline.
