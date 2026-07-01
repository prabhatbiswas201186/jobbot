import { Router } from 'express';
import { db } from '../db.js';
import { geminiJSON } from '../gemini.js';

export const jobsRouter = Router();

function serializeJob(row) {
  return { ...row, tags: JSON.parse(row.tags) };
}

jobsRouter.get('/', (req, res) => {
  const { region } = req.query;
  const jobs = region
    ? db.prepare('SELECT * FROM jobs WHERE region = ? ORDER BY posted_at DESC').all(region)
    : db.prepare('SELECT * FROM jobs ORDER BY posted_at DESC').all();

  const matches = db.prepare('SELECT * FROM job_matches').all();
  const matchByJob = new Map(matches.map((m) => [m.job_id, m]));

  const withMatches = jobs
    .map((j) => {
      const m = matchByJob.get(j.id);
      return {
        ...serializeJob(j),
        match_score: m ? m.match_score : null,
        matched_keywords: m ? JSON.parse(m.matched_keywords) : [],
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
    const jobs = region
      ? db.prepare('SELECT id, role, company, tags FROM jobs WHERE region = ? LIMIT 30').all(region)
      : db.prepare('SELECT id, role, company, tags FROM jobs LIMIT 30').all();

    if (jobs.length === 0) return res.json({ matches: [] });

    const resume = db.prepare('SELECT keyword_have, parsed FROM resumes WHERE is_master = 1 ORDER BY created_at DESC LIMIT 1').get();
    const skills = resume ? JSON.parse(resume.keyword_have) : [];

    const prompt = `You are a job-matching engine. Given a candidate's résumé skills/keywords and a list of open jobs, score how well the candidate fits each job from 0-100 based on skill/role overlap, and list which of the candidate's keywords matched.

Candidate keywords/skills: ${skills.length ? JSON.stringify(skills) : '(no résumé uploaded yet — score generously based on role seniority alone, 55-75 range)'}

Jobs:
${jobs.map((j) => `- id="${j.id}" role="${j.role}" company="${j.company}" tags=${j.tags}`).join('\n')}

Return one entry per job id in "matches".`;

    const { matches } = await geminiJSON(prompt, matchSchema);

    const upsert = db.prepare(`
      INSERT INTO job_matches (job_id, match_score, matched_keywords)
      VALUES (?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET match_score = excluded.match_score, matched_keywords = excluded.matched_keywords, created_at = datetime('now')
    `);
    const validIds = new Set(jobs.map((j) => j.id));
    const tx = db.transaction((rows) => {
      for (const m of rows) {
        if (!validIds.has(m.jobId)) continue;
        upsert.run(m.jobId, Math.max(0, Math.min(100, m.score)), JSON.stringify(m.matchedKeywords));
      }
    });
    tx(matches);

    res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
