export interface Profile {
  id: number;
  full_name: string;
  target_comp_min: number | null;
  target_comp_max: number | null;
  target_currency: string;
  onboarding_stage: 'upload' | 'analyzing' | 'results' | 'done';
}

export interface ResumeVersion {
  id: string;
  resume_id: string | null;
  name: string;
  target_role: string | null;
  target_company: string | null;
  ats_score: number;
  bullets: { original: string; rewrite: string }[];
  keyword_have: string[];
  keyword_missing: string[];
  recruiter_tip: string | null;
  status: 'draft' | 'tailoring' | 'sent';
  created_at: string;
}

export interface Resume {
  id: string;
  raw_text: string;
  parsed: { roles?: { title: string; company: string; period: string }[]; skillGaps?: string[] };
  ats_score: number | null;
  keyword_have: string[];
  keyword_missing: string[];
  recruiter_tip: string | null;
}

export type JobRegion = 'india' | 'uae' | 'saudi' | 'remote-intl';

export interface Job {
  id: string;
  role: string;
  company: string;
  logo_text: string;
  location: string;
  region: JobRegion;
  tags: string[];
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  url: string | null;
}

export interface JobWithMatch extends Job {
  match_score: number | null;
  matched_keywords: string[];
}

export type ApplicationStage = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

export interface Application {
  id: string;
  job_id: string | null;
  role: string;
  company: string;
  logo_text: string;
  stage: ApplicationStage;
  tag: string | null;
  tag_color: string | null;
  source: 'manual' | 'autopilot';
  offer_amount: number | null;
  applied_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  application_id: string | null;
  company: string;
  role: string;
  kind: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface StarAnswer {
  id: string;
  question: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
}

export interface MockSession {
  id: string;
  question: string | null;
  structure_score: number | null;
  specificity_score: number | null;
  filler_word_count: number | null;
  readiness_score: number | null;
  feedback: string | null;
  created_at: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  is_insight: boolean;
  cta_label: string | null;
  created_at: string;
}
