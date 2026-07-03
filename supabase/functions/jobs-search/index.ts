import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

interface SearchRequest {
  query: string;
  location?: string;
}

function mapRegion(countryCode: string | null | undefined): string {
  const c = (countryCode || '').toUpperCase();
  if (c === 'IN') return 'india';
  if (c === 'AE') return 'uae';
  if (c === 'SA') return 'saudi';
  return 'remote-intl';
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    await requireUser(req);

    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Live search is not configured yet — the RAPIDAPI_KEY secret is missing on the server.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SearchRequest = await req.json();
    const query = (body.query || '').trim();
    const location = (body.location || '').trim();
    if (!query) {
      return new Response(JSON.stringify({ error: 'Enter a role to search for.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullQuery = location ? `${query} in ${location}` : query;
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(fullQuery)}&page=1&num_pages=1`;
    const jsRes = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    });
    if (!jsRes.ok) {
      const errBody = await jsRes.text();
      throw new Error(`JSearch request failed (${jsRes.status}): ${errBody.slice(0, 300)}`);
    }
    const payload = await jsRes.json();
    const results: Record<string, unknown>[] = Array.isArray(payload.data) ? payload.data : [];

    // Replace previous live-search results so the list stays focused on the
    // latest search. Their match scores cascade-delete with the job rows.
    const { error: delErr } = await adminClient.from('jobs').delete().eq('source', 'jsearch');
    if (delErr) throw delErr;

    const rows = results.map((r) => ({
      source: 'jsearch',
      external_id: (r.job_id as string) ?? crypto.randomUUID(),
      role: (r.job_title as string) ?? 'Untitled role',
      company: (r.employer_name as string) ?? 'Unknown company',
      logo_text: initials(r.employer_name as string),
      location:
        [r.job_city, r.job_country].filter(Boolean).join(', ') || (r.job_is_remote ? 'Remote' : 'N/A'),
      region: r.job_is_remote ? 'remote-intl' : mapRegion(r.job_country as string),
      tags: [r.job_employment_type, r.job_is_remote ? 'Remote' : null].filter(Boolean) as string[],
      salary_min: (r.job_min_salary as number) ?? null,
      salary_max: (r.job_max_salary as number) ?? null,
      currency: (r.job_salary_currency as string) ?? 'USD',
      url: (r.job_apply_link as string) ?? (r.job_google_link as string) ?? null,
      description: (r.job_description as string)?.slice(0, 4000) ?? null,
      posted_at: (r.job_posted_at_datetime_utc as string) ?? new Date().toISOString(),
    }));

    if (rows.length) {
      const { error: insErr } = await adminClient
        .from('jobs')
        .upsert(rows, { onConflict: 'source,external_id' });
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ count: rows.length, query: fullQuery }), {
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
