import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resumeRouter } from './routes/resume.js';
import { jobsRouter } from './routes/jobs.js';
import { applicationsRouter, interviewsRouter } from './routes/applications.js';
import { interviewCoachRouter } from './routes/interviewCoach.js';
import { copilotRouter } from './routes/copilot.js';
import { profileRouter } from './routes/profile.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/resume', resumeRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/interview-coach', interviewCoachRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/profile', profileRouter);

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`JobBot local server running on http://localhost:${PORT}`);
});
