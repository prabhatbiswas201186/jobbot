// copilot-chat — self-contained build for dashboard paste (shared code inlined).
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
interface ChatRequest {
  message?: string; // omit to just get a proactive insight + greeting
}

const chatSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    insightTitle: { type: 'string' },
    insightBody: { type: 'string' },
    ctaLabel: { type: 'string' },
  },
  required: ['reply'],
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);
    const body: ChatRequest = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const [{ data: profile }, { data: applications }, { data: interviews }, { data: resumeVersions }] =
      await Promise.all([
        adminClient.from('profiles').select('*').eq('id', user.id).single(),
        adminClient.from('applications').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
        adminClient
          .from('interviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(5),
        adminClient.from('resume_versions').select('name,target_company,ats_score,status').eq('user_id', user.id),
      ]);

    const byStage: Record<string, number> = {};
    for (const a of applications ?? []) byStage[a.stage] = (byStage[a.stage] ?? 0) + 1;

    const staleFollowUps = (applications ?? []).filter((a) => {
      const days = (Date.now() - new Date(a.updated_at).getTime()) / 86400000;
      return a.stage === 'screening' && days >= 3;
    });

    const dataSummary = `User: ${profile?.full_name || 'the candidate'}.
Pipeline by stage: ${JSON.stringify(byStage)}.
Upcoming interviews: ${(interviews ?? []).map((i) => `${i.company} (${i.role}) on ${i.scheduled_at}`).join('; ') || 'none'}.
Résumé versions: ${(resumeVersions ?? []).map((r) => `${r.name} for ${r.target_company ?? 'general'} — ATS ${r.ats_score}, status ${r.status}`).join('; ') || 'none yet'}.
Applications gone quiet 3+ days in screening: ${staleFollowUps.map((a) => `${a.company} (${a.role})`).join('; ') || 'none'}.`;

    const { data: history } = await adminClient
      .from('copilot_messages')
      .select('role,content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    const recentHistory = (history ?? []).reverse().map((m) => `${m.role}: ${m.content}`).join('\n');

    const prompt = body.message
      ? `You are JobBot, a proactive AI career co-pilot embedded in the user's job search dashboard. Be warm, concise (2-4 sentences), and specific — reference their real pipeline data below when relevant. Never invent facts not implied by the data.

Real pipeline data:
${dataSummary}

Recent conversation:
${recentHistory || '(none yet)'}

User just said: "${body.message}"

Reply as JobBot. Only set insightTitle/insightBody/ctaLabel if you're surfacing a new proactive insight worth a highlighted card; otherwise omit them.`
      : `You are JobBot, a proactive AI career co-pilot. Based on the real pipeline data below, write a short, warm greeting (1-2 sentences) that references something concrete and true from the data, and ask if you should act on it. Also produce one proactive insight (title + body + a short CTA button label) surfacing the single most useful/urgent thing for the user right now — if nothing stands out, make insightTitle/insightBody encouraging but still grounded in the real numbers.

Real pipeline data:
${dataSummary}`;

    const result = await geminiJSON<{
      reply: string;
      insightTitle?: string;
      insightBody?: string;
      ctaLabel?: string;
    }>(prompt, chatSchema);

    const rows = [];
    if (body.message) {
      rows.push({ user_id: user.id, role: 'user', content: body.message, is_insight: false });
    }
    rows.push({
      user_id: user.id,
      role: 'assistant',
      content: result.reply,
      is_insight: Boolean(result.insightTitle),
      cta_label: result.ctaLabel ?? null,
    });
    await adminClient.from('copilot_messages').insert(rows);

    return new Response(JSON.stringify(result), {
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
