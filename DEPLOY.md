# Deploying JobBot (Vercel + Supabase)

JobBot is a static React app (in `web/`) that talks directly to Supabase for
auth, database, and edge functions. Vercel hosts the frontend and auto-deploys
every push to `main`.

## One-time setup

### 1. Supabase (database + auth + functions)

Provisioning is done via the Supabase MCP connector in Claude (or manually):

- Apply `supabase/migrations/0001_init.sql` (schema + row-level security).
- Run `supabase/seed_jobs.sql` (seed job listings).
- Deploy the six functions in `supabase/functions/`:
  `resume-analyze`, `resume-tailor`, `interview-coach`, `job-match`,
  `copilot-chat`, `jobs-search`.
- In the Supabase dashboard → **Edge Functions → Secrets**, set:
  - `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
  - `RAPIDAPI_KEY` — from RapidAPI (subscribe to the JSearch API, free tier);
    powers live job search. Optional — without it, live search shows a
    friendly error and the seeded listings still work.

### 2. Vercel (frontend hosting)

1. Go to https://vercel.com → Continue with GitHub → **Add New… → Project** →
   import this repo.
2. Set **Root Directory** to `web` (framework: Vite, auto-detected).
3. Add environment variables (both safe to be public):
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — the publishable/anon key
4. Deploy. Every future `git push` to `main` redeploys automatically.

### 3. Auth configuration

- Supabase dashboard → **Authentication → URL Configuration**: set the Site URL
  to your Vercel domain (so email-confirmation links redirect correctly).
- After you create your own account on the live site, optionally disable new
  signups (**Authentication → Sign In / Up → toggle off "Allow new users to
  sign up"**) to keep the site private to you.

## Local development

```bash
cd web
cp .env.example .env   # fill in your Supabase URL + anon key
npm install
npm run dev            # opens http://localhost:5290
```

The dev server talks to the same Supabase project as production.
