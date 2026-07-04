import { supabase } from '../lib/supabaseClient';
import type {
  Application,
  CareerPathData,
  Interview,
  Job,
  JobRegion,
  JobWithMatch,
  MockSession,
  NegotiationPlan,
  Resume,
  ResumeVersion,
  SkillRoadmapItem,
  StarAnswer,
} from '../types';

async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: body ?? {},
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    throw new Error(String((data as Record<string, unknown>).error));
  }
  return data as T;
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
  return callFunction<AnalyzeResumeResult>('resume-analyze', input);
}

export async function getMasterResume(userId: string) {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_master', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Resume | null;
}

export function tailorResume(input: { targetRole: string; targetCompany: string; jobDescription?: string }) {
  return callFunction<ResumeVersion>('resume-tailor', input);
}

export async function listResumeVersions(userId: string) {
  const { data, error } = await supabase
    .from('resume_versions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ResumeVersion[];
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function listJobsWithMatches(userId: string, region?: JobRegion) {
  let jobsQuery = supabase.from('jobs').select('*').order('posted_at', { ascending: false });
  if (region) jobsQuery = jobsQuery.eq('region', region);
  const { data: jobs, error: jobsErr } = await jobsQuery;
  if (jobsErr) throw jobsErr;

  const { data: matches, error: matchErr } = await supabase
    .from('job_matches')
    .select('job_id, match_score, matched_keywords')
    .eq('user_id', userId);
  if (matchErr) throw matchErr;

  const matchByJob = new Map((matches ?? []).map((m) => [m.job_id, m]));
  return ((jobs ?? []) as Job[])
    .map((j) => ({
      ...j,
      match_score: matchByJob.get(j.id)?.match_score ?? null,
      matched_keywords: matchByJob.get(j.id)?.matched_keywords ?? [],
    }))
    .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)) as JobWithMatch[];
}

export function computeJobMatches(region?: JobRegion) {
  return callFunction<{ matches: unknown[] }>('job-match', region ? { region } : {});
}

export function searchLiveJobs(input: { query: string; location?: string }) {
  return callFunction<{ count: number; query: string }>('jobs-search', input);
}

// ---------------------------------------------------------------------------
// Applications / pipeline
// ---------------------------------------------------------------------------
export async function listApplications(userId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Application[];
}

export async function createApplication(input: Omit<Application, 'id' | 'applied_at' | 'updated_at'> & { user_id: string }) {
  const { data, error } = await supabase.from('applications').insert(input).select().single();
  if (error) throw error;
  return data as Application;
}

export async function updateApplicationStage(id: string, stage: Application['stage']) {
  const { error } = await supabase
    .from('applications')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateOfferAmount(id: string, amount: number | null) {
  const { error } = await supabase
    .from('applications')
    .update({ offer_amount: amount, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------
export async function listUpcomingInterviews(userId: string) {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Interview[];
}

export async function createInterview(input: {
  user_id: string;
  application_id: string | null;
  company: string;
  role: string;
  kind: string;
  scheduled_at: string;
}) {
  const { data, error } = await supabase.from('interviews').insert(input).select().single();
  if (error) throw error;
  return data as Interview;
}

// ---------------------------------------------------------------------------
// Interview coach
// ---------------------------------------------------------------------------
export function getQuestionBank(input: { targetRole?: string; targetCompany?: string }) {
  return callFunction<{ questions: { tag: string; question: string }[] }>('interview-coach', {
    mode: 'question_bank',
    ...input,
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
  return callFunction<ScoreAnswerResult>('interview-coach', { mode: 'score_answer', ...input });
}

export async function listStarAnswers(userId: string) {
  const { data, error } = await supabase.from('star_answers').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as StarAnswer[];
}

export async function latestMockSession(userId: string) {
  const { data, error } = await supabase
    .from('mock_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as MockSession | null;
}

// ---------------------------------------------------------------------------
// Co-pilot
// ---------------------------------------------------------------------------
export function getCopilotGreeting() {
  return callFunction<{ reply: string; insightTitle?: string; insightBody?: string; ctaLabel?: string }>(
    'copilot-chat',
    {}
  );
}

export function sendCopilotMessage(message: string) {
  return callFunction<{ reply: string; insightTitle?: string; insightBody?: string; ctaLabel?: string }>(
    'copilot-chat',
    { message }
  );
}

export async function listCopilotHistory(userId: string) {
  const { data, error } = await supabase
    .from('copilot_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------------------
export function getNegotiationPlan(input: { applicationId: string }) {
  return callFunction<NegotiationPlan>('negotiation', input);
}

// ---------------------------------------------------------------------------
// Career path
// ---------------------------------------------------------------------------
export function generateCareerPath() {
  return callFunction<CareerPathData>('career-path', {});
}

export async function getCareerPath(userId: string) {
  const { data, error } = await supabase
    .from('career_paths')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as CareerPathData | null;
}

export async function saveSkillProgress(id: string, skillRoadmap: SkillRoadmapItem[]) {
  const { error } = await supabase.from('career_paths').update({ skill_roadmap: skillRoadmap }).eq('id', id);
  if (error) throw error;
}
