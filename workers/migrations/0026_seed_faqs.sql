-- Recreate faqs table with updated category constraint and seed authoritative content

-- Backup existing data (if any)
CREATE TABLE IF NOT EXISTS faqs_backup AS SELECT * FROM faqs;

-- Drop old table and indexes
DROP TABLE IF EXISTS faqs;

-- Recreate with updated categories
CREATE TABLE faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Shipping', 'Handmade Work', 'Colour Accuracy', 'Returns + Exchanges', 'Product Care', 'Coaching + Services', 'General')),
  display_order INTEGER DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX faqs_category_idx ON faqs(category);
CREATE INDEX faqs_display_order_idx ON faqs(display_order);

-- Drop backup
DROP TABLE IF EXISTS faqs_backup;

-- Seed with authoritative FAQ content

-- SHIPPING
INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-ship-1',
  'How long will it take to process my order?',
  'Please allow 5–10 working days for processing. Custom orders may take longer depending on the complexity of the piece.',
  'Shipping',
  1,
  1,
  datetime('now'),
  datetime('now')
);

INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-ship-2',
  'How is shipping handled?',
  'All orders are sent via tracked Australia Post. You''ll receive a notification and tracking number once your parcel is sent. Track it via the Australia Post website or app.<br/><br/><strong>Domestic Shipping (Jewellery):</strong><br/>Flat rate: $12.50<br/><br/>Local pick-up is also available<br/><br/><strong>International Shipping (Jewellery):</strong><br/>Flat rate: $25.50 for orders under $200 AUD<br/><br/><strong>Artwork Shipping:</strong><br/>Varies by size and destination<br/><br/>See specific product listings for details<br/><br/>Pick-up also available',
  'Shipping',
  2,
  1,
  datetime('now'),
  datetime('now')
);

-- HANDMADE WORK
INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-hand-1',
  'Are your pieces truly handmade?',
  'Each piece is handmade and may contain slight imperfections or variations. These are not flaws, but the marks of authentic craftsmanship.<br/><br/>I only list what I would proudly wear or collect myself.',
  'Handmade Work',
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- COLOUR ACCURACY
INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-colour-1',
  'Will colours look exactly like the photos?',
  'Please note that colours may appear slightly different across devices and screens. I do my best to represent all pieces as accurately as possible.',
  'Colour Accuracy',
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- RETURNS + EXCHANGES
INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-ret-1',
  'Can I return or exchange a purchase?',
  'Yes. I offer a 30-day return and refund policy on undamaged items (starts from the date of postage).<br/><br/>• Jewellery returns incur a $15 processing fee and postage fees are non-refundable<br/>• Earrings incur an additional $15 fee for hygiene (replacement hooks)<br/>• Artwork returns incur return postage + $15 processing fee<br/>• Items must be returned undamaged in original packaging<br/>• Return shipping is the buyer''s responsibility',
  'Returns + Exchanges',
  1,
  1,
  datetime('now'),
  datetime('now')
);

INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-ret-2',
  'What if my item is damaged or faulty?',
  'I offer a 10-day replacement guarantee for faulty or damaged pieces (starts from postage date).<br/><br/>• Contact me ASAP to arrange a replacement<br/>• Return postage is the buyer''s responsibility unless otherwise agreed<br/>• Once the item is returned, I''ll send your replacement',
  'Returns + Exchanges',
  2,
  1,
  datetime('now'),
  datetime('now')
);

INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-ret-3',
  'What if I received the piece as a gift?',
  'Refunds can only be issued to the original purchaser. However, if you''d like to exchange a gift for another piece:<br/><br/>• Contact me within 30 days of the original purchase<br/>• Exchanges incur standard shipping costs<br/><br/>Get in touch via the <a href="/contact" class="text-clay hover:underline">Contact page</a>, email (lynettetiltart@outlook.com), or Instagram DM',
  'Returns + Exchanges',
  3,
  1,
  datetime('now'),
  datetime('now')
);

-- PRODUCT CARE
INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-care-1',
  'How should I care for my wearable art?',
  'Treat it with love — but not stress.<br/><br/>• Avoid dropping, bending, or scratching<br/>• Wipe with a soft, damp cloth<br/>• Avoid chemical exposure (including perfumes or sprays)<br/>• Store in original packaging to prevent damage or loss',
  'Product Care',
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- COACHING + SERVICES
INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-coach-1',
  'Do you offer coaching?',
  'Yes. I offer private coaching focused on mindset, strategy, and intentional growth for artists, creatives, and business owners.<br/><br/>• Sessions are tailored, strategic, and action-oriented<br/>• Coaching is by application only<br/><br/>Use the <a href="/contact" class="text-clay hover:underline">Contact page</a> and select "coaching" to apply.',
  'Coaching + Services',
  1,
  1,
  datetime('now'),
  datetime('now')
);

INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-coach-2',
  'Can I book you to speak or present to my group, business, or event?',
  'Yes. I speak on topics like creativity, clarity, identity, business, mindset, and personal leadership.<br/><br/>• Available for panels, workshops, podcasts, and private events<br/>• Applications welcome from both creative and non-creative industries<br/><br/>To apply, please reach out via the <a href="/contact" class="text-clay hover:underline">Contact page</a> with your event details.',
  'Coaching + Services',
  2,
  1,
  datetime('now'),
  datetime('now')
);

INSERT INTO faqs (id, question, answer, category, display_order, published, created_at, updated_at)
VALUES (
  'faq-coach-3',
  'Do you run workshops for schools (Years 7–12)?',
  'Yes. I design custom student workshops that combine creative making with mindset, communication, and personal development tools.<br/><br/>• Ideal for enrichment days, leadership programs, or curriculum-linked experiences<br/>• Delivered in person or virtually<br/><br/>Enquiries are welcome from schools, art educators, or wellbeing coordinators — use the <a href="/contact" class="text-clay hover:underline">Contact page</a> to apply.',
  'Coaching + Services',
  3,
  1,
  datetime('now'),
  datetime('now')
);
