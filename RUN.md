# Running JobBot locally

This is a fully local app — no cloud accounts, no login. Everything (your résumé,
applications, interview practice) is stored in a plain JSON file on your own
laptop (`server/jobbot-data.json`). No database engine, nothing to compile. The
only outside call it makes is to Google's Gemini API for the AI features (résumé
analysis, job matching, interview coaching).

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

This starts both the local server (port 8787) and the web app (port 5290) with
one command, and automatically opens **http://localhost:5290** in your browser.

JobBot uses its own dedicated port (5290) so it won't clash with other projects
that use Vite's default 5173. If port 5290 is somehow already in use, JobBot will
stop with a clear error instead of silently opening on a different port — free it
up (`npx kill-port 5290`) and run again.

To stop it, press `Ctrl+C` in the terminal.

## What's real

- Résumé upload (PDF/DOCX/text paste) is parsed in your browser, then analyzed by
  Gemini for a real ATS score, keyword coverage, and AI-rewritten bullets.
- Résumé Studio tailoring, Interview Coach STAR scoring/question banks, Job
  Match scoring, and the floating co-pilot are all live Gemini calls grounded in
  your actual data — not scripted demo content.
- The Job Match module ships seeded with 20 real job listings (5 each across
  India, UAE, Saudi Arabia, and international remote), pulled from Indeed at the
  time this was built — a point-in-time snapshot.
- **Live job search (optional):** add a free RapidAPI key to `server/.env` and
  the search bar on the Job Match page will fetch *current* listings for any
  role/location via the JSearch API (which aggregates Indeed, LinkedIn,
  Glassdoor & ZipRecruiter). Without the key, the seeded snapshot still works.
- Each job card has an **"Apply on Indeed →"** link that opens the real posting
  where you actually apply; **"Track"** just saves it to your local board.
- The Tracker board, applications, and interview schedule are all stored
  locally and persist across restarts (same JSON file).

## Enabling live job search

1. Sign up at **https://rapidapi.com** (free).
2. Go to the **JSearch** API page (search "JSearch" in the RapidAPI hub) and
   click **Subscribe** → pick the **Basic (free)** plan.
3. On the JSearch "Endpoints" page, copy your key from the
   `X-RapidAPI-Key` header field.
4. Add it to `server/.env`:
   ```
   RAPIDAPI_KEY=your-key-here
   ```
5. Restart JobBot. The "Search live jobs" bar on Job Match now returns current
   listings; hit "Refresh AI match scores" to rank them against your résumé.

## Resetting your data

Delete `server/jobbot-data.json` and restart — it'll recreate an empty store
with the seed jobs on next launch.
