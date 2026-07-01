import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { geminiJSON } from '../gemini.js';

export const resumeRouter = Router();

const analyzeSchema = {
  type: 'object',
  properties: {
    atsScore: { type: 'integer' },
    keywordHave: { type: 'array', items: { type: 'string' } },
    keywordMissing: { type: 'array', items: { type: 'string' } },
    recruiterTip: { type: 'string' },
    targetCompMin: { type: 'integer' },
    targetCompMax: { type: 'integer' },
    targetCurrency: { type: 'string' },
    roles: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, company: { type: 'string' }, period: { type: 'string' } },
        required: ['title', 'company', 'period'],
      },
    },
    bullets: {
      type: 'array',
      items: {
        type: 'object',
        properties: { original: { type: 'string' }, rewrite: { type: 'string' } },
        required: ['original', 'rewrite'],
      },
    },
    skillGaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['atsScore', 'keywordHave', 'keywordMissing', 'recruiterTip', 'targetCompMin', 'targetCompMax', 'targetCurrency', 'roles', 'bullets', 'skillGaps'],
};

resumeRouter.post('/analyze', async (req, res) => {
  try {
    const { resumeText, fileName, targetRole, targetCompany } = req.body;
    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ error: 'resumeText is required and must be substantial.' });
    }

    const prompt = `You are an expert technical recruiter and ATS (Applicant Tracking System) auditor.
Analyze the following resume${targetRole ? ` for the target role "${targetRole}"${targetCompany ? ` at ${targetCompany}` : ''}` : ''}.

Return:
- atsScore: 0-100 realistic ATS match score for this resume as-is.
- keywordHave: up to 6 strong keywords/skills clearly present.
- keywordMissing: up to 5 important keywords/skills missing for this kind of role.
- recruiterTip: one sharp, specific, actionable sentence a recruiter would give.
- targetCompMin/targetCompMax: a realistic annual base salary range in USD for this person's level/role.
- targetCurrency: "USD".
- roles: the distinct roles/companies/periods found in the resume (chronological, most recent first, max 4).
- bullets: up to 4 achievement bullets from the resume, each with "original" (as written) and "rewrite" (a punchier, quantified, ATS-optimized rewrite).
- skillGaps: up to 6 skills this person should learn/highlight to be more competitive.

Resume:
"""
${resumeText.slice(0, 12000)}
"""`;

    const analysis = await geminiJSON(prompt, analyzeSchema);

    const resumeId = randomUUID();
    db.prepare(
      `INSERT INTO resumes (id, file_name, raw_text, parsed, ats_score, keyword_have, keyword_missing, recruiter_tip, is_master)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      resumeId,
      fileName ?? null,
      resumeText,
      JSON.stringify({ roles: analysis.roles, bullets: analysis.bullets, skillGaps: analysis.skillGaps }),
      analysis.atsScore,
      JSON.stringify(analysis.keywordHave),
      JSON.stringify(analysis.keywordMissing),
      analysis.recruiterTip
    );

    db.prepare(
      `INSERT INTO resume_versions (id, resume_id, name, target_role, target_company, ats_score, bullets, keyword_have, keyword_missing, recruiter_tip, status)
       VALUES (?, ?, 'Master résumé', ?, ?, ?, ?, ?, ?, ?, 'draft')`
    ).run(
      randomUUID(),
      resumeId,
      targetRole ?? null,
      targetCompany ?? null,
      analysis.atsScore,
      JSON.stringify(analysis.bullets),
      JSON.stringify(analysis.keywordHave),
      JSON.stringify(analysis.keywordMissing),
      analysis.recruiterTip
    );

    db.prepare(
      `UPDATE profile SET onboarding_stage = 'results', target_comp_min = ?, target_comp_max = ?, target_currency = ? WHERE id = 1`
    ).run(analysis.targetCompMin, analysis.targetCompMax, analysis.targetCurrency);

    const careerHealth = { resume: Math.max(0, Math.min(100, analysis.atsScore)), pipeline: 20, interview: 10 };
    res.json({ resumeId, ...analysis, careerHealth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const tailorSchema = {
  type: 'object',
  properties: {
    atsScore: { type: 'integer' },
    keywordHave: { type: 'array', items: { type: 'string' } },
    keywordMissing: { type: 'array', items: { type: 'string' } },
    recruiterTip: { type: 'string' },
    bullets: {
      type: 'array',
      items: {
        type: 'object',
        properties: { original: { type: 'string' }, rewrite: { type: 'string' } },
        required: ['original', 'rewrite'],
      },
    },
  },
  required: ['atsScore', 'keywordHave', 'keywordMissing', 'recruiterTip', 'bullets'],
};

resumeRouter.post('/tailor', async (req, res) => {
  try {
    const { targetRole, targetCompany, jobDescription } = req.body;
    if (!targetRole || !targetCompany) {
      return res.status(400).json({ error: 'targetRole and targetCompany are required.' });
    }

    const master = db.prepare('SELECT * FROM resumes WHERE is_master = 1 ORDER BY created_at DESC LIMIT 1').get();
    if (!master) {
      return res.status(400).json({ error: 'Upload a résumé before tailoring a version.' });
    }

    const prompt = `You are an expert résumé writer tailoring a candidate's master résumé for one specific job.

Target role: "${targetRole}" at "${targetCompany}".
${jobDescription ? `Job description:\n"""${jobDescription.slice(0, 4000)}"""\n` : ''}

Master résumé:
"""
${master.raw_text.slice(0, 10000)}
"""

Return:
- atsScore: 0-100 realistic ATS match score for this résumé against this specific role.
- keywordHave: up to 6 keywords from the résumé that match this role.
- keywordMissing: up to 5 important keywords for this role that are missing from the résumé.
- recruiterTip: one sharp, specific sentence of advice for landing this exact role.
- bullets: up to 4 achievement bullets, each with "original" and a "rewrite" reframed specifically for this role/company.`;

    const tailored = await geminiJSON(prompt, tailorSchema);

    const id = randomUUID();
    db.prepare(
      `INSERT INTO resume_versions (id, resume_id, name, target_role, target_company, ats_score, bullets, keyword_have, keyword_missing, recruiter_tip, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tailoring')`
    ).run(
      id,
      master.id,
      `${targetCompany} — ${targetRole}`,
      targetRole,
      targetCompany,
      tailored.atsScore,
      JSON.stringify(tailored.bullets),
      JSON.stringify(tailored.keywordHave),
      JSON.stringify(tailored.keywordMissing),
      tailored.recruiterTip
    );

    const version = db.prepare('SELECT * FROM resume_versions WHERE id = ?').get(id);
    res.json(serializeVersion(version));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

resumeRouter.get('/master', (_req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE is_master = 1 ORDER BY created_at DESC LIMIT 1').get();
  if (!resume) return res.json(null);
  res.json({
    ...resume,
    parsed: JSON.parse(resume.parsed),
    keyword_have: JSON.parse(resume.keyword_have),
    keyword_missing: JSON.parse(resume.keyword_missing),
  });
});

resumeRouter.get('/versions', (_req, res) => {
  const rows = db.prepare('SELECT * FROM resume_versions ORDER BY created_at DESC').all();
  res.json(rows.map(serializeVersion));
});

function serializeVersion(row) {
  return {
    ...row,
    bullets: JSON.parse(row.bullets),
    keyword_have: JSON.parse(row.keyword_have),
    keyword_missing: JSON.parse(row.keyword_missing),
  };
}
