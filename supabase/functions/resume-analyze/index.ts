import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiJSON } from '../_shared/gemini.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

interface AnalyzeRequest {
  resumeText: string;
  fileName?: string;
  targetRole?: string;
  targetCompany?: string;
}

interface AnalyzeResult {
  atsScore: number;
  careerHealth: { resume: number; pipeline: number; interview: number };
  keywordHave: string[];
  keywordMissing: string[];
  recruiterTip: string;
  targetCompMin: number;
  targetCompMax: number;
  targetCurrency: string;
  roles: { title: string; company: string; period: string }[];
  bullets: { original: string; rewrite: string }[];
  skillGaps: string[];
}

const schema = {
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
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          period: { type: 'string' },
        },
        required: ['title', 'company', 'period'],
      },
    },
    bullets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          rewrite: { type: 'string' },
        },
        required: ['original', 'rewrite'],
      },
    },
    skillGaps: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'atsScore', 'keywordHave', 'keywordMissing', 'recruiterTip',
    'targetCompMin', 'targetCompMax', 'targetCurrency', 'roles', 'bullets', 'skillGaps',
  ],
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);
    const body: AnalyzeRequest = await req.json();
    if (!body.resumeText || body.resumeText.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'resumeText is required and must be substantial.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an expert technical recruiter and ATS (Applicant Tracking System) auditor.
Analyze the following resume${body.targetRole ? ` for the target role "${body.targetRole}"${body.targetCompany ? ` at ${body.targetCompany}` : ''}` : ''}.

Return:
- atsScore: 0-100 realistic ATS match score for this resume as-is.
- keywordHave: up to 6 strong keywords/skills clearly present.
- keywordMissing: up to 5 important keywords/skills missing for this kind of role.
- recruiterTip: one sharp, specific, actionable sentence a recruiter would give.
- targetCompMin/targetCompMax: a realistic annual base salary range in USD for this person's level/role.
- targetCurrency: "USD".
- roles: the distinct roles/companies/periods found in the resume (chronological, most recent first, max 4).
- bullets: up to 4 achievement bullets from the resume, each with "original" (as written) and "rewrite" (a punchier, quantified, ATS-optimized rewrite). If a bullet already has strong metrics, rewrite can polish it further.
- skillGaps: up to 6 skills this person should learn/highlight to be more competitive.

Resume:
"""
${body.resumeText.slice(0, 12000)}
"""`;

    const analysis = await geminiJSON<Omit<AnalyzeResult, 'careerHealth'>>(prompt, schema);

    const careerHealth = {
      resume: Math.max(0, Math.min(100, analysis.atsScore)),
      pipeline: 20, // fresh account, no applications yet
      interview: 10, // fresh account, no mock sessions yet
    };

    // Persist as the user's master résumé.
    const { data: resumeRow, error: resumeErr } = await adminClient
      .from('resumes')
      .insert({
        user_id: user.id,
        file_name: body.fileName ?? null,
        raw_text: body.resumeText,
        parsed: { roles: analysis.roles, bullets: analysis.bullets, skillGaps: analysis.skillGaps },
        ats_score: analysis.atsScore,
        keyword_have: analysis.keywordHave,
        keyword_missing: analysis.keywordMissing,
        recruiter_tip: analysis.recruiterTip,
        is_master: true,
      })
      .select()
      .single();
    if (resumeErr) throw resumeErr;

    const { error: versionErr } = await adminClient.from('resume_versions').insert({
      user_id: user.id,
      resume_id: resumeRow.id,
      name: 'Master résumé',
      target_role: body.targetRole ?? null,
      target_company: body.targetCompany ?? null,
      ats_score: analysis.atsScore,
      bullets: analysis.bullets,
      keyword_have: analysis.keywordHave,
      keyword_missing: analysis.keywordMissing,
      recruiter_tip: analysis.recruiterTip,
      status: 'draft',
    });
    if (versionErr) throw versionErr;

    await adminClient
      .from('profiles')
      .update({
        onboarding_stage: 'results',
        target_comp_min: analysis.targetCompMin,
        target_comp_max: analysis.targetCompMax,
        target_currency: analysis.targetCurrency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    const result: AnalyzeResult = { ...analysis, careerHealth };
    return new Response(JSON.stringify({ resumeId: resumeRow.id, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
