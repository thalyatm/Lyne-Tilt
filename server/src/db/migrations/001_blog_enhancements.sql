-- Migration: Blog Enhancements
-- Adds: status enum, new columns on blog_posts & blog_post_versions,
--        blog_post_redirects table, data migration from published boolean to status enum.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).

BEGIN;

-- ============================================
-- 1. Create blog_post_status enum
-- ============================================

DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Add new columns to blog_posts
-- ============================================

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS content_json  text,
  ADD COLUMN IF NOT EXISTS status        blog_post_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_at  timestamp,
  ADD COLUMN IF NOT EXISTS author_name   varchar(255),
  ADD COLUMN IF NOT EXISTS og_image_url  text,
  ADD COLUMN IF NOT EXISTS canonical_url text;

-- Index on status for filtered queries
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts (status);

-- ============================================
-- 3. Migrate existing data: published boolean → status enum
-- ============================================

UPDATE blog_posts SET status = 'published' WHERE published = true  AND status = 'draft';
UPDATE blog_posts SET status = 'draft'     WHERE published = false AND status = 'draft';

-- Back-fill author_name from users table where authorId exists
UPDATE blog_posts bp
SET author_name = u.name
FROM users u
WHERE bp.author_id = u.id
  AND bp.author_name IS NULL;

-- ============================================
-- 4. Add new columns to blog_post_versions
-- ============================================

ALTER TABLE blog_post_versions
  ADD COLUMN IF NOT EXISTS content_json text,
  ADD COLUMN IF NOT EXISTS created_by   uuid REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 5. Create blog_post_redirects table
-- ============================================

CREATE TABLE IF NOT EXISTS blog_post_redirects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_slug  varchar(255) NOT NULL,
  to_slug    varchar(255) NOT NULL,
  post_id    uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_post_redirects_from_slug_idx
  ON blog_post_redirects (from_slug);

COMMIT;
