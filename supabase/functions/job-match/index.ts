import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiJSON } from '../_shared/gemini.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

interface JobMatchRequest {
  region?: 'india' | 'uae' | 'saudi' | 'remote-intl';
}

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

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);
    const body: JobMatchRequest = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const { data: resume } = await adminClient
      .from('resumes')
      .select('keyword_have, parsed, ats_score')
      .eq('user_id', user.id)
      .eq('is_master', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let jobsQuery = adminClient.from('jobs').select('id, role, company, location, region, tags').limit(30);
    if (body.region) jobsQuery = jobsQuery.eq('region', body.region);
    const { data: jobs, error: jobsErr } = await jobsQuery;
    if (jobsErr) throw jobsErr;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const skills = resume?.keyword_have?.length
      ? resume.keyword_have
      : (resume?.parsed as { skillGaps?: string[] } | null)?.skillGaps ?? [];

    const prompt = `You are a job-matching engine. Given a candidate's résumé skills/keywords and a list of open jobs, score how well the candidate fits each job from 0-100 based on skill/role overlap, and list which of the candidate's keywords matched.

Candidate keywords/skills: ${skills.length ? JSON.stringify(skills) : '(no résumé uploaded yet — score generously based on role seniority alone, 55-75 range)'}

Jobs:
${jobs.map((j) => `- id="${j.id}" role="${j.role}" company="${j.company}" tags=${JSON.stringify(j.tags)}`).join('\n')}

Return one entry per job id in "matches".`;

    const { matches } = await geminiJSON<{
      matches: { jobId: string; score: number; matchedKeywords: string[] }[];
    }>(prompt, matchSchema);

    const rows = matches
      .filter((m) => jobs.some((j) => j.id === m.jobId))
      .map((m) => ({
        user_id: user.id,
        job_id: m.jobId,
        match_score: Math.max(0, Math.min(100, m.score)),
        matched_keywords: m.matchedKeywords,
      }));

    if (rows.length) {
      const { error: upsertErr } = await adminClient
        .from('job_matches')
        .upsert(rows, { onConflict: 'user_id,job_id' });
      if (upsertErr) throw upsertErr;
    }

    return new Response(JSON.stringify({ matches: rows }), {
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
