import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiJSON } from '../_shared/gemini.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

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
