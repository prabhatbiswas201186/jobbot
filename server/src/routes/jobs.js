import { Router } from 'express';
import { data, save, randomUUID } from '../store.js';
import { geminiJSON } from '../gemini.js';

export const jobsRouter = Router();

// ---------------------------------------------------------------------------
// Live job search via JSearch (RapidAPI). Aggregates Indeed / LinkedIn /
// Glassdoor / ZipRecruiter. Requires RAPIDAPI_KEY in server/.env.
// ---------------------------------------------------------------------------
function mapRegion(countryCode) {
  const c = (countryCode || '').toUpperCase();
  if (c === 'IN') return 'india';
  if (c === 'AE') return 'uae';
  if (c === 'SA') return 'saudi';
  return 'remote-intl';
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

jobsRouter.post('/search', async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return res.status(400).json({
      error:
        'Live search needs a RapidAPI key. Add RAPIDAPI_KEY=your-key to server/.env (see RUN.md), then restart JobBot.',
    });
  }

  const query = (req.body?.query || '').trim();
  const location = (req.body?.location || '').trim();
  if (!query) return res.status(400).json({ error: 'Enter a role to search for.' });

  const fullQuery = location ? `${query} in ${location}` : query;

  try {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(fullQuery)}&page=1&num_pages=1`;
    const jsRes = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    });
    if (!jsRes.ok) {
      const body = await jsRes.text();
      throw new Error(`JSearch request failed (${jsRes.status}): ${body.slice(0, 300)}`);
    }
    const payload = await jsRes.json();
    const results = Array.isArray(payload.data) ? payload.data : [];

    // Replace any previous live-search results (and their match scores) so the
    // list stays focused on the latest search.
    const staleIds = new Set(data.jobs.filter((j) => j.source === 'jsearch').map((j) => j.id));
    data.jobs = data.jobs.filter((j) => j.source !== 'jsearch');
    data.job_matches = data.job_matches.filter((m) => !staleIds.has(m.job_id));

    const mapped = results.map((r) => ({
      id: randomUUID(),
      source: 'jsearch',
      external_id: r.job_id ?? null,
      role: r.job_title ?? 'Untitled role',
      company: r.employer_name ?? 'Unknown company',
      logo_text: initials(r.employer_name),
      location: [r.job_city, r.job_country].filter(Boolean).join(', ') || (r.job_is_remote ? 'Remote' : 'N/A'),
      region: r.job_is_remote ? 'remote-intl' : mapRegion(r.job_country),
      tags: [r.job_employment_type, r.job_is_remote ? 'Remote' : null].filter(Boolean),
      salary_min: r.job_min_salary ?? null,
      salary_max: r.job_max_salary ?? null,
      currency: r.job_salary_currency ?? 'USD',
      url: r.job_apply_link ?? r.job_google_link ?? null,
      description: r.job_description ?? null,
      posted_at: r.job_posted_at_datetime_utc ?? new Date().toISOString(),
    }));

    data.jobs.push(...mapped);
    save();

    res.json({ count: mapped.length, query: fullQuery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

jobsRouter.get('/', (req, res) => {
  const { region } = req.query;
  const jobs = data.jobs
    .filter((j) => !region || j.region === region)
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at));

  const matchByJob = new Map(data.job_matches.map((m) => [m.job_id, m]));

  const withMatches = jobs
    .map((j) => {
      const m = matchByJob.get(j.id);
      return {
        ...j,
        match_score: m ? m.match_score : null,
        matched_keywords: m ? m.matched_keywords : [],
      };
    })
    .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));

  res.json(withMatches);
});

const matchSchema = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          score: { type: 'integer' },
          matchedKeywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['jobId', 'score', 'matchedKeywords'],
      },
    },
  },
  required: ['matches'],
};

jobsRouter.post('/match', async (req, res) => {
  try {
    const { region } = req.body || {};
    const jobs = data.jobs.filter((j) => !region || j.region === region).slice(0, 30);
    if (jobs.length === 0) return res.json({ matches: [] });

    const master = [...data.resumes].filter((r) => r.is_master).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const skills = master ? master.keyword_have : [];

    const prompt = `You are a job-matching engine. Given a candidate's résumé skills/keywords and a list of open jobs, score how well the candidate fits each job from 0-100 based on skill/role overlap, and list which of the candidate's keywords matched.

Candidate keywords/skills: ${skills.length ? JSON.stringify(skills) : '(no résumé uploaded yet — score generously based on role seniority alone, 55-75 range)'}

Jobs:
${jobs.map((j) => `- id="${j.id}" role="${j.role}" company="${j.company}" tags=${JSON.stringify(j.tags)}`).join('\n')}

Return one entry per job id in "matches".`;

    const { matches } = await geminiJSON(prompt, matchSchema);

    const validIds = new Set(jobs.map((j) => j.id));
    for (const m of matches) {
      if (!validIds.has(m.jobId)) continue;
      const score = Math.max(0, Math.min(100, m.score));
      const existing = data.job_matches.find((x) => x.job_id === m.jobId);
      if (existing) {
        existing.match_score = score;
        existing.matched_keywords = m.matchedKeywords;
      } else {
        data.job_matches.push({ job_id: m.jobId, match_score: score, matched_keywords: m.matchedKeywords });
      }
    }
    save();

    res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
