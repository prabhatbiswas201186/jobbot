// career-path — self-contained build for dashboard paste (shared code inlined).
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
const schema = {
  type: 'object',
  properties: {
    paths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          timeline: { type: 'string' },
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, when: { type: 'string' } },
              required: ['label', 'when'],
            },
          },
        },
        required: ['title', 'summary', 'timeline', 'milestones'],
      },
    },
    skillRoadmap: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          why: { type: 'string' },
          resource: { type: 'string' },
        },
        required: ['skill', 'why', 'resource'],
      },
    },
  },
  required: ['paths', 'skillRoadmap'],
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);

    const { data: resume } = await adminClient
      .from('resumes')
      .select('raw_text, parsed, keyword_have')
      .eq('user_id', user.id)
      .eq('is_master', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resume) {
      return new Response(JSON.stringify({ error: 'Upload a resume first — the career map is built from it.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = resume.parsed as { roles?: unknown[]; skillGaps?: string[] } | null;
    const skillGaps: string[] = parsed?.skillGaps ?? [];

    const prompt = `You are a career strategist. Based on this candidate's resume, map their realistic career future.

Resume:
"""
${resume.raw_text.slice(0, 8000)}
"""
Known skill gaps: ${skillGaps.join(', ') || 'none identified'}
Strong skills: ${resume.keyword_have?.join(', ') ?? 'n/a'}

Return:
- paths: 3 distinct realistic career paths from where they are today. Each has:
  - title (e.g. "Group PM -> Director of Product"),
  - summary (2 sentences: what this path looks like and who it suits),
  - timeline (e.g. "2-4 years"),
  - milestones: 3-4 concrete steps with "label" and "when" (e.g. "6 months").
- skillRoadmap: 5-7 skills to build, each with "skill", "why" (one sharp sentence
  tied to their profile), and "resource" (a specific, real course/book/practice
  suggestion).`;

    const result = await geminiJSON<{
      paths: unknown[];
      skillRoadmap: { skill: string; why: string; resource: string }[];
    }>(prompt, schema);

    const roadmapWithDone = result.skillRoadmap.map((s) => ({ ...s, done: false }));

    // One cached career path per user — regenerate replaces it.
    await adminClient.from('career_paths').delete().eq('user_id', user.id);
    const { data: row, error: insErr } = await adminClient
      .from('career_paths')
      .insert({ user_id: user.id, paths: result.paths, skill_roadmap: roadmapWithDone })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify(row), {
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
