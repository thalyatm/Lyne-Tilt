-- Replace any fake/seed learn items with real workshops matching the website
-- First, delete dependent rows to avoid FK constraint issues
DELETE FROM cohort_enrollments WHERE cohort_id IN (SELECT id FROM cohorts WHERE learn_item_id IN (SELECT id FROM learn_items));
DELETE FROM cohort_sessions WHERE cohort_id IN (SELECT id FROM cohorts WHERE learn_item_id IN (SELECT id FROM learn_items));
DELETE FROM cohorts WHERE learn_item_id IN (SELECT id FROM learn_items);
DELETE FROM enrollments WHERE learn_item_id IN (SELECT id FROM learn_items);
DELETE FROM workshop_revisions WHERE workshop_id IN (SELECT id FROM learn_items);
DELETE FROM learn_items;

-- Insert real workshops/courses
INSERT INTO learn_items (id, title, slug, subtitle, type, price, price_amount, currency, image, description, duration, format, level, next_date, enrolled_count, includes, outcomes, modules, display_order, archived, status, published_at, delivery_mode, created_at, updated_at) VALUES
(
  'concept-to-create',
  'Concept to Create: Wearable Art Online Workshop',
  'concept-to-create',
  'Premium Creative Experience',
  'ONLINE',
  'from $135.00',
  '135.00',
  'AUD',
  '',
  'Break free from the scroll, the trends, and the sameness. Join Professional Artist, Coach, Mentor, and Creative Strategist Lyne Tilt for a two-part online workshop designed to help you move from feeling stuck to creating original, wearable art that feels unmistakably yours. Over two consecutive Sundays, you''ll work through Lyne''s signature Concept to Create framework, a practical, mindset-driven process that connects creative clarity with artistic momentum.',
  '2 full days',
  'Live Online',
  'Intermediate',
  NULL,
  0,
  '["Material mastery: polymer clay, paint, and mixed media combinations","Custom components: design hooks, findings, and details that elevate your work","Design integrity: balancing wearability, durability, and creative vision","Purpose-led practice: infuse your story, values, and sustainability into your process","Audience alignment: create work that resonates with your ideal collectors","Creative foundations: composition, originality, and professional growth techniques","Access to exclusive Concept to Create Alumni community","All sessions recorded for later viewing"]',
  '["Tap into your authentic creative voice without chasing trends","Transform raw ideas into clear, meaningful concepts","Prototype and experiment with confidence","Design and refine a small-batch release or one-of-a-kind statement piece"]',
  '[]',
  1,
  0,
  'published',
  '2024-01-01T00:00:00.000Z',
  'online',
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
),
(
  'oxygen-series-2026',
  'The Oxygen Series: Creative Momentum 2026',
  'oxygen-series-2026',
  'Alumni Only',
  'ONLINE',
  'from $105.00',
  '105.00',
  'AUD',
  '',
  'This three-part online workshop series is exclusively for Concept to Create alumni. Designed to give your creative practice a powerful breath of clarity, focus, and forward motion. Over three connected workshop days, we explore how intentional focus, creative planning, and inspired action can shape both your art and your year ahead.',
  '3 sessions',
  'Live Online',
  'Alumni',
  NULL,
  0,
  '["Three connected workshop days exploring art, AI, and intention","Clear intentions and a personally driven project plan","Focus on neuroscience principles and creative reconnection","All sessions recorded for later viewing"]',
  '["Set clear intentions for the year ahead","Plan and create a personally driven project","Explore how focus, awareness, and community support transform creative goals"]',
  '[]',
  2,
  0,
  'published',
  '2024-01-01T00:00:00.000Z',
  'online',
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
);
