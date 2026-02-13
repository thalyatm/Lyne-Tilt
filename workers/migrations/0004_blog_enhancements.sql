-- Blog Enhancements: status workflow, versions, redirects
-- =========================================================

-- 1. Add new columns to blog_posts
ALTER TABLE blog_posts ADD COLUMN content_json TEXT;
ALTER TABLE blog_posts ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE blog_posts ADD COLUMN scheduled_at TEXT;
ALTER TABLE blog_posts ADD COLUMN author_name TEXT;
ALTER TABLE blog_posts ADD COLUMN og_image_url TEXT;
ALTER TABLE blog_posts ADD COLUMN canonical_url TEXT;

-- 2. Indexes for status and date
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_date_idx ON blog_posts(date);

-- 3. Backfill status from existing published boolean
UPDATE blog_posts SET status = 'published' WHERE published = 1;
UPDATE blog_posts SET status = 'draft' WHERE published = 0;

-- 4. Blog post versions table
CREATE TABLE IF NOT EXISTS blog_post_versions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_json TEXT,
  excerpt TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS blog_post_versions_post_id_idx ON blog_post_versions(post_id);
CREATE INDEX IF NOT EXISTS blog_post_versions_saved_at_idx ON blog_post_versions(saved_at);

-- 5. Blog post redirects table (SEO slug changes)
CREATE TABLE IF NOT EXISTS blog_post_redirects (
  id TEXT PRIMARY KEY,
  from_slug TEXT NOT NULL,
  to_slug TEXT NOT NULL,
  post_id TEXT REFERENCES blog_posts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_post_redirects_from_slug_idx ON blog_post_redirects(from_slug);
