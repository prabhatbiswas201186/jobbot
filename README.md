# JobBot — AI Career Operating System

A fully local, single-user career assistant built from the JobBot design
(`project/JobBot.dc.html`). It runs entirely on your own laptop — no login, no
cloud database. Your data lives in a local JSON file; the only external calls
are to Google's Gemini API for the AI features.

**→ See [RUN.md](./RUN.md) for setup and how to run it.**

## What's inside

- `web/` — React + Vite + TypeScript frontend (the UI from the design)
- `server/` — local Node/Express API + JSON-file storage + Gemini calls
- `project/` — the original design prototype this was built from
- `chats/` — the design conversation that produced it

## Features

- **Onboarding** — upload a résumé (PDF/DOCX/paste) or import from GitHub; Gemini
  produces a real ATS score, keyword coverage, and rewritten achievement bullets.
- **Mission Control** — career health score, pipeline, upcoming interviews, and
  AI next-best-actions computed from your actual data.
- **Résumé Studio** — keep tailored résumé versions per role; auto-tailor with Gemini.
- **Job Match** — 20 real listings across India, UAE, Saudi Arabia, and
  international remote (sourced from Indeed), scored against your résumé by Gemini.
- **Interview Coach** — STAR answer scoring, filler-word/readiness feedback, and a
  tailored question bank.
- **Tracker** — drag-and-drop kanban of your applications.
- **Floating co-pilot** — a Gemini chat grounded in your real pipeline, with
  proactive insights.
- Dark/light theme toggle throughout.
