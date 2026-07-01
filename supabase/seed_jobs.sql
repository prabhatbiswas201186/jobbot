-- Seed listings for the Job Match module, covering India, UAE, Saudi Arabia,
-- and international remote roles. Replace/augment with a live aggregator
-- (e.g. JSearch) later — the `source` column already distinguishes 'seed'
-- rows so a live sync can upsert alongside them without collisions.

insert into public.jobs
  (source, external_id, role, company, logo_text, location, region, tags, salary_min, salary_max, currency, url, description, posted_at)
values
  ('seed', 'in-001', 'Senior Product Manager', 'Razorpay', 'R', 'Bengaluru, India', 'india',
    array['Fintech','Payments','0→1'], 3500000, 4800000, 'INR', 'https://razorpay.com/jobs', 'Own the merchant payments roadmap for a leading Indian fintech.', now() - interval '2 days'),
  ('seed', 'in-002', 'Product Manager, Growth', 'Swiggy', 'S', 'Bengaluru, India', 'india',
    array['Growth','Consumer','Marketplace'], 2800000, 3900000, 'INR', 'https://careers.swiggy.com', 'Drive activation and retention across Swiggy''s consumer app.', now() - interval '5 days'),
  ('seed', 'in-003', 'Group Product Manager', 'Flipkart', 'F', 'Bengaluru, India', 'india',
    array['E-commerce','Platform','Leadership'], 4200000, 5600000, 'INR', 'https://www.flipkartcareers.com', 'Lead a pod of PMs across the seller platform.', now() - interval '1 day'),
  ('seed', 'in-004', 'Senior PM, Payments', 'PhonePe', 'P', 'Bengaluru, India', 'india',
    array['Fintech','UPI','Scale'], 3600000, 5000000, 'INR', 'https://www.phonepe.com/careers', 'Scale UPI-based payment flows to 500M+ users.', now() - interval '3 days'),
  ('seed', 'in-005', 'Product Manager, AI', 'Freshworks', 'FW', 'Chennai, India', 'india',
    array['AI','SaaS','B2B'], 3000000, 4200000, 'INR', 'https://www.freshworks.com/company/careers', 'Ship AI copilots inside the Freshworks CX suite.', now() - interval '6 days'),

  ('seed', 'ae-001', 'Senior Product Manager', 'Careem', 'C', 'Dubai, UAE', 'uae',
    array['Mobility','Super App','Growth'], 240000, 320000, 'AED', 'https://www.careem.com/careers', 'Own ride-hailing supply/demand balancing across the GCC.', now() - interval '4 days'),
  ('seed', 'ae-002', 'Product Manager, Fintech', 'Tabby', 'T', 'Dubai, UAE', 'uae',
    array['BNPL','Fintech','Consumer'], 220000, 300000, 'AED', 'https://tabby.ai/careers', 'Build the next generation of BNPL checkout for MENA.', now() - interval '2 days'),
  ('seed', 'ae-003', 'Group PM, Marketplace', 'noon', 'N', 'Dubai, UAE', 'uae',
    array['E-commerce','Marketplace','0→1'], 260000, 340000, 'AED', 'https://www.noon.com/uae-en/careers/', 'Lead category expansion for noon''s marketplace business.', now() - interval '7 days'),
  ('seed', 'ae-004', 'Senior PM, Banking', 'Emirates NBD', 'ENBD', 'Dubai, UAE', 'uae',
    array['Banking','Digital','Enterprise'], 250000, 330000, 'AED', 'https://www.emiratesnbd.com/en/careers', 'Modernize digital banking journeys for retail customers.', now() - interval '9 days'),

  ('seed', 'sa-001', 'Product Manager, Super App', 'STC Pay', 'STC', 'Riyadh, Saudi Arabia', 'saudi',
    array['Fintech','Super App','Growth'], 210000, 290000, 'SAR', 'https://www.stcpay.com.sa/careers', 'Grow wallet adoption across the Kingdom.', now() - interval '3 days'),
  ('seed', 'sa-002', 'Senior PM, Logistics', 'Jahez', 'J', 'Riyadh, Saudi Arabia', 'saudi',
    array['Logistics','Marketplace','Delivery'], 200000, 270000, 'SAR', 'https://jahez.net/careers', 'Own last-mile delivery experience and driver tooling.', now() - interval '6 days'),
  ('seed', 'sa-003', 'Product Manager, Vision 2030', 'NEOM', 'NEOM', 'NEOM, Saudi Arabia', 'saudi',
    array['Smart City','GovTech','0→1'], 230000, 310000, 'SAR', 'https://www.neom.com/en-us/careers', 'Design digital services for a greenfield smart city.', now() - interval '10 days'),

  ('seed', 'rm-001', 'Senior PM, Payments', 'Stripe', 'S', 'Remote (Global)', 'remote-intl',
    array['Fintech','0→1','Platform'], 180000, 220000, 'USD', 'https://stripe.com/jobs', 'Cut checkout latency and grow global payments coverage.', now() - interval '1 day'),
  ('seed', 'rm-002', 'Product Manager, Core', 'Linear', 'L', 'Remote (Global)', 'remote-intl',
    array['Dev tools','Design-led'], 170000, 200000, 'USD', 'https://linear.app/careers', 'Shape the core issue-tracking experience.', now() - interval '2 days'),
  ('seed', 'rm-003', 'Group PM, Growth', 'Ramp', 'R', 'Remote (US/EU)', 'remote-intl',
    array['Growth','B2B','Data'], 190000, 235000, 'USD', 'https://ramp.com/careers', 'Own the growth loop for Ramp''s finance platform.', now() - interval '4 days'),
  ('seed', 'rm-004', 'Senior PM, AI', 'Notion', 'N', 'Remote (Global)', 'remote-intl',
    array['AI','Consumer'], 185000, 225000, 'USD', 'https://www.notion.so/careers', 'Build AI-native workflows into Notion.', now() - interval '5 days'),
  ('seed', 'rm-005', 'PM, Host Experience', 'Airbnb', 'A', 'Remote (Global)', 'remote-intl',
    array['Marketplace','Consumer'], 175000, 210000, 'USD', 'https://careers.airbnb.com', 'Improve tools and trust for global hosts.', now() - interval '8 days'),
  ('seed', 'rm-006', 'Senior PM, Design Systems', 'Figma', 'F', 'Remote (Global)', 'remote-intl',
    array['Design','Platform'], 180000, 215000, 'USD', 'https://www.figma.com/careers', 'Scale Figma''s design systems tooling for enterprise teams.', now() - interval '3 days'),
  ('seed', 'rm-007', 'PM, Cloud Infra', 'Datadog', 'D', 'Remote (Global)', 'remote-intl',
    array['Infra','Observability','B2B'], 175000, 205000, 'USD', 'https://careers.datadoghq.com', 'Own observability tooling for cloud-native teams.', now() - interval '6 days'),
  ('seed', 'rm-008', 'Senior PM', 'Vercel', 'V', 'Remote (Global)', 'remote-intl',
    array['Dev tools','Frontend cloud'], 180000, 220000, 'USD', 'https://vercel.com/careers', 'Shape the deploy and edge-runtime experience.', now() - interval '2 days')
on conflict (source, external_id) do nothing;
