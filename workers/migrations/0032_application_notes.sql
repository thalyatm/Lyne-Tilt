-- Migration: Add timestamped notes for coaching applications
-- Similar to client_notes but for the application pipeline

CREATE TABLE IF NOT EXISTS application_notes (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES coaching_applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS application_notes_app_id_idx ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS application_notes_created_at_idx ON application_notes(created_at);
