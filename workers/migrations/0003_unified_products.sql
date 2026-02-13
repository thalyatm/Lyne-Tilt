-- Migration: Unified Product Management System (Phase 1)
-- Adds new columns to products table, creates product_media and slug_redirects tables,
-- migrates wall_art_products data into products, and extends activity_log.

-- ============================================
-- STEP 1: Add new columns to products table
-- ============================================

-- Product type discriminator (wearable, wall-art, digital)
ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'wearable';

-- Extended pricing
ALTER TABLE products ADD COLUMN compare_at_price TEXT;
ALTER TABLE products ADD COLUMN cost_price TEXT;
ALTER TABLE products ADD COLUMN taxable INTEGER NOT NULL DEFAULT 1;

-- Organisation
ALTER TABLE products ADD COLUMN tags TEXT DEFAULT '[]';

-- Physical attributes
ALTER TABLE products ADD COLUMN weight_grams INTEGER;
ALTER TABLE products ADD COLUMN dimensions TEXT;

-- Inventory tracking
ALTER TABLE products ADD COLUMN track_inventory INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN continue_selling INTEGER NOT NULL DEFAULT 0;

-- Lifecycle status
ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE products ADD COLUMN published_at TEXT;
ALTER TABLE products ADD COLUMN scheduled_for TEXT;

-- SEO
ALTER TABLE products ADD COLUMN meta_title TEXT;
ALTER TABLE products ADD COLUMN meta_description TEXT;
ALTER TABLE products ADD COLUMN og_image TEXT;

-- Soft delete
ALTER TABLE products ADD COLUMN deleted_at TEXT;

-- Relax category constraint: allow wall-art categories too
-- SQLite doesn't support ALTER COLUMN, so we need to work with TEXT type (already TEXT, no CHECK constraint in original)

-- New indexes
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_product_type_idx ON products(product_type);
CREATE INDEX IF NOT EXISTS products_deleted_at_idx ON products(deleted_at);
CREATE INDEX IF NOT EXISTS products_status_type_deleted_idx ON products(status, product_type, deleted_at);

-- Set existing products: archived=true → status='archived', else status='active'
UPDATE products SET status = 'archived' WHERE archived = 1;
UPDATE products SET status = 'active', published_at = created_at WHERE archived = 0;

-- ============================================
-- STEP 2: Migrate wall_art_products into products
-- ============================================

INSERT INTO products (
  id, product_type, name, slug, price, currency, category,
  short_description, long_description, dimensions, image, detail_images,
  badge, rating, review_count, availability, archived,
  stripe_product_id, stripe_price_id, display_order,
  track_inventory, quantity, continue_selling, taxable, tags,
  status, published_at, created_at, updated_at
)
SELECT
  id, 'wall-art', name, slug, price, currency, category,
  short_description, long_description, dimensions, image, detail_images,
  badge, rating, review_count, availability, archived,
  stripe_product_id, stripe_price_id, display_order,
  1, 1, 0, 1, '[]',
  CASE WHEN archived = 1 THEN 'archived' ELSE 'active' END,
  CASE WHEN archived = 0 THEN created_at ELSE NULL END,
  created_at, updated_at
FROM wall_art_products;

-- ============================================
-- STEP 3: Create product_media table
-- ============================================

CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS product_media_product_id_idx ON product_media(product_id);
CREATE INDEX IF NOT EXISTS product_media_sort_order_idx ON product_media(sort_order);

-- ============================================
-- STEP 4: Create slug_redirects table
-- ============================================

CREATE TABLE IF NOT EXISTS slug_redirects (
  id TEXT PRIMARY KEY,
  old_slug TEXT NOT NULL UNIQUE,
  new_slug TEXT NOT NULL,
  product_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS slug_redirects_old_slug_idx ON slug_redirects(old_slug);

-- ============================================
-- STEP 5: Extend activity_log
-- ============================================

ALTER TABLE activity_log ADD COLUMN changed_fields TEXT;
ALTER TABLE activity_log ADD COLUMN entity_snapshot TEXT;

-- ============================================
-- STEP 6: Migrate existing product images to product_media
-- (Each product's main image + detail images become media records)
-- ============================================

-- Note: This is handled in application code during the first server boot,
-- since we need to generate UUIDs and parse JSON arrays which SQLite
-- cannot do natively in migrations. See seed/migrate script.

-- wall_art_products table is kept for rollback safety (read-only from now on)
