# Running JobBot locally

This is a fully local app — no cloud accounts, no login. Everything (your résumé,
applications, interview practice) is stored in a SQLite file on your own laptop
(`server/jobbot.sqlite3`). The only outside call it makes is to Google's Gemini
API for the AI features (résumé analysis, job matching, interview coaching).

## First-time setup

1. **Get a Gemini API key** (if you don't already have one): https://aistudio.google.com/apikey
2. In the `server/` folder, copy `.env.example` to `.env` and paste in your key:
   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-2.5-flash
   PORT=8787
   ```
3. Install everything (run once, from the repo root):
   ```bash
   npm run install:all
   ```

## Every time you want to use it

From the repo root:
```bash
npm run dev
```

This starts both the local server (port 8787) and the web app (port 5173) with
one command. Open **http://localhost:5173** in your browser.

To stop it, press `Ctrl+C` in the terminal.

## What's real

- Résumé upload (PDF/DOCX/text paste) is parsed in your browser, then analyzed by
  Gemini for a real ATS score, keyword coverage, and AI-rewritten bullets.
- Résumé Studio tailoring, Interview Coach STAR scoring/question banks, Job
  Match scoring, and the floating co-pilot are all live Gemini calls grounded in
  your actual data — not scripted demo content.
- The Job Match module ships seeded with 20 real job listings (5 each across
  India, UAE, Saudi Arabia, and international remote), pulled live from Indeed
  at the time this was built. Nothing refreshes automatically — this is a
  point-in-time snapshot, not a live feed.
- The Tracker board, applications, and interview schedule are all stored
  locally and persist across restarts (same SQLite file).

## Resetting your data

Delete `server/jobbot.sqlite3` (and any `-wal`/`-shm` files next to it) and
restart — it'll recreate an empty database with the seed jobs on next launch.
