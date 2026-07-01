import { Router } from 'express';
import { data, save, randomUUID } from '../store.js';
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
  const profile = data.profile;
  const applications = [...data.applications].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 20);
  const interviews = data.interviews
    .filter((i) => i.status === 'scheduled')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 5);
  const resumeVersions = data.resume_versions;

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
  const history = [...data.copilot_messages].slice(-10);
  const recentHistory = history.map((m) => `${m.role}: ${m.content}`).join('\n');

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

  if (message) {
    data.copilot_messages.push({ id: randomUUID(), role: 'user', content: message, is_insight: false, cta_label: null, created_at: new Date().toISOString() });
  }
  data.copilot_messages.push({
    id: randomUUID(),
    role: 'assistant',
    content: result.reply,
    is_insight: Boolean(result.insightTitle),
    cta_label: result.ctaLabel ?? null,
    created_at: new Date().toISOString(),
  });
  save();

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
  res.json(data.copilot_messages.slice(-50));
});
