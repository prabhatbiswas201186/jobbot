import type {
  Application,
  ApplicationStage,
  CopilotMessage,
  Interview,
  JobRegion,
  JobWithMatch,
  MockSession,
  Profile,
  Resume,
  ResumeVersion,
  StarAnswer,
} from '../types';

const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Request to ${path} failed (${res.status})`);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export function getProfile() {
  return request<Profile>('/profile');
}

export function updateProfile(input: { full_name?: string }) {
  return request<Profile>('/profile', { method: 'PATCH', body: JSON.stringify(input) });
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export interface AnalyzeResumeResult {
  resumeId: string;
  atsScore: number;
  careerHealth: { resume: number; pipeline: number; interview: number };
  keywordHave: string[];
  keywordMissing: string[];
  recruiterTip: string;
  targetCompMin: number;
  targetCompMax: number;
  targetCurrency: string;
  roles: { title: string; company: string; period: string }[];
  bullets: { original: string; rewrite: string }[];
  skillGaps: string[];
}

export function analyzeResume(input: { resumeText: string; fileName?: string; targetRole?: string; targetCompany?: string }) {
  return request<AnalyzeResumeResult>('/resume/analyze', { method: 'POST', body: JSON.stringify(input) });
}

export function tailorResume(input: { targetRole: string; targetCompany: string; jobDescription?: string }) {
  return request<ResumeVersion>('/resume/tailor', { method: 'POST', body: JSON.stringify(input) });
}

export function getMasterResume() {
  return request<Resume | null>('/resume/master');
}

export function listResumeVersions() {
  return request<ResumeVersion[]>('/resume/versions');
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export function listJobsWithMatches(region?: JobRegion) {
  const qs = region ? `?region=${encodeURIComponent(region)}` : '';
  return request<JobWithMatch[]>(`/jobs${qs}`);
}

export function computeJobMatches(region?: JobRegion) {
  return request<{ matches: { jobId: string; score: number; matchedKeywords: string[] }[] }>('/jobs/match', {
    method: 'POST',
    body: JSON.stringify(region ? { region } : {}),
  });
}

export function searchLiveJobs(input: { query: string; location?: string }) {
  return request<{ count: number; query: string }>('/jobs/search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Applications / pipeline
// ---------------------------------------------------------------------------
export function listApplications() {
  return request<Application[]>('/applications');
}

export function createApplication(input: Omit<Application, 'id' | 'applied_at' | 'updated_at'>) {
  return request<Application>('/applications', { method: 'POST', body: JSON.stringify(input) });
}

export function updateApplicationStage(id: string, stage: ApplicationStage) {
  return request<Application>(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------
export function listUpcomingInterviews() {
  return request<Interview[]>('/interviews/upcoming');
}

// ---------------------------------------------------------------------------
// Interview coach
// ---------------------------------------------------------------------------
export function getQuestionBank(input: { targetRole?: string; targetCompany?: string }) {
  return request<{ questions: { tag: string; question: string }[] }>('/interview-coach/question-bank', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface ScoreAnswerResult {
  structureScore: number;
  specificityScore: number;
  fillerWordCount: number;
  readinessScore: number;
  feedback: string;
  star: { key: string; text: string }[];
}

export function scoreMockAnswer(input: { question: string; answerText: string; interviewId?: string }) {
  return request<ScoreAnswerResult>('/interview-coach/score', { method: 'POST', body: JSON.stringify(input) });
}

export function listStarAnswers() {
  return request<StarAnswer[]>('/interview-coach/star-answers');
}

export function latestMockSession() {
  return request<MockSession | null>('/interview-coach/latest-mock');
}

// ---------------------------------------------------------------------------
// Co-pilot
// ---------------------------------------------------------------------------
export function getCopilotGreeting() {
  return request<{ reply: string; insightTitle?: string; insightBody?: string; ctaLabel?: string }>('/copilot/greeting');
}

export function sendCopilotMessage(message: string) {
  return request<{ reply: string; insightTitle?: string; insightBody?: string; ctaLabel?: string }>('/copilot/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function listCopilotHistory() {
  const rows = await request<(CopilotMessage & { is_insight: number | boolean })[]>('/copilot/history');
  return rows.map((r) => ({ ...r, is_insight: Boolean(r.is_insight) })) as CopilotMessage[];
}
