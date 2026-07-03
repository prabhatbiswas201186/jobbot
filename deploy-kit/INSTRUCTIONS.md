# JobBot — Supabase Dashboard Deploy Kit

Everything here is copy-paste. No terminal, no CLI. Total time: ~15 minutes.
Tip: on each GitHub file page, use the **"Copy raw file"** button (two overlapping
squares, top-right of the file view) to copy the whole file in one click.

## Step 1 — Create the database (one paste)

1. Open your Supabase project → left sidebar → **SQL Editor**.
2. Click **New query** (or the `+`).
3. Copy ALL of [`deploy-kit/setup.sql`](./setup.sql) and paste it in.
4. Click **Run** (or Ctrl+Enter).
5. Expected result: "Success. No rows returned" (the seed insert reports rows).
   Run it only once — on a second run you'd see harmless "already exists" errors.

## Step 2 — Deploy the six functions (six pastes)

For each file in [`deploy-kit/functions/`](./functions):

1. Supabase → left sidebar → **Edge Functions** → **Deploy a new function** →
   **Via Editor**.
2. **Function name**: must match the filename exactly (without `.ts`):
   - `resume-analyze`
   - `resume-tailor`
   - `interview-coach`
   - `job-match`
   - `copilot-chat`
   - `jobs-search`
3. Delete the sample code in the editor, paste the entire file contents.
4. Click **Deploy function**.
5. Repeat for all six.

## Step 3 — Add the two secrets (one form)

1. Supabase → **Edge Functions** → **Secrets** (or Settings → Edge Functions).
2. Add:
   - `GEMINI_API_KEY` = your Gemini key
   - `RAPIDAPI_KEY` = your RapidAPI (JSearch) key
3. Save. (SUPABASE_URL and the service-role key are injected automatically —
   don't add those.)

## Step 4 — Tell Claude "supabase done"

Claude then hands you the final Vercel click-through (~5 minutes) and the app
goes live.
