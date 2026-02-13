-- Create suppression list table for email bounce/complaint tracking
CREATE TABLE IF NOT EXISTS suppression_list (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'manual', 'consecutive_soft_bounce')),
  source TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS suppression_list_email_idx ON suppression_list(email);
CREATE INDEX IF NOT EXISTS suppression_list_reason_idx ON suppression_list(reason);
