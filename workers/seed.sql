-- Seed initial data for Lyne Tilt

-- Sample Products
INSERT INTO products (id, name, slug, price, currency, category, short_description, long_description, image, badge, rating, review_count, availability, display_order) VALUES
('prod_001', 'Golden Sunrise Earrings', 'golden-sunrise-earrings', '89.00', 'AUD', 'Earrings', 'Handcrafted polymer clay earrings with gold leaf details', 'These stunning earrings feature hand-marbled polymer clay in warm sunrise tones, accented with genuine gold leaf. Each pair is unique and lightweight for comfortable all-day wear. Hypoallergenic stainless steel posts.', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600', 'New', 4.8, 24, 'In stock', 1),
('prod_002', 'Ocean Wave Studs', 'ocean-wave-studs', '65.00', 'AUD', 'Earrings', 'Minimalist wave-inspired stud earrings', 'Inspired by the rolling waves of the Australian coast, these delicate studs capture the essence of the ocean. Made from high-quality polymer clay with a subtle shimmer finish.', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600', NULL, 4.9, 31, 'In stock', 2),
('prod_003', 'Botanical Garden Brooch', 'botanical-garden-brooch', '75.00', 'AUD', 'Brooches', 'Nature-inspired floral brooch', 'A beautiful statement piece featuring hand-sculpted botanical elements. Perfect for adding a touch of nature to any outfit. Secure pin backing with safety clasp.', 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600', 'Bestseller', 4.7, 18, 'In stock', 3),
('prod_004', 'Terrazzo Dreams Necklace', 'terrazzo-dreams-necklace', '120.00', 'AUD', 'Necklaces', 'Modern terrazzo-style pendant necklace', 'A contemporary take on classic terrazzo patterns. This pendant features colourful clay chips set in a creamy base, suspended from a 45cm gold-filled chain.', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600', NULL, 4.6, 12, 'In stock', 4);

-- Sample Coaching Packages
INSERT INTO coaching_packages (id, title, slug, description, features, cta_text, price, price_amount, currency, badge, display_order) VALUES
('coach_001', 'Discovery Session', 'discovery-session', 'A one-hour introductory session to explore your creative goals and how coaching can help you achieve them.', '["60-minute video call", "Goal setting exercise", "Personalised recommendations", "Follow-up action plan"]', 'Book Now', '$150', '150', 'AUD', NULL, 1),
('coach_002', 'Creative Momentum', 'creative-momentum', 'A 4-week program designed to help you build consistent creative habits and overcome blocks.', '["4 x 60-minute sessions", "Weekly accountability check-ins", "Custom exercises and prompts", "Email support between sessions", "Resource library access"]', 'Apply Now', '$550', '550', 'AUD', 'Popular', 2),
('coach_003', 'Transform Your Practice', 'transform-your-practice', 'An intensive 12-week program for serious creatives ready to make significant changes in their artistic journey.', '["12 x 60-minute sessions", "Unlimited email support", "Monthly progress reviews", "Business strategy guidance", "Portfolio development", "Exclusive community access"]', 'Apply Now', '$1,450', '1450', 'AUD', NULL, 3);

-- Sample Learn Items
INSERT INTO learn_items (id, title, slug, subtitle, type, price, price_amount, currency, image, description, duration, format, level, includes, outcomes, display_order) VALUES
('learn_001', 'Polymer Clay Fundamentals', 'polymer-clay-fundamentals', 'Master the basics of polymer clay jewelry making', 'ONLINE', '$149', '149', 'AUD', 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600', 'Learn everything you need to know to start creating beautiful polymer clay jewelry from scratch.', '6 hours', 'Self-paced video course', 'Beginner', '["20+ video lessons", "Downloadable templates", "Supply list", "Private community access"]', '["Condition and prepare clay properly", "Create consistent shapes and textures", "Bake without burning or cracking", "Finish and seal your pieces"]', 1),
('learn_002', 'Advanced Techniques Workshop', 'advanced-techniques-workshop', 'Take your polymer clay skills to the next level', 'WORKSHOP', '$89', '89', 'AUD', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600', 'A hands-on workshop covering advanced techniques including mokume gane, caning, and mica shift.', '3 hours', 'Live online workshop', 'Intermediate', '["Live instruction", "Q&A session", "Recording access", "Material list provided"]', '["Create complex cane patterns", "Master mica shift effects", "Develop your signature style"]', 2);

-- Sample FAQs
INSERT INTO faqs (id, question, answer, category, display_order, published) VALUES
('faq_001', 'How do I care for my polymer clay jewelry?', 'Store your pieces away from direct sunlight and extreme heat. Clean gently with a soft, damp cloth. Avoid harsh chemicals and perfumes. With proper care, polymer clay jewelry can last for years.', 'Shop', 1, 1),
('faq_002', 'What is your shipping policy?', 'We ship Australia-wide with tracking. Orders are dispatched within 2-3 business days. Standard shipping takes 3-7 business days. Express shipping options are available at checkout.', 'Shop', 2, 1),
('faq_003', 'Do you offer refunds or exchanges?', 'Due to the handmade nature of our pieces, we do not offer refunds for change of mind. However, if your item arrives damaged, please contact us within 7 days with photos for a replacement.', 'Shop', 3, 1),
('faq_004', 'How do coaching sessions work?', 'Sessions are conducted via video call (Zoom or Google Meet). After booking, you''ll receive a link to schedule at a time that works for you. Sessions are recorded so you can revisit the conversation.', 'Coaching', 1, 1),
('faq_005', 'What if I need to reschedule?', 'Life happens! You can reschedule with at least 24 hours notice at no charge. Cancellations with less notice may forfeit the session fee.', 'Coaching', 2, 1);

-- Sample Testimonials
INSERT INTO testimonials (id, text, author, role, type, rating, display_order, published) VALUES
('test_001', 'The quality of these earrings is incredible. They''re so lightweight I forget I''m wearing them, and I always get compliments!', 'Sarah M.', 'Verified Buyer', 'shop', 5, 1, 1),
('test_002', 'Working with Lyne completely transformed how I approach my creative practice. I finally feel confident calling myself an artist.', 'Emma K.', 'Coaching Client', 'coaching', 5, 1, 1),
('test_003', 'The polymer clay course was exactly what I needed. Clear instructions, beautiful results. I''ve already made gifts for all my friends!', 'Michelle T.', 'Course Student', 'learn', 5, 1, 1);

-- Site Settings
INSERT INTO site_settings (id, key, value) VALUES
('setting_001', 'site_name', 'Lyne Tilt'),
('setting_002', 'site_tagline', 'Handcrafted Polymer Clay Jewelry & Creative Coaching'),
('setting_003', 'contact_email', 'hello@lynetilt.com'),
('setting_004', 'shipping_threshold', '100'),
('setting_005', 'shipping_cost', '9.95');
