-- Seed listings for the Job Match module: 20 real jobs sourced from Indeed
-- across India, UAE, Saudi Arabia, and international remote (point-in-time
-- snapshot). The live JSearch search (jobs-search edge function) upserts
-- fresh listings alongside these using source='jsearch', so both coexist.
-- Salary shown as posted by Indeed where available; otherwise a regional estimate.

insert into public.jobs
  (source, external_id, role, company, logo_text, location, region, tags, salary_min, salary_max, currency, url, description, posted_at)
values
  -- India
  ('indeed', 'JOBSEARCH_12', 'Associate Product Manager', 'MillerKnoll', 'MK', 'Bengaluru, India', 'india',
    array['Product','Associate'], 1800000, 2800000, 'INR', 'https://to.indeed.com/aa6my9vn9zhl', 'Associate Product Manager role at MillerKnoll, Bengaluru.', '2026-06-22'),
  ('indeed', 'JOBSEARCH_13', 'Product Manager III', 'TE Connectivity', 'TE', 'Bengaluru, India', 'india',
    array['Hardware','Enterprise'], 3200000, 4500000, 'INR', 'https://to.indeed.com/aamsjtr2zlh7', 'Senior product management role at TE Connectivity, Bengaluru.', '2026-06-03'),
  ('indeed', 'JOBSEARCH_16', 'Product Manager', 'Lenskart.com', 'L', 'Bengaluru, India', 'india',
    array['D2C','Retail Tech'], 2800000, 4000000, 'INR', 'https://to.indeed.com/aaqhfgvbdlw8', 'Product Manager at Lenskart, Bengaluru.', '2026-05-21'),
  ('indeed', 'JOBSEARCH_17', 'Senior Product Manager', 'LexisNexis Legal & Professional', 'LN', 'Bengaluru, India', 'india',
    array['LegalTech','Enterprise'], 3500000, 4800000, 'INR', 'https://to.indeed.com/aarlkcbprl7x', 'Senior Product Manager at LexisNexis, Bengaluru.', '2026-03-04'),
  ('indeed', 'JOBSEARCH_21', 'Principal Product Manager', 'Acceldata', 'A', 'Bengaluru, India', 'india',
    array['Data Platform','B2B'], 4500000, 6000000, 'INR', 'https://to.indeed.com/aahbpndlm8x2', 'Principal Product Manager at Acceldata, Bengaluru.', '2026-06-24'),

  -- UAE
  ('indeed', 'JOBSEARCH_23', 'Product Manager', 'Highfly Sourcing', 'HS', 'Dubai, UAE', 'uae',
    array['Sourcing','Product'], 200000, 280000, 'AED', 'https://to.indeed.com/aax7sgk4xtv4', 'Product Manager role at Highfly Sourcing, Dubai.', '2026-03-03'),
  ('indeed', 'JOBSEARCH_24', 'Product Manager', 'Psdigital', 'P', 'Dubai, UAE', 'uae',
    array['Digital','Agency'], 190000, 260000, 'AED', 'https://to.indeed.com/aagbh6nmy28l', 'Product Manager at Psdigital, Dubai.', '2026-02-27'),
  ('indeed', 'JOBSEARCH_27', 'Product Manager', 'Hoxton Wealth', 'HW', 'Dubai, UAE', 'uae',
    array['Fintech','Wealth'], 210000, 290000, 'AED', 'https://to.indeed.com/aayd8lzc9bwz', 'Product Manager at Hoxton Wealth, Dubai.', '2026-06-09'),
  ('indeed', 'JOBSEARCH_28', 'Product Manager', 'WEbook.com', 'W', 'Dubai, UAE', 'uae',
    array['Consumer','Marketplace'], 180000, 240000, 'AED', 'https://to.indeed.com/aa79kn82pfw7', 'Product Manager at WEbook.com, Dubai.', '2026-01-21'),
  ('indeed', 'JOBSEARCH_30', 'Global Product Manager', 'zcreatix', 'Z', 'Dubai, UAE', 'uae',
    array['Global','Product'], 230000, 310000, 'AED', 'https://to.indeed.com/aazvpvbqcskr', 'Global Product Manager at zcreatix, Dubai.', '2026-05-05'),

  -- Saudi Arabia
  ('indeed', 'JOBSEARCH_33', 'Product Manager', 'almosafer', 'AL', 'Riyadh, Saudi Arabia', 'saudi',
    array['Travel','Consumer'], 190000, 260000, 'SAR', 'https://to.indeed.com/aagh7ck8ngkq', 'Product Manager at almosafer, Riyadh.', '2024-11-23'),
  ('indeed', 'JOBSEARCH_39', 'Customer Platforms Product Manager', 'Riyadh Air', 'RA', 'Riyadh, Saudi Arabia', 'saudi',
    array['Aviation','Customer Platforms'], 220000, 300000, 'SAR', 'https://to.indeed.com/aagvmglx9b4v', 'Customer Platforms Product Manager at Riyadh Air.', '2026-06-09'),
  ('indeed', 'JOBSEARCH_40', 'Senior Product Manager', 'Soar Software Development Company', 'S', 'Riyadh, Saudi Arabia', 'saudi',
    array['Software','B2B'], 210000, 280000, 'SAR', 'https://to.indeed.com/aalclm6ydyk8', 'Senior Product Manager at Soar Software, Riyadh.', '2026-06-29'),
  ('indeed', 'JOBSEARCH_32', 'Product Manager', 'SARJ', 'SARJ', 'Riyadh, Saudi Arabia', 'saudi',
    array['Product'], 180000, 240000, 'SAR', 'https://to.indeed.com/aayyxtdzskd8', 'Product Manager at SARJ, Riyadh.', '2026-04-16'),
  ('indeed', 'JOBSEARCH_38', 'Product Manager', 'Prime Gate', 'PG', 'Riyadh, Saudi Arabia', 'saudi',
    array['Product'], 170000, 230000, 'SAR', 'https://to.indeed.com/aac4hy6yxzft', 'Product Manager at Prime Gate, Riyadh.', '2026-04-07'),

  -- International remote
  ('indeed', 'JOBSEARCH_42', 'Medicaid Product Manager', 'Humana', 'H', 'Remote (US)', 'remote-intl',
    array['Healthcare','Medicaid'], 104000, 250000, 'USD', 'https://to.indeed.com/aasf4j9mch8z', 'Medicaid Product Manager at Humana, fully remote.', '2026-06-30'),
  ('indeed', 'JOBSEARCH_45', 'Senior Product Manager', 'FCT', 'FCT', 'Remote (US)', 'remote-intl',
    array['Real Estate Tech'], 129300, 172300, 'USD', 'https://to.indeed.com/aaznvf6qxzcc', 'Senior Product Manager (Remote) at FCT.', '2026-05-18'),
  ('indeed', 'JOBSEARCH_44', 'Senior Product Manager', 'Extra Duty Solutions', 'EDS', 'Remote (US)', 'remote-intl',
    array['EdTech','B2B'], 130000, 170000, 'USD', 'https://to.indeed.com/aakvz9867z79', 'Senior Product Manager at Extra Duty Solutions, fully remote.', '2026-06-18'),
  ('indeed', 'JOBSEARCH_50', 'Associate Product Manager', 'Cutsforth', 'C', 'Remote (US)', 'remote-intl',
    array['Industrial','IoT'], 117407, 146339, 'USD', 'https://to.indeed.com/aar66xyfj8qw', 'Associate Product Manager at Cutsforth, fully remote.', '2026-05-27'),
  ('indeed', 'JOBSEARCH_51', 'Product Operations Manager', 'Extra Duty Solutions', 'EDS', 'Remote (US)', 'remote-intl',
    array['Product Ops','Enablement'], 85000, 100000, 'USD', 'https://to.indeed.com/aal77xqnt4vb', 'Product Operations Manager: Practice & Enablement, fully remote.', '2026-06-18')
on conflict (source, external_id) do nothing;
