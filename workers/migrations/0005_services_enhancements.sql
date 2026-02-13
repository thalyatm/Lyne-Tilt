-- Migration: Services Enhancements (Coaching + Workshops)
-- Adds status workflow, rich content, SEO, scheduling, delivery, and revision history

-- ============================================
-- COACHING PACKAGES: new columns
-- ============================================

ALTER TABLE coaching_packages ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE coaching_packages ADD COLUMN summary TEXT;
ALTER TABLE coaching_packages ADD COLUMN description_html TEXT;
ALTER TABLE coaching_packages ADD COLUMN description_json TEXT;
ALTER TABLE coaching_packages ADD COLUMN cover_image_url TEXT;
ALTER TABLE coaching_packages ADD COLUMN price_type TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE coaching_packages ADD COLUMN duration_minutes INTEGER;
ALTER TABLE coaching_packages ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'online';
ALTER TABLE coaching_packages ADD COLUMN location_label TEXT;
ALTER TABLE coaching_packages ADD COLUMN booking_url TEXT;
ALTER TABLE coaching_packages ADD COLUMN seo_title TEXT;
ALTER TABLE coaching_packages ADD COLUMN seo_description TEXT;
ALTER TABLE coaching_packages ADD COLUMN og_image_url TEXT;
ALTER TABLE coaching_packages ADD COLUMN canonical_url TEXT;
ALTER TABLE coaching_packages ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE coaching_packages ADD COLUMN published_at TEXT;
ALTER TABLE coaching_packages ADD COLUMN scheduled_at TEXT;
ALTER TABLE coaching_packages ADD COLUMN previous_slugs TEXT NOT NULL DEFAULT '[]';

-- Backfill: set existing non-archived items to 'published', archived to 'archived'
UPDATE coaching_packages SET status = 'published', published_at = created_at WHERE archived = 0;
UPDATE coaching_packages SET status = 'archived' WHERE archived = 1;
-- Copy image to cover_image_url for existing rows
UPDATE coaching_packages SET cover_image_url = image WHERE image IS NOT NULL AND image != '';
-- Copy description to summary for existing rows
UPDATE coaching_packages SET summary = description WHERE description IS NOT NULL AND description != '';

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS coaching_packages_status_idx ON coaching_packages(status);

-- ============================================
-- LEARN ITEMS: new columns
-- ============================================

ALTER TABLE learn_items ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE learn_items ADD COLUMN summary TEXT;
ALTER TABLE learn_items ADD COLUMN content_html TEXT;
ALTER TABLE learn_items ADD COLUMN content_json TEXT;
ALTER TABLE learn_items ADD COLUMN cover_image_url TEXT;
ALTER TABLE learn_items ADD COLUMN capacity INTEGER;
ALTER TABLE learn_items ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'online';
ALTER TABLE learn_items ADD COLUMN location_label TEXT;
ALTER TABLE learn_items ADD COLUMN start_at TEXT;
ALTER TABLE learn_items ADD COLUMN end_at TEXT;
ALTER TABLE learn_items ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Australia/Sydney';
ALTER TABLE learn_items ADD COLUMN ticketing_url TEXT;
ALTER TABLE learn_items ADD COLUMN evergreen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE learn_items ADD COLUMN seo_title TEXT;
ALTER TABLE learn_items ADD COLUMN seo_description TEXT;
ALTER TABLE learn_items ADD COLUMN og_image_url TEXT;
ALTER TABLE learn_items ADD COLUMN canonical_url TEXT;
ALTER TABLE learn_items ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE learn_items ADD COLUMN published_at TEXT;
ALTER TABLE learn_items ADD COLUMN scheduled_at TEXT;
ALTER TABLE learn_items ADD COLUMN previous_slugs TEXT NOT NULL DEFAULT '[]';

-- Backfill: set existing non-archived items to 'published', archived to 'archived'
UPDATE learn_items SET status = 'published', published_at = created_at WHERE archived = 0;
UPDATE learn_items SET status = 'archived' WHERE archived = 1;
-- Copy image to cover_image_url for existing rows
UPDATE learn_items SET cover_image_url = image WHERE image IS NOT NULL AND image != '';
-- Copy description to summary for existing rows
UPDATE learn_items SET summary = description WHERE description IS NOT NULL AND description != '';

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS learn_items_status_idx ON learn_items(status);

-- ============================================
-- COACHING REVISIONS: new table
-- ============================================

CREATE TABLE coaching_revisions (
  id TEXT PRIMARY KEY,
  coaching_id TEXT NOT NULL REFERENCES coaching_packages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  description_html TEXT,
  description_json TEXT,
  features TEXT DEFAULT '[]',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX coaching_revisions_coaching_id_idx ON coaching_revisions(coaching_id);
CREATE INDEX coaching_revisions_saved_at_idx ON coaching_revisions(saved_at);

-- ============================================
-- WORKSHOP REVISIONS: new table
-- ============================================

CREATE TABLE workshop_revisions (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL REFERENCES learn_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content_html TEXT,
  content_json TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX workshop_revisions_workshop_id_idx ON workshop_revisions(workshop_id);
CREATE INDEX workshop_revisions_saved_at_idx ON workshop_revisions(saved_at);
