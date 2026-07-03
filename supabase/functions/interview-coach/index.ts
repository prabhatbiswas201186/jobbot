import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiJSON } from '../_shared/gemini.ts';
import { adminClient, requireUser } from '../_shared/authClient.ts';

interface CoachRequest {
  mode: 'score_answer' | 'question_bank';
  question?: string;
  answerText?: string;
  targetRole?: string;
  targetCompany?: string;
  interviewId?: string;
}

const scoreSchema = {
  type: 'object',
  properties: {
    structureScore: { type: 'integer' },
    specificityScore: { type: 'integer' },
    fillerWordCount: { type: 'integer' },
    readinessScore: { type: 'integer' },
    feedback: { type: 'string' },
    star: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, text: { type: 'string' } },
        required: ['key', 'text'],
      },
    },
  },
  required: ['structureScore', 'specificityScore', 'fillerWordCount', 'readinessScore', 'feedback', 'star'],
};

const questionBankSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string', enum: ['BEHAV', 'PRODUCT', 'METRICS', 'LEAD', 'TECH'] },
          question: { type: 'string' },
        },
        required: ['tag', 'question'],
      },
    },
  },
  required: ['questions'],
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const user = await requireUser(req);
    const body: CoachRequest = await req.json();

    if (body.mode === 'question_bank') {
      const prompt = `Generate a tailored interview question bank for a candidate interviewing for "${
        body.targetRole ?? 'a Product Manager role'
      }"${body.targetCompany ? ` at ${body.targetCompany}` : ''}.
Return 5 questions, each tagged with one of: BEHAV, PRODUCT, METRICS, LEAD, TECH. Mix the tags — don't repeat a tag more than twice.`;
      const result = await geminiJSON<{ questions: { tag: string; question: string }[] }>(
        prompt,
        questionBankSchema
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // mode === 'score_answer'
    if (!body.question || !body.answerText || body.answerText.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'question and answerText are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a behavioral interview coach grading a candidate's spoken/written answer using the STAR method (Situation, Task, Action, Result).

Question: "${body.question}"
Candidate's answer:
"""
${body.answerText.slice(0, 6000)}
"""

Return:
- structureScore: 0-100, how well the answer follows Situation → Task → Action → Result.
- specificityScore: 0-100, how concrete/quantified vs vague the answer is.
- fillerWordCount: estimated count of filler words/hedging phrases ("um", "like", "sort of", "I guess", etc) — 0 if written text has none.
- readinessScore: 0-100 overall interview readiness signal from this single answer.
- feedback: 1-2 sentences of direct, specific coaching feedback.
- star: break the candidate's answer into 4 objects with key one of "S","T","A","R" and text summarizing that part in <18 words (if a part is missing, say so briefly).`;

    const scored = await geminiJSON<{
      structureScore: number;
      specificityScore: number;
      fillerWordCount: number;
      readinessScore: number;
      feedback: string;
      star: { key: string; text: string }[];
    }>(prompt, scoreSchema);

    const { error: insertErr } = await adminClient.from('mock_sessions').insert({
      user_id: user.id,
      interview_id: body.interviewId ?? null,
      question: body.question,
      answer_text: body.answerText,
      structure_score: scored.structureScore,
      specificity_score: scored.specificityScore,
      filler_word_count: scored.fillerWordCount,
      readiness_score: scored.readinessScore,
      feedback: scored.feedback,
    });
    if (insertErr) throw insertErr;

    // Also save/refresh the STAR answer for this question.
    const starMap = Object.fromEntries(scored.star.map((s) => [s.key.toUpperCase(), s.text]));
    await adminClient.from('star_answers').upsert(
      {
        user_id: user.id,
        question: body.question,
        situation: starMap['S'] ?? null,
        task: starMap['T'] ?? null,
        action: starMap['A'] ?? null,
        result: starMap['R'] ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,question' }
    );

    return new Response(JSON.stringify(scored), {
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
