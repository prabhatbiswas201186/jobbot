// Pure-JavaScript persistence: everything lives in a single JSON file on disk.
// No native modules, no compilation, no database engine — works on any Node
// version. Fine for a single-user local app with modest data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, '..', 'jobbot-data.json');

function emptyData() {
  return {
    profile: {
      id: 1,
      full_name: '',
      target_comp_min: null,
      target_comp_max: null,
      target_currency: 'USD',
      onboarding_stage: 'upload',
    },
    resumes: [],
    resume_versions: [],
    jobs: [],
    job_matches: [],
    applications: [],
    interviews: [],
    star_answers: [],
    mock_sessions: [],
    copilot_messages: [],
  };
}

export const data = fs.existsSync(dataFile)
  ? { ...emptyData(), ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) }
  : emptyData();

export function save() {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

export { randomUUID };

// ---------------------------------------------------------------------------
// Seed the job catalog on first run — 20 real listings sourced from Indeed
// across India, UAE, Saudi Arabia, and international remote.
// ---------------------------------------------------------------------------
if (data.jobs.length === 0) {
  const iso = (d) => new Date(d).toISOString();
  const seed = [
    { external_id: 'JOBSEARCH_12', role: 'Associate Product Manager', company: 'MillerKnoll', logo_text: 'MK', location: 'Bengaluru, India', region: 'india', tags: ['Product', 'Associate'], salary_min: 1800000, salary_max: 2800000, currency: 'INR', url: 'https://to.indeed.com/aa6my9vn9zhl', description: 'Associate Product Manager role at MillerKnoll, Bengaluru.', posted_at: iso('2026-06-22') },
    { external_id: 'JOBSEARCH_13', role: 'Product Manager III', company: 'TE Connectivity', logo_text: 'TE', location: 'Bengaluru, India', region: 'india', tags: ['Hardware', 'Enterprise'], salary_min: 3200000, salary_max: 4500000, currency: 'INR', url: 'https://to.indeed.com/aamsjtr2zlh7', description: 'Senior product management role at TE Connectivity, Bengaluru.', posted_at: iso('2026-06-03') },
    { external_id: 'JOBSEARCH_16', role: 'Product Manager', company: 'Lenskart.com', logo_text: 'L', location: 'Bengaluru, India', region: 'india', tags: ['D2C', 'Retail Tech'], salary_min: 2800000, salary_max: 4000000, currency: 'INR', url: 'https://to.indeed.com/aaqhfgvbdlw8', description: 'Product Manager at Lenskart, Bengaluru.', posted_at: iso('2026-05-21') },
    { external_id: 'JOBSEARCH_17', role: 'Senior Product Manager', company: 'LexisNexis Legal & Professional', logo_text: 'LN', location: 'Bengaluru, India', region: 'india', tags: ['LegalTech', 'Enterprise'], salary_min: 3500000, salary_max: 4800000, currency: 'INR', url: 'https://to.indeed.com/aarlkcbprl7x', description: 'Senior Product Manager at LexisNexis, Bengaluru.', posted_at: iso('2026-03-04') },
    { external_id: 'JOBSEARCH_21', role: 'Principal Product Manager', company: 'Acceldata', logo_text: 'A', location: 'Bengaluru, India', region: 'india', tags: ['Data Platform', 'B2B'], salary_min: 4500000, salary_max: 6000000, currency: 'INR', url: 'https://to.indeed.com/aahbpndlm8x2', description: 'Principal Product Manager at Acceldata, Bengaluru.', posted_at: iso('2026-06-24') },

    { external_id: 'JOBSEARCH_23', role: 'Product Manager', company: 'Highfly Sourcing', logo_text: 'HS', location: 'Dubai, UAE', region: 'uae', tags: ['Sourcing', 'Product'], salary_min: 200000, salary_max: 280000, currency: 'AED', url: 'https://to.indeed.com/aax7sgk4xtv4', description: 'Product Manager role at Highfly Sourcing, Dubai.', posted_at: iso('2026-03-03') },
    { external_id: 'JOBSEARCH_24', role: 'Product Manager', company: 'Psdigital', logo_text: 'P', location: 'Dubai, UAE', region: 'uae', tags: ['Digital', 'Agency'], salary_min: 190000, salary_max: 260000, currency: 'AED', url: 'https://to.indeed.com/aagbh6nmy28l', description: 'Product Manager at Psdigital, Dubai.', posted_at: iso('2026-02-27') },
    { external_id: 'JOBSEARCH_27', role: 'Product Manager', company: 'Hoxton Wealth', logo_text: 'HW', location: 'Dubai, UAE', region: 'uae', tags: ['Fintech', 'Wealth'], salary_min: 210000, salary_max: 290000, currency: 'AED', url: 'https://to.indeed.com/aayd8lzc9bwz', description: 'Product Manager at Hoxton Wealth, Dubai.', posted_at: iso('2026-06-09') },
    { external_id: 'JOBSEARCH_28', role: 'Product Manager', company: 'WEbook.com', logo_text: 'W', location: 'Dubai, UAE', region: 'uae', tags: ['Consumer', 'Marketplace'], salary_min: 180000, salary_max: 240000, currency: 'AED', url: 'https://to.indeed.com/aa79kn82pfw7', description: 'Product Manager at WEbook.com, Dubai.', posted_at: iso('2026-01-21') },
    { external_id: 'JOBSEARCH_30', role: 'Global Product Manager', company: 'zcreatix', logo_text: 'Z', location: 'Dubai, UAE', region: 'uae', tags: ['Global', 'Product'], salary_min: 230000, salary_max: 310000, currency: 'AED', url: 'https://to.indeed.com/aazvpvbqcskr', description: 'Global Product Manager at zcreatix, Dubai.', posted_at: iso('2026-05-05') },

    { external_id: 'JOBSEARCH_33', role: 'Product Manager', company: 'almosafer', logo_text: 'AL', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Travel', 'Consumer'], salary_min: 190000, salary_max: 260000, currency: 'SAR', url: 'https://to.indeed.com/aagh7ck8ngkq', description: 'Product Manager at almosafer, Riyadh.', posted_at: iso('2024-11-23') },
    { external_id: 'JOBSEARCH_39', role: 'Customer Platforms Product Manager', company: 'Riyadh Air', logo_text: 'RA', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Aviation', 'Customer Platforms'], salary_min: 220000, salary_max: 300000, currency: 'SAR', url: 'https://to.indeed.com/aagvmglx9b4v', description: 'Customer Platforms Product Manager at Riyadh Air.', posted_at: iso('2026-06-09') },
    { external_id: 'JOBSEARCH_40', role: 'Senior Product Manager', company: 'Soar Software Development Company', logo_text: 'S', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Software', 'B2B'], salary_min: 210000, salary_max: 280000, currency: 'SAR', url: 'https://to.indeed.com/aalclm6ydyk8', description: 'Senior Product Manager at Soar Software, Riyadh.', posted_at: iso('2026-06-29') },
    { external_id: 'JOBSEARCH_32', role: 'Product Manager', company: 'SARJ', logo_text: 'SARJ', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Product'], salary_min: 180000, salary_max: 240000, currency: 'SAR', url: 'https://to.indeed.com/aayyxtdzskd8', description: 'Product Manager at SARJ, Riyadh.', posted_at: iso('2026-04-16') },
    { external_id: 'JOBSEARCH_38', role: 'Product Manager', company: 'Prime Gate', logo_text: 'PG', location: 'Riyadh, Saudi Arabia', region: 'saudi', tags: ['Product'], salary_min: 170000, salary_max: 230000, currency: 'SAR', url: 'https://to.indeed.com/aac4hy6yxzft', description: 'Product Manager at Prime Gate, Riyadh.', posted_at: iso('2026-04-07') },

    { external_id: 'JOBSEARCH_42', role: 'Medicaid Product Manager', company: 'Humana', logo_text: 'H', location: 'Remote (US)', region: 'remote-intl', tags: ['Healthcare', 'Medicaid'], salary_min: 104000, salary_max: 250000, currency: 'USD', url: 'https://to.indeed.com/aasf4j9mch8z', description: 'Medicaid Product Manager at Humana, fully remote.', posted_at: iso('2026-06-30') },
    { external_id: 'JOBSEARCH_45', role: 'Senior Product Manager', company: 'FCT', logo_text: 'FCT', location: 'Remote (US)', region: 'remote-intl', tags: ['Real Estate Tech'], salary_min: 129300, salary_max: 172300, currency: 'USD', url: 'https://to.indeed.com/aaznvf6qxzcc', description: 'Senior Product Manager (Remote) at FCT.', posted_at: iso('2026-05-18') },
    { external_id: 'JOBSEARCH_44', role: 'Senior Product Manager', company: 'Extra Duty Solutions', logo_text: 'EDS', location: 'Remote (US)', region: 'remote-intl', tags: ['EdTech', 'B2B'], salary_min: 130000, salary_max: 170000, currency: 'USD', url: 'https://to.indeed.com/aakvz9867z79', description: 'Senior Product Manager at Extra Duty Solutions, fully remote.', posted_at: iso('2026-06-18') },
    { external_id: 'JOBSEARCH_50', role: 'Associate Product Manager', company: 'Cutsforth', logo_text: 'C', location: 'Remote (US)', region: 'remote-intl', tags: ['Industrial', 'IoT'], salary_min: 117407, salary_max: 146339, currency: 'USD', url: 'https://to.indeed.com/aar66xyfj8qw', description: 'Associate Product Manager at Cutsforth, fully remote.', posted_at: iso('2026-05-27') },
    { external_id: 'JOBSEARCH_51', role: 'Product Operations Manager', company: 'Extra Duty Solutions', logo_text: 'EDS', location: 'Remote (US)', region: 'remote-intl', tags: ['Product Ops', 'Enablement'], salary_min: 85000, salary_max: 100000, currency: 'USD', url: 'https://to.indeed.com/aal77xqnt4vb', description: 'Product Operations Manager: Practice & Enablement, fully remote.', posted_at: iso('2026-06-18') },
  ];
  data.jobs = seed.map((j) => ({ id: randomUUID(), source: 'indeed', ...j }));
  save();
}
