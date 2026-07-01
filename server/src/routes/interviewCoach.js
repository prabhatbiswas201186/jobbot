import { Router } from 'express';
import { data, save, randomUUID } from '../store.js';
import { geminiJSON } from '../gemini.js';

export const interviewCoachRouter = Router();

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

interviewCoachRouter.post('/question-bank', async (req, res) => {
  try {
    const { targetRole, targetCompany } = req.body || {};
    const prompt = `Generate a tailored interview question bank for a candidate interviewing for "${
      targetRole ?? 'a Product Manager role'
    }"${targetCompany ? ` at ${targetCompany}` : ''}.
Return 5 questions, each tagged with one of: BEHAV, PRODUCT, METRICS, LEAD, TECH. Mix the tags — don't repeat a tag more than twice.`;
    const result = await geminiJSON(prompt, questionBankSchema);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

interviewCoachRouter.post('/score', async (req, res) => {
  try {
    const { question, answerText, interviewId } = req.body;
    if (!question || !answerText || answerText.trim().length < 10) {
      return res.status(400).json({ error: 'question and answerText are required.' });
    }

    const prompt = `You are a behavioral interview coach grading a candidate's spoken/written answer using the STAR method (Situation, Task, Action, Result).

Question: "${question}"
Candidate's answer:
"""
${answerText.slice(0, 6000)}
"""

Return:
- structureScore: 0-100, how well the answer follows Situation → Task → Action → Result.
- specificityScore: 0-100, how concrete/quantified vs vague the answer is.
- fillerWordCount: estimated count of filler words/hedging phrases ("um", "like", "sort of", "I guess", etc) — 0 if written text has none.
- readinessScore: 0-100 overall interview readiness signal from this single answer.
- feedback: 1-2 sentences of direct, specific coaching feedback.
- star: break the candidate's answer into 4 objects with key one of "S","T","A","R" and text summarizing that part in <18 words (if a part is missing, say so briefly).`;

    const scored = await geminiJSON(prompt, scoreSchema);

    data.mock_sessions.push({
      id: randomUUID(),
      interview_id: interviewId ?? null,
      question,
      answer_text: answerText,
      structure_score: scored.structureScore,
      specificity_score: scored.specificityScore,
      filler_word_count: scored.fillerWordCount,
      readiness_score: scored.readinessScore,
      feedback: scored.feedback,
      created_at: new Date().toISOString(),
    });

    const starMap = Object.fromEntries(scored.star.map((s) => [s.key.toUpperCase(), s.text]));
    const existing = data.star_answers.find((s) => s.question === question);
    const fields = { situation: starMap.S ?? null, task: starMap.T ?? null, action: starMap.A ?? null, result: starMap.R ?? null, updated_at: new Date().toISOString() };
    if (existing) {
      Object.assign(existing, fields);
    } else {
      data.star_answers.push({ id: randomUUID(), question, ...fields });
    }
    save();

    res.json(scored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

interviewCoachRouter.get('/star-answers', (_req, res) => {
  res.json(data.star_answers);
});

interviewCoachRouter.get('/latest-mock', (_req, res) => {
  const latest = [...data.mock_sessions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  res.json(latest ?? null);
});
