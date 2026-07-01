import { Router } from 'express';
import { data, save, randomUUID } from '../store.js';
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

    // A fresh analysis replaces any previous master résumé.
    for (const r of data.resumes) r.is_master = false;

    const resumeId = randomUUID();
    data.resumes.push({
      id: resumeId,
      file_name: fileName ?? null,
      raw_text: resumeText,
      parsed: { roles: analysis.roles, bullets: analysis.bullets, skillGaps: analysis.skillGaps },
      ats_score: analysis.atsScore,
      keyword_have: analysis.keywordHave,
      keyword_missing: analysis.keywordMissing,
      recruiter_tip: analysis.recruiterTip,
      is_master: true,
      created_at: new Date().toISOString(),
    });

    data.resume_versions.push({
      id: randomUUID(),
      resume_id: resumeId,
      name: 'Master résumé',
      target_role: targetRole ?? null,
      target_company: targetCompany ?? null,
      ats_score: analysis.atsScore,
      bullets: analysis.bullets,
      keyword_have: analysis.keywordHave,
      keyword_missing: analysis.keywordMissing,
      recruiter_tip: analysis.recruiterTip,
      status: 'draft',
      created_at: new Date().toISOString(),
    });

    data.profile.onboarding_stage = 'results';
    data.profile.target_comp_min = analysis.targetCompMin;
    data.profile.target_comp_max = analysis.targetCompMax;
    data.profile.target_currency = analysis.targetCurrency;
    save();

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

    const master = [...data.resumes].filter((r) => r.is_master).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
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

    const version = {
      id: randomUUID(),
      resume_id: master.id,
      name: `${targetCompany} — ${targetRole}`,
      target_role: targetRole,
      target_company: targetCompany,
      ats_score: tailored.atsScore,
      bullets: tailored.bullets,
      keyword_have: tailored.keywordHave,
      keyword_missing: tailored.keywordMissing,
      recruiter_tip: tailored.recruiterTip,
      status: 'tailoring',
      created_at: new Date().toISOString(),
    };
    data.resume_versions.push(version);
    save();

    res.json(version);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

resumeRouter.get('/master', (_req, res) => {
  const master = [...data.resumes].filter((r) => r.is_master).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  res.json(master ?? null);
});

resumeRouter.get('/versions', (_req, res) => {
  const versions = [...data.resume_versions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json(versions);
});
