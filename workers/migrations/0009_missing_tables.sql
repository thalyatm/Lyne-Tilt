-- Create missing tables: email_templates, email_events, import_jobs, wall_art_products

-- EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  blocks TEXT NOT NULL DEFAULT '[]',
  thumbnail TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'Custom',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS email_templates_name_idx ON email_templates(name);
CREATE INDEX IF NOT EXISTS email_templates_is_default_idx ON email_templates(is_default);
CREATE INDEX IF NOT EXISTS email_templates_category_idx ON email_templates(category);

-- EMAIL EVENTS
CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sent_email_id TEXT NOT NULL REFERENCES sent_emails(id) ON DELETE CASCADE,
  subscriber_email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  link_url TEXT,
  link_index INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS email_events_sent_email_idx ON email_events(sent_email_id);
CREATE INDEX IF NOT EXISTS email_events_subscriber_email_idx ON email_events(subscriber_email);
CREATE INDEX IF NOT EXISTS email_events_event_type_idx ON email_events(event_type);

-- IMPORT JOBS
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'importing', 'completed', 'failed')),
  total_rows INTEGER,
  valid_rows INTEGER,
  imported_rows INTEGER,
  skipped_duplicates INTEGER,
  skipped_invalid INTEGER,
  skipped_suppressed INTEGER,
  default_source TEXT,
  default_tags TEXT,
  column_mapping TEXT,
  errors TEXT,
  imported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs(status);
CREATE INDEX IF NOT EXISTS import_jobs_imported_by_idx ON import_jobs(imported_by);

-- WALL ART PRODUCTS
CREATE TABLE IF NOT EXISTS wall_art_products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  category TEXT NOT NULL CHECK (category IN ('Prints', 'Originals', 'Mixed Media')),
  short_description TEXT,
  long_description TEXT,
  dimensions TEXT,
  image TEXT NOT NULL,
  detail_images TEXT DEFAULT '[]',
  badge TEXT,
  rating REAL,
  review_count INTEGER DEFAULT 0,
  availability TEXT NOT NULL DEFAULT 'In stock',
  archived INTEGER NOT NULL DEFAULT 0,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS wall_art_products_slug_idx ON wall_art_products(slug);
CREATE INDEX IF NOT EXISTS wall_art_products_category_idx ON wall_art_products(category);
CREATE INDEX IF NOT EXISTS wall_art_products_archived_idx ON wall_art_products(archived);
