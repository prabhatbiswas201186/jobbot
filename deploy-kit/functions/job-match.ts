// job-match — self-contained build for dashboard paste (shared code inlined).
import { createClient, type User } from 'jsr:@supabase/supabase-js@2';

// ---- shared: CORS ----
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

// ---- shared: auth/admin client ----
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Service-role client for server-side reads/writes (bypasses RLS —
 * only ever used after the caller's JWT has been verified below).
 */
export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * Verifies the caller's JWT from the Authorization header and returns
 * their auth.users row. Throws if missing/invalid.
 */
export async function requireUser(req: Request): Promise<User> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    throw new Error('Missing Authorization bearer token.');
  }
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Invalid or expired session.');
  }
  return data.user;
}

// ---- shared: Gemini helper (with retry) ----
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const RETRYABLE_STATUS = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini's generateContent with a JSON response schema and returns the
 * parsed object. Retries transient failures (429/500/503) with backoff.
 */
export async function geminiJSON<T>(prompt: string, schema: unknown): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured for this function.');
  }

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.4,
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned no content.');
      return JSON.parse(text) as T;
    }

    const body = await res.text();
    lastError = new Error(`Gemini request failed (${res.status}): ${body}`);

    if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw lastError;
    }
    await sleep(2 ** attempt * 500); // 1s, 2s, 4s
  }
  throw lastError;
}

// ---- function ----
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
