// negotiation — self-contained build for dashboard paste (shared code inlined).
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
interface NegotiationRequest {
  applicationId: string;
}

const schema = {
  type: 'object',
  properties: {
    marketVerdict: { type: 'string' },
    counterOffer: { type: 'integer' },
    currency: { type: 'string' },
    script: { type: 'array', items: { type: 'string' } },
    emailDraft: { type: 'string' },
    leveragePoints: { type: 'array', items: { type: 'string' } },
  },
  required: ['marketVerdict', 'counterOffer', 'currency', 'script', 'emailDraft', 'leveragePoints'],
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);
    const body: NegotiationRequest = await req.json();
    if (!body.applicationId) {
      return new Response(JSON.stringify({ error: 'applicationId is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: offer }, { data: allOffers }, { data: profile }, { data: resume }] = await Promise.all([
      adminClient.from('applications').select('*').eq('id', body.applicationId).eq('user_id', user.id).single(),
      adminClient.from('applications').select('company, role, offer_amount').eq('user_id', user.id).eq('stage', 'offer'),
      adminClient.from('profiles').select('*').eq('id', user.id).single(),
      adminClient
        .from('resumes')
        .select('raw_text, keyword_have')
        .eq('user_id', user.id)
        .eq('is_master', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!offer) {
      return new Response(JSON.stringify({ error: 'Offer not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const otherOffers = (allOffers ?? []).filter((o) => o.offer_amount && o.company !== offer.company);

    const prompt = `You are a salary negotiation expert coaching a candidate through a real offer.

The offer being negotiated:
- Role: ${offer.role} at ${offer.company}
- Offer amount: ${offer.offer_amount ?? 'not disclosed yet'} per year

Candidate context:
- Target compensation: ${profile?.target_comp_min ?? '?'}-${profile?.target_comp_max ?? '?'} ${profile?.target_currency ?? ''}
- Competing offers on the table: ${otherOffers.length ? otherOffers.map((o) => `${o.company} (${o.offer_amount})`).join(', ') : 'none'}
- Key skills from resume: ${resume?.keyword_have?.join(', ') ?? 'n/a'}
${resume?.raw_text ? `- Resume excerpt:\n"""${resume.raw_text.slice(0, 3000)}"""` : ''}

Return:
- marketVerdict: 1-2 sentences — is this offer at, below, or above market for this role, and by roughly how much.
- counterOffer: a single specific number to counter with (same currency as the offer; ambitious but defensible).
- currency: the currency of that number (e.g. "INR", "USD", "AED").
- script: 4-6 short lines the candidate can literally say on the negotiation call, in order.
- emailDraft: a complete, ready-to-send counter-offer email (professional, warm, specific).
- leveragePoints: 3-5 bullet points of the candidate's strongest leverage in this negotiation.`;

    const plan = await geminiJSON<{
      marketVerdict: string;
      counterOffer: number;
      currency: string;
      script: string[];
      emailDraft: string;
      leveragePoints: string[];
    }>(prompt, schema);

    return new Response(JSON.stringify(plan), {
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
