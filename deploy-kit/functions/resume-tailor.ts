// resume-tailor — self-contained build for dashboard paste (shared code inlined).
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
