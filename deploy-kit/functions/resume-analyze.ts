// resume-analyze — self-contained build for dashboard paste (shared code inlined).
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
