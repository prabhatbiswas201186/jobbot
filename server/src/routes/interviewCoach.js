import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
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

    db.prepare(
      `INSERT INTO mock_sessions (id, interview_id, question, answer_text, structure_score, specificity_score, filler_word_count, readiness_score, feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), interviewId ?? null, question, answerText, scored.structureScore, scored.specificityScore, scored.fillerWordCount, scored.readinessScore, scored.feedback);

    const starMap = Object.fromEntries(scored.star.map((s) => [s.key.toUpperCase(), s.text]));
    db.prepare(
      `INSERT INTO star_answers (id, question, situation, task, action, result)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(question) DO UPDATE SET situation = excluded.situation, task = excluded.task, action = excluded.action, result = excluded.result, updated_at = datetime('now')`
    ).run(randomUUID(), question, starMap.S ?? null, starMap.T ?? null, starMap.A ?? null, starMap.R ?? null);

    res.json(scored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

interviewCoachRouter.get('/star-answers', (_req, res) => {
  res.json(db.prepare('SELECT * FROM star_answers').all());
});

interviewCoachRouter.get('/latest-mock', (_req, res) => {
  const row = db.prepare('SELECT * FROM mock_sessions ORDER BY created_at DESC LIMIT 1').get();
  res.json(row ?? null);
});
