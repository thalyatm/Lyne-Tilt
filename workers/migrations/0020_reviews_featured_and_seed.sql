-- Drop and recreate product_reviews with nullable product_id, featured flag, and product_name
-- Safe because the table is currently empty (no customer reviews submitted yet)

DROP TABLE IF EXISTS product_reviews;

CREATE TABLE product_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6)))),
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  customer_id TEXT REFERENCES customer_users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
  is_verified_purchase INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  admin_response TEXT,
  responded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_status ON product_reviews(status);
CREATE INDEX idx_product_reviews_customer ON product_reviews(customer_email);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_featured ON product_reviews(featured);

-- Seed the 15 real store reviews
-- product_id will be set via a subquery matching product name; NULL if product doesn't exist

INSERT INTO product_reviews (id, product_id, product_name, customer_name, customer_email, rating, body, status, is_verified_purchase, featured, created_at, updated_at)
VALUES
  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name = 'She Basked in Silence' LIMIT 1),
   'She Basked in Silence',
   'Jennifer M', 'reviewer-jennifer-m@store.review', 5, NULL, 'approved', 1, 0,
   '2025-10-09T00:00:00.000Z', '2025-10-09T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name = 'Black Boots & Big Scarves Were Her Aphrodisiacs' LIMIT 1),
   'Black Boots & Big Scarves Were Her Aphrodisiacs',
   'Denise F', 'reviewer-denise-f@store.review', 5,
   'These earrings are so fun and so me! Lyne''s craftsmanship is superior and she knows how to make women feel beautiful AND fun at the same time. These are fantastic and I get compliments about them every time I wear them!',
   'approved', 1, 0,
   '2025-03-07T00:00:00.000Z', '2025-03-07T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name = 'Long Weekends in Melbourne Filled Her Heart & Her Head' LIMIT 1),
   'Long Weekends in Melbourne Filled Her Heart & Her Head',
   'Jenny M', 'reviewer-jenny-m@store.review', 5,
   'The problem I have is to only choose 1 pair of earrings!! I love everything Lyne makes, so to narrow it down to 1 pair is difficult!!',
   'approved', 1, 0,
   '2024-11-28T00:00:00.000Z', '2024-11-28T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name = 'She Saved Her Pennies for Today' LIMIT 1),
   'She Saved Her Pennies for Today',
   'Tricia W', 'reviewer-tricia-w@store.review', 5,
   'Gorgeous, quirky earrings that look fabulous and get so many comments - I love them',
   'approved', 1, 0,
   '2024-11-21T00:00:00.000Z', '2024-11-21T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%She Saved Her Pennies%' LIMIT 1),
   'She Saved Her Pennies for Today',
   'Cathie T', 'reviewer-cathie-t@store.review', 5,
   'Beautiful earrings. So loved the style, craftsmanship and colour that I put through three purchases. Discover the joy of wearing Lyne''s beautiful jewellery. You won''t be disappointed. Might just have to order one more pair...',
   'approved', 1, 0,
   '2024-11-18T00:00:00.000Z', '2024-11-18T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%When She Swam%' LIMIT 1),
   'PURE INFATUATION: When She Swam it Was as if the World Stood Still...',
   'Karen Watson M', 'reviewer-karen-m@store.review', 5,
   'Lyne''s work is awesome. The quality and feel of her jewellery is lovely and each piece is totally unique. Real wow factor. Can''t fault service or customer care. Lyne is a gem. I''ve been following her for a while on IG and just love what she does and who she seems to be. She''s been an inspiration to me.',
   'approved', 1, 0,
   '2024-11-17T00:00:00.000Z', '2024-11-17T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   NULL,
   'KAREN''s Order',
   'Karen Watson M', 'reviewer-karen-m2@store.review', 5, NULL, 'approved', 1, 0,
   '2024-11-17T00:00:00.000Z', '2024-11-17T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%And So She Wrote Poetry%' LIMIT 1),
   'PURE INFATUATION: And So She Wrote Poetry',
   'Susan S', 'reviewer-susan-s@store.review', 5,
   'Just about every piece of jewellery is something I want to buy. The hardest job is choosing. Lovely earrings, fantastic quality...just can''t rate Lynetilt high enough.',
   'approved', 1, 0,
   '2024-04-09T00:00:00.000Z', '2024-04-09T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%Polymer Week Artist Silkscreens%' LIMIT 1),
   'Polymer Week Artist Silkscreens',
   'Cheryl Y', 'reviewer-cheryl-y@store.review', 5,
   'Thanks Lyne, this silkscreen set arrived quickly and safely. Of the 5 or 6 silkscreen sets which were released by Lucy recently, yours is by far the most attractive, IMHO. Much love, Cheryl xxx',
   'approved', 1, 0,
   '2024-03-13T00:00:00.000Z', '2024-03-13T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%There Was No Reason She Couldn%' LIMIT 1),
   'PURE INFATUATION: There Was No Reason She Couldn''t',
   'Margaret R', 'reviewer-margaret-r@store.review', 5,
   'Lyne, your website was very easy to deal with. Shipping was prompt and I LOVE the earrings. Thank you for your great work. One comment, not a criticism. I believe prices should always include the GST, rather than be listed separately. Thanks Marg',
   'approved', 1, 0,
   '2024-03-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%Oh Audrey%How I Miss%' LIMIT 1),
   'PURE INFATUATION: Oh Audrey - How I Miss Your Understated Glamour',
   'Mary-ann W', 'reviewer-maryann-w@store.review', 5,
   'Absolutely love Lyne''s work. I have a number of her pieces and they always receive lots of compliments and coordinate with my outfits beautifully.',
   'approved', 1, 0,
   '2024-02-29T00:00:00.000Z', '2024-02-29T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%Polymer Week Artist Silkscreens%' LIMIT 1),
   'Polymer Week Artist Silkscreens',
   'Anne M', 'reviewer-anne-m@store.review', 5,
   'Excellent product. Love it',
   'approved', 1, 0,
   '2024-02-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%Polymer Week Artist Silkscreens%' LIMIT 1),
   'Polymer Week Artist Silkscreens',
   'Carol H', 'reviewer-carol-h@store.review', 5,
   'So much fabulous inspiration and great quality items from this really lovely, friendly seller. Thank you',
   'approved', 1, 0,
   '2023-12-28T00:00:00.000Z', '2023-12-28T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%Polymer Week Artist Silkscreens%' LIMIT 1),
   'Polymer Week Artist Silkscreens',
   'Jennifer M', 'reviewer-jennifer-m2@store.review', 5,
   'Love my set of Lyne Tilt silkscreens. It is a pleasure to deal with Lyne. She is a very thoughtful person and I can thoroughly recommend purchasing from her.',
   'approved', 1, 0,
   '2023-12-28T00:00:00.000Z', '2023-12-28T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%ELEMENTS%FULL SET STENCILS%' LIMIT 1),
   'ELEMENTS - FULL SET STENCILS (10 stencils)',
   'Shelley B', 'reviewer-shelley-b@store.review', 5,
   'Love these stencils, can''t wait to try them all!',
   'approved', 1, 0,
   '2023-12-07T00:00:00.000Z', '2023-12-07T00:00:00.000Z'),

  (lower(hex(randomblob(16))),
   (SELECT id FROM products WHERE name LIKE '%BLACK+WHITE%Digi-Paper%LIGHTLY LAYERED%' LIMIT 1),
   'BLACK+WHITE - Digi-Paper_LIGHTLY LAYERED',
   'Carol H', 'reviewer-carol-h2@store.review', 5,
   'These stencils and digi paper''s encourage and inspire so much creativity and they are amazing quality. I''m having so much fun. Thank you',
   'approved', 1, 0,
   '2023-10-20T00:00:00.000Z', '2023-10-20T00:00:00.000Z');
