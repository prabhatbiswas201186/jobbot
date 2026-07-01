import { Router } from 'express';
import { data, save } from '../store.js';
import { geminiJSON } from '../gemini.js';

export const jobsRouter = Router();

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
