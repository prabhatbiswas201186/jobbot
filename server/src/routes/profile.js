import { Router } from 'express';
import { db } from '../db.js';

export const profileRouter = Router();

profileRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get());
});

profileRouter.patch('/', (req, res) => {
  const { full_name } = req.body;
  if (full_name !== undefined) {
    db.prepare('UPDATE profile SET full_name = ? WHERE id = 1').run(full_name);
  }
  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get());
});
