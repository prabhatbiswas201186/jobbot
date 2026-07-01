import { Router } from 'express';
import { data, save, randomUUID } from '../store.js';

export const applicationsRouter = Router();

applicationsRouter.get('/', (_req, res) => {
  const apps = [...data.applications].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  res.json(apps);
});

applicationsRouter.post('/', (req, res) => {
  const { job_id, role, company, logo_text, stage, tag, tag_color, source, offer_amount } = req.body;
  const now = new Date().toISOString();
  const app = {
    id: randomUUID(),
    job_id: job_id ?? null,
    role,
    company,
    logo_text: logo_text ?? '',
    stage: stage ?? 'applied',
    tag: tag ?? null,
    tag_color: tag_color ?? null,
    source: source ?? 'manual',
    offer_amount: offer_amount ?? null,
    applied_at: now,
    updated_at: now,
  };
  data.applications.push(app);
  save();
  res.json(app);
});

applicationsRouter.patch('/:id', (req, res) => {
  const app = data.applications.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  app.stage = req.body.stage;
  app.updated_at = new Date().toISOString();
  save();
  res.json(app);
});

export const interviewsRouter = Router();

interviewsRouter.get('/upcoming', (_req, res) => {
  const upcoming = data.interviews
    .filter((i) => i.status === 'scheduled')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  res.json(upcoming);
});
