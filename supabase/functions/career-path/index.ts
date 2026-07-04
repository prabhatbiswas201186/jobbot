import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiJSON } from '../_shared/gemini.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

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
