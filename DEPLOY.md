# Deploying JobBot

This repo now contains a real full-stack implementation of the JobBot design
(`project/JobBot.dc.html`):

- `web/` — React + Vite + TypeScript frontend
- `supabase/migrations/` — Postgres schema + RLS policies
- `supabase/seed_jobs.sql` — seed job listings (India / UAE / Saudi / remote-intl)
- `supabase/functions/` — Gemini-backed Edge Functions (resume analysis,
  résumé tailoring, interview coaching, job matching, co-pilot chat)

I could not run any of the steps below myself: this sandbox's network egress
allowlist blocks `*.supabase.co`, `supabase.com`, and `rapidapi.com` (only
`generativelanguage.googleapis.com`, `github.com`, and `registry.npmjs.org`
are reachable from here). Everything is written and type-checks/builds
cleanly, but it has **not been run against your live Supabase project**.

## 0. Rotate your Supabase keys first

The Service Role Key and JWT Secret were pasted into our chat, which makes
them compromised by definition (they live in conversation history now).
**Before going further, rotate both in Supabase → Settings → API**, then
update `supabase/.env` (gitignored) with the new Service Role Key. The
anon/publishable key is safe to leave as-is since it's meant to be public.

## 1. Push the database schema

```bash
npm install -g supabase   # if you don't have the CLI
supabase login
cd /path/to/this/repo
supabase link --project-ref fppfysuaouwkiptiouzt
supabase db push          # runs supabase/migrations/0001_init.sql
```

Then seed the jobs catalog (SQL editor in the Supabase dashboard, or):

```bash
psql "$(supabase db url)" -f supabase/seed_jobs.sql
```

## 2. Set Edge Function secrets and deploy

```bash
supabase secrets set --env-file supabase/.env
supabase functions deploy resume-analyze
supabase functions deploy resume-tailor
supabase functions deploy interview-coach
supabase functions deploy job-match
supabase functions deploy copilot-chat
```

## 3. Configure auth providers (optional but recommended)

The onboarding screen has Google / LinkedIn / GitHub buttons wired to
`supabase.auth.signInWithOAuth`. They'll only work once you enable each
provider under Supabase → Authentication → Providers and add their OAuth
client ID/secret. Email/password sign-up works out of the box with no
extra configuration.

## 4. Run the frontend

```bash
cd web
npm install
npm run dev
```

`web/.env` already points at your Supabase project (URL + anon key).

## 5. Job listings: seed data now, live API later

The Job Match module reads from the `jobs` table, currently seeded with 20
real-looking listings across India, UAE, Saudi Arabia, and international
remote roles (`supabase/seed_jobs.sql`). Naukri/Bayt/GulfTalent/LinkedIn
don't offer public APIs, so the plan is a JSearch (RapidAPI) integration —
once you get a RapidAPI key, tell me and I'll add a
`jobs-sync` Edge Function that upserts live listings into the same `jobs`
table (the `source` column already distinguishes `'seed'` rows so this is a
non-breaking addition, no frontend changes needed).

## 6. What's real vs. what's still a placeholder

**Real / wired to Supabase + Gemini:**
- Email/password auth, session handling, RLS-scoped data per user
- Résumé upload (PDF via pdf.js, DOCX via mammoth, or paste) → Gemini
  analysis → real ATS score, keyword coverage, AI bullet rewrites, career
  health subscores — all persisted to Postgres
- Résumé Studio tailoring (per target role/company) via Gemini
- Job Match scoring via Gemini, applied against the seeded jobs catalog
- Interview Coach: STAR scoring, filler-word/readiness scoring, and a
  tailored question bank, all from Gemini, persisted to `mock_sessions`
  and `star_answers`
- Tracker: real drag-and-drop kanban backed by the `applications` table
- Floating co-pilot: real Gemini chat grounded in the user's actual
  pipeline data (applications, interviews, résumé versions), with
  proactive insights, persisted to `copilot_messages`

**Still placeholder:**
- Job listings are seed data, not a live feed (see §5)
- Google/LinkedIn/GitHub OAuth need provider setup in the Supabase dashboard
  (§3) before those buttons work
- No salary-negotiation, analytics, or career-path modules — out of scope
  for this pass, same as the original prototype only sketched them
