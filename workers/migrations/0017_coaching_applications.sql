-- Coaching Applications (discovery call requests from public form)
CREATE TABLE IF NOT EXISTS coaching_applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  reason TEXT,
  preferred_package TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS coaching_applications_status_idx ON coaching_applications(status);
CREATE INDEX IF NOT EXISTS coaching_applications_created_at_idx ON coaching_applications(created_at);
CREATE INDEX IF NOT EXISTS coaching_applications_email_idx ON coaching_applications(email);
