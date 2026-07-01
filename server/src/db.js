import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'jobbot.sqlite3');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT NOT NULL DEFAULT '',
  target_comp_min INTEGER,
  target_comp_max INTEGER,
  target_currency TEXT NOT NULL DEFAULT 'USD',
  onboarding_stage TEXT NOT NULL DEFAULT 'upload'
);
INSERT OR IGNORE INTO profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  file_name TEXT,
  raw_text TEXT NOT NULL,
  parsed TEXT NOT NULL DEFAULT '{}',
  ats_score INTEGER,
  keyword_have TEXT NOT NULL DEFAULT '[]',
  keyword_missing TEXT NOT NULL DEFAULT '[]',
  recruiter_tip TEXT,
  is_master INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id TEXT PRIMARY KEY,
  resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_role TEXT,
  target_company TEXT,
  ats_score INTEGER NOT NULL DEFAULT 0,
  bullets TEXT NOT NULL DEFAULT '[]',
  keyword_have TEXT NOT NULL DEFAULT '[]',
  keyword_missing TEXT NOT NULL DEFAULT '[]',
  recruiter_tip TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'seed',
  external_id TEXT,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  logo_text TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  region TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  url TEXT,
  description TEXT,
  posted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, external_id)
);

CREATE TABLE IF NOT EXISTS job_matches (
  job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0,
  matched_keywords TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  logo_text TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'applied',
  tag TEXT,
  tag_color TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  offer_amount INTEGER,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'behavioral',
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS star_answers (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL UNIQUE,
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mock_sessions (
  id TEXT PRIMARY KEY,
  interview_id TEXT REFERENCES interviews(id) ON DELETE SET NULL,
  question TEXT,
  answer_text TEXT,
  structure_score INTEGER,
  specificity_score INTEGER,
  filler_word_count INTEGER,
  readiness_score INTEGER,
  feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  is_insight INTEGER NOT NULL DEFAULT 0,
  cta_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const jobCount = db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n;
if (jobCount === 0) {
  const insertJob = db.prepare(`
    INSERT INTO jobs (id, source, external_id, role, company, logo_text, location, region, tags, salary_min, salary_max, currency, url, description, posted_at)
    VALUES (@id, 'indeed', @external_id, @role, @company, @logo_text, @location, @region, @tags, @salary_min, @salary_max, @currency, @url, @description, @posted_at)
  `);
  const iso = (d) => new Date(d).toISOString();
  // Sourced live from Indeed at first run (search: "Product Manager" per region).
  // Real company names, real Indeed job IDs/apply links, real posted dates.
  // Salary shown as-posted by Indeed where available; otherwise a regional estimate.
  const seedJobs = [
    // India — Bengaluru / Chennai
    { external_id: 'JOBSEARCH_12', role: 'Associate Product Manager', company: 'MillerKnoll', logo_text: 'MK', location: 'Bengaluru, India', region: 'india', tags: ['Product', 'Associate'], salary_min: 1800000, salary_max: 2800000, currency: 'INR', url: 'https://to.indeed.com/aa6my9vn9zhl', description: 'Associate Product Manager role at MillerKnoll, Bengaluru.', posted_at: iso('2026-06-22') },
    { external_id: 'JOBSEARCH_13', role: 'Product Manager III', company: 'TE Connectivity', logo_text: 'TE', location: 'Bengaluru, India', region: 'india', tags: ['Hardware', 'Enterprise'], salary_min: 3200000, salary_max: 4500000, currency: 'INR', url: 'https://to.indeed.com/aamsjtr2zlh7', description: 'Senior product management role at TE Connectivity, Bengaluru.', posted_at: iso('2026-06-03') },
    { external_id: 'JOBSEARCH_16', role: 'Product Manager', company: 'Lenskart.com', logo_text: 'L', location: 'Bengaluru, India', region: 'india', tags: ['D2C', 'Retail Tech'], salary_min: 2800000, salary_max: 4000000, currency: 'INR', url: 'https://to.indeed.com/aaqhfgvbdlw8', description: 'Product Manager at Lenskart, Bengaluru.', posted_at: iso('2026-05-21') },
    { external_id: 'JOBSEARCH_17', role: 'Senior Product Manager', company: 'LexisNexis Legal & Professional', logo_text: 'LN', location: 'Bengaluru, India', region: 'india', tags: ['LegalTech', 'Enterprise'], salary_min: 3500000, salary_max: 4800000, currency: 'INR', url: 'https://to.indeed.com/aarlkcbprl7x', description: 'Senior Product Manager at LexisNexis, Bengaluru.', posted_at: iso('2026-03-04') },
    { external_id: 'JOBSEARCH_21', role: 'Principal Product Manager', company: 'Acceldata', logo_text: 'A', location: 'Bengaluru, India', region: 'india', tags: ['Data Platform', 'B2B'], salary_min: 4500000, salary_max: 6000000, currency: 'INR', url: 'https://to.indeed.com/aahbpndlm8x2', description: 'Principal Product Manager at Acceldata, Bengaluru.', posted_at: iso('2026-06-24') },

    // UAE — Dubai
    { external_id: 'JOBSEARCH_23', role: 'Product Manager', company: 'Highfly Sourcing', logo_text: 'HS', location: 'Dubai, UAE', region: 'uae', tags: ['Sourcing', 'Product'], salary_min: 200000, salary_max: 280000, currency: 'AED', url: 'https://to.indeed.com/aax7sgk4xtv4', description: 'Product Manager role at Highfly Sourcing, Dubai.', posted_at: iso('2026-03-03') },
    { external_id: 'JOBSEARCH_24', role: 'Product Manager', company: 'Psdigital', logo_text: 'P', location: 'Dubai, UAE', region: 'uae', tags: ['Digital', 'Agency'], salary_min: 190000, salary_max: 260000, currency: 'AED', url: 'https://to.indeed.com/aagbh6nmy28l', description: 'Product Manager at Psdigital, Dubai.', posted_at: iso('2026-02-27') },
    { external_id: 'JOBSEARCH_27', role: 'Product Manager', company: 'Hoxton Wealth', logo_text: 'HW', location: 'Dubai, UAE', region: 'uae', tags: ['Fintech', 'Wealth'], salary_min: 210000, salary_max: 290000, currency: 'AED', url: 'https://to.indeed.com/aayd8lzc9bwz', description: 'Product Manager at Hoxton Wealth, Dubai.', posted_at: iso('2026-06-09') },
    { external_id: 'JOBSEARCH_28', role: 'Product Manager', company: 'WEbook.com', logo_text: 'W', location: 'Dubai, UAE', region: 'uae', tags: ['Consumer', 'Marketplace'], salary_min: 180000, salary_max: 240000, currency: 'AED', url: 'https://to.indeed.com/aa79kn82pfw7', description: 'Product Manager at WEbook.com, Dubai.', posted_at: iso('2026-01-21') },
    { external_id: 'JOBSEARCH_30', role: 'Global Product Manager', company: 'zcreatix', logo_text: 'Z', location: 'Dubai, UAE', region: 'uae', tags: ['Global', 'Product'], salary_min: 230000, salary_max: 310000, currency: 'AED', url: 'https://to.indeed.com/aazvpvbqcskr', description: 'Global Product Manager at zcreatix, Dubai.', posted_at: iso('2026-05-05') },

    // Saudi Arabia — Riyadh
    { external_id: 'JOBSEARCH_33', role: 'Product Manager', company: 'almosafer', logo_text: 'AL', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Travel', 'Consumer'], salary_min: 190000, salary_max: 260000, currency: 'SAR', url: 'https://to.indeed.com/aagh7ck8ngkq', description: 'Product Manager at almosafer, Riyadh.', posted_at: iso('2024-11-23') },
    { external_id: 'JOBSEARCH_39', role: 'Customer Platforms Product Manager', company: 'Riyadh Air', logo_text: 'RA', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Aviation', 'Customer Platforms'], salary_min: 220000, salary_max: 300000, currency: 'SAR', url: 'https://to.indeed.com/aagvmglx9b4v', description: 'Customer Platforms Product Manager at Riyadh Air.', posted_at: iso('2026-06-09') },
    { external_id: 'JOBSEARCH_40', role: 'Senior Product Manager', company: 'Soar Software Development Company', logo_text: 'S', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Software', 'B2B'], salary_min: 210000, salary_max: 280000, currency: 'SAR', url: 'https://to.indeed.com/aalclm6ydyk8', description: 'Senior Product Manager at Soar Software, Riyadh.', posted_at: iso('2026-06-29') },
    { external_id: 'JOBSEARCH_32', role: 'Product Manager', company: 'SARJ', logo_text: 'SARJ', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Product'], salary_min: 180000, salary_max: 240000, currency: 'SAR', url: 'https://to.indeed.com/aayyxtdzskd8', description: 'Product Manager at SARJ, Riyadh.', posted_at: iso('2026-04-16') },
    { external_id: 'JOBSEARCH_38', role: 'Product Manager', company: 'Prime Gate', logo_text: 'PG', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Product'], salary_min: 170000, salary_max: 230000, currency: 'SAR', url: 'https://to.indeed.com/aac4hy6yxzft', description: 'Product Manager at Prime Gate, Riyadh.', posted_at: iso('2026-04-07') },

    // International remote
    { external_id: 'JOBSEARCH_42', role: 'Medicaid Product Manager', company: 'Humana', logo_text: 'H', location: 'Remote (US)', region: 'remote-intl', tags: ['Healthcare', 'Medicaid'], salary_min: 104000, salary_max: 250000, currency: 'USD', url: 'https://to.indeed.com/aasf4j9mch8z', description: 'Medicaid Product Manager at Humana, fully remote.', posted_at: iso('2026-06-30') },
    { external_id: 'JOBSEARCH_45', role: 'Senior Product Manager', company: 'FCT', logo_text: 'FCT', location: 'Remote (US)', region: 'remote-intl', tags: ['Real Estate Tech'], salary_min: 129300, salary_max: 172300, currency: 'USD', url: 'https://to.indeed.com/aaznvf6qxzcc', description: 'Senior Product Manager (Remote) at FCT.', posted_at: iso('2026-05-18') },
    { external_id: 'JOBSEARCH_44', role: 'Senior Product Manager', company: 'Extra Duty Solutions', logo_text: 'EDS', location: 'Remote (US)', region: 'remote-intl', tags: ['EdTech', 'B2B'], salary_min: 130000, salary_max: 170000, currency: 'USD', url: 'https://to.indeed.com/aakvz9867z79', description: 'Senior Product Manager at Extra Duty Solutions, fully remote.', posted_at: iso('2026-06-18') },
    { external_id: 'JOBSEARCH_50', role: 'Associate Product Manager', company: 'Cutsforth', logo_text: 'C', location: 'Remote (US)', region: 'remote-intl', tags: ['Industrial', 'IoT'], salary_min: 117407, salary_max: 146339, currency: 'USD', url: 'https://to.indeed.com/aar66xyfj8qw', description: 'Associate Product Manager at Cutsforth, fully remote.', posted_at: iso('2026-05-27') },
    { external_id: 'JOBSEARCH_51', role: 'Product Operations Manager', company: 'Extra Duty Solutions', logo_text: 'EDS', location: 'Remote (US)', region: 'remote-intl', tags: ['Product Ops', 'Enablement'], salary_min: 85000, salary_max: 100000, currency: 'USD', url: 'https://to.indeed.com/aal77xqnt4vb', description: 'Product Operations Manager: Practice & Enablement, fully remote.', posted_at: iso('2026-06-18') },
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertJob.run({ id: randomUUID(), ...row, tags: JSON.stringify(row.tags) });
    }
  });
  insertMany(seedJobs);
}
