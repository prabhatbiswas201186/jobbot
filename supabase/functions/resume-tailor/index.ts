import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiJSON } from '../_shared/gemini.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

interface TailorRequest {
  targetRole: string;
  targetCompany: string;
  jobDescription?: string;
}

const schema = {
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

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);
    const body: TailorRequest = await req.json();
    if (!body.targetRole || !body.targetCompany) {
      return new Response(JSON.stringify({ error: 'targetRole and targetCompany are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: master, error: masterErr } = await adminClient
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_master', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (masterErr) throw masterErr;
    if (!master) {
      return new Response(JSON.stringify({ error: 'Upload a résumé before tailoring a version.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an expert résumé writer tailoring a candidate's master résumé for one specific job.

Target role: "${body.targetRole}" at "${body.targetCompany}".
${body.jobDescription ? `Job description:\n"""${body.jobDescription.slice(0, 4000)}"""\n` : ''}

Master résumé:
"""
${master.raw_text.slice(0, 10000)}
"""

Return:
- atsScore: 0-100 realistic ATS match score for this résumé against this specific role.
- keywordHave: up to 6 keywords from the résumé that match this role.
- keywordMissing: up to 5 important keywords for this role that are missing from the résumé.
- recruiterTip: one sharp, specific sentence of advice for landing this exact role.
- bullets: up to 4 achievement bullets, each with "original" and a "rewrite" reframed specifically to resonate with this role/company.`;

    const tailored = await geminiJSON<{
      atsScore: number;
      keywordHave: string[];
      keywordMissing: string[];
      recruiterTip: string;
      bullets: { original: string; rewrite: string }[];
    }>(prompt, schema);

    const { data: version, error: versionErr } = await adminClient
      .from('resume_versions')
      .insert({
        user_id: user.id,
        resume_id: master.id,
        name: `${body.targetCompany} — ${body.targetRole}`,
        target_role: body.targetRole,
        target_company: body.targetCompany,
        ats_score: tailored.atsScore,
        bullets: tailored.bullets,
        keyword_have: tailored.keywordHave,
        keyword_missing: tailored.keywordMissing,
        recruiter_tip: tailored.recruiterTip,
        status: 'tailoring',
      })
      .select()
      .single();
    if (versionErr) throw versionErr;

    return new Response(JSON.stringify(version), {
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
