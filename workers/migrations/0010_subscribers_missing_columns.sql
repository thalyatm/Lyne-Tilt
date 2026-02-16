-- Add missing columns to subscribers table
ALTER TABLE subscribers ADD COLUMN first_name TEXT;
ALTER TABLE subscribers ADD COLUMN last_name TEXT;
ALTER TABLE subscribers ADD COLUMN engagement_score INTEGER DEFAULT 0;
ALTER TABLE subscribers ADD COLUMN engagement_level TEXT DEFAULT 'new';
ALTER TABLE subscribers ADD COLUMN last_opened_at TEXT;
ALTER TABLE subscribers ADD COLUMN last_clicked_at TEXT;
ALTER TABLE subscribers ADD COLUMN bounce_count INTEGER DEFAULT 0;
ALTER TABLE subscribers ADD COLUMN last_bounce_at TEXT;
