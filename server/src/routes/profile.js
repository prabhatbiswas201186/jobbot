import { Router } from 'express';
import { data, save } from '../store.js';

export const profileRouter = Router();

profileRouter.get('/', (_req, res) => {
  res.json(data.profile);
});

profileRouter.patch('/', (req, res) => {
  if (req.body.full_name !== undefined) {
    data.profile.full_name = req.body.full_name;
    save();
  }
  res.json(data.profile);
});
