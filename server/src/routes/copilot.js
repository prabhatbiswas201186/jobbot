import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { geminiJSON } from '../gemini.js';

export const copilotRouter = Router();

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

function buildDataSummary() {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  const applications = db.prepare('SELECT * FROM applications ORDER BY updated_at DESC LIMIT 20').all();
  const interviews = db
    .prepare(`SELECT * FROM interviews WHERE status = 'scheduled' ORDER BY scheduled_at ASC LIMIT 5`)
    .all();
  const resumeVersions = db.prepare('SELECT name, target_company, ats_score, status FROM resume_versions').all();

  const byStage = {};
  for (const a of applications) byStage[a.stage] = (byStage[a.stage] ?? 0) + 1;

  const staleFollowUps = applications.filter((a) => {
    const days = (Date.now() - new Date(a.updated_at).getTime()) / 86400000;
    return a.stage === 'screening' && days >= 3;
  });

  return `User: ${profile.full_name || 'the candidate'}.
Pipeline by stage: ${JSON.stringify(byStage)}.
Upcoming interviews: ${interviews.map((i) => `${i.company} (${i.role}) on ${i.scheduled_at}`).join('; ') || 'none'}.
Résumé versions: ${resumeVersions.map((r) => `${r.name} for ${r.target_company ?? 'general'} — ATS ${r.ats_score}, status ${r.status}`).join('; ') || 'none yet'}.
Applications gone quiet 3+ days in screening: ${staleFollowUps.map((a) => `${a.company} (${a.role})`).join('; ') || 'none'}.`;
}

async function chat(message) {
  const dataSummary = buildDataSummary();
  const history = db.prepare('SELECT role, content FROM copilot_messages ORDER BY created_at DESC LIMIT 10').all();
  const recentHistory = history.reverse().map((m) => `${m.role}: ${m.content}`).join('\n');

  const prompt = message
    ? `You are JobBot, a proactive AI career co-pilot embedded in the user's job search dashboard. Be warm, concise (2-4 sentences), and specific — reference their real pipeline data below when relevant. Never invent facts not implied by the data.

Real pipeline data:
${dataSummary}

Recent conversation:
${recentHistory || '(none yet)'}

User just said: "${message}"

Reply as JobBot. Only set insightTitle/insightBody/ctaLabel if you're surfacing a new proactive insight worth a highlighted card; otherwise omit them.`
    : `You are JobBot, a proactive AI career co-pilot. Based on the real pipeline data below, write a short, warm greeting (1-2 sentences) that references something concrete and true from the data, and ask if you should act on it. Also produce one proactive insight (title + body + a short CTA button label) surfacing the single most useful/urgent thing for the user right now — if nothing stands out, make insightTitle/insightBody encouraging but still grounded in the real numbers.

Real pipeline data:
${dataSummary}`;

  const result = await geminiJSON(prompt, chatSchema);

  const insertMsg = db.prepare(
    'INSERT INTO copilot_messages (id, role, content, is_insight, cta_label) VALUES (?, ?, ?, ?, ?)'
  );
  if (message) insertMsg.run(randomUUID(), 'user', message, 0, null);
  insertMsg.run(randomUUID(), 'assistant', result.reply, result.insightTitle ? 1 : 0, result.ctaLabel ?? null);

  return result;
}

copilotRouter.get('/greeting', async (_req, res) => {
  try {
    res.json(await chat(null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

copilotRouter.post('/message', async (req, res) => {
  try {
    res.json(await chat(req.body.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

copilotRouter.get('/history', (_req, res) => {
  res.json(db.prepare('SELECT * FROM copilot_messages ORDER BY created_at ASC LIMIT 50').all());
});
