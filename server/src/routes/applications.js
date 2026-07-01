import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

export const applicationsRouter = Router();

applicationsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM applications ORDER BY updated_at DESC').all();
  res.json(rows);
});

applicationsRouter.post('/', (req, res) => {
  const { job_id, role, company, logo_text, stage, tag, tag_color, source, offer_amount } = req.body;
  const id = randomUUID();
  db.prepare(
    `INSERT INTO applications (id, job_id, role, company, logo_text, stage, tag, tag_color, source, offer_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, job_id ?? null, role, company, logo_text ?? '', stage ?? 'applied', tag ?? null, tag_color ?? null, source ?? 'manual', offer_amount ?? null);
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(id));
});

applicationsRouter.patch('/:id', (req, res) => {
  const { stage } = req.body;
  db.prepare(`UPDATE applications SET stage = ?, updated_at = datetime('now') WHERE id = ?`).run(stage, req.params.id);
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
});

export const interviewsRouter = Router();

interviewsRouter.get('/upcoming', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM interviews WHERE status = 'scheduled' ORDER BY scheduled_at ASC`)
    .all();
  res.json(rows);
});
