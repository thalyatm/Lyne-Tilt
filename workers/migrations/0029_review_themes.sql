-- Add theme column to product_reviews
ALTER TABLE product_reviews ADD COLUMN theme TEXT;

-- Bulk-update reviews that have a productId: use the product's product_type
UPDATE product_reviews
SET theme = (
  SELECT product_type FROM products WHERE products.id = product_reviews.product_id
)
WHERE product_id IS NOT NULL;

-- For reviews without a productId, keyword match on body/title
UPDATE product_reviews
SET theme = 'wearable'
WHERE product_id IS NULL
  AND theme IS NULL
  AND (
    LOWER(body) LIKE '%earring%' OR LOWER(title) LIKE '%earring%'
    OR LOWER(body) LIKE '%necklace%' OR LOWER(title) LIKE '%necklace%'
    OR LOWER(body) LIKE '%bracelet%' OR LOWER(title) LIKE '%bracelet%'
    OR LOWER(body) LIKE '%ring%' OR LOWER(title) LIKE '%ring%'
    OR LOWER(body) LIKE '%jewel%' OR LOWER(title) LIKE '%jewel%'
    OR LOWER(body) LIKE '%pendant%' OR LOWER(title) LIKE '%pendant%'
  );

UPDATE product_reviews
SET theme = 'wall-art'
WHERE product_id IS NULL
  AND theme IS NULL
  AND (
    LOWER(body) LIKE '%print%' OR LOWER(title) LIKE '%print%'
    OR LOWER(body) LIKE '%canvas%' OR LOWER(title) LIKE '%canvas%'
    OR LOWER(body) LIKE '%frame%' OR LOWER(title) LIKE '%frame%'
    OR LOWER(body) LIKE '%painting%' OR LOWER(title) LIKE '%painting%'
    OR LOWER(body) LIKE '%art%' OR LOWER(title) LIKE '%art%'
  );
