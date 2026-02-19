-- Coaching Clients table
CREATE TABLE IF NOT EXISTS coaching_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'prospect',
  source TEXT NOT NULL DEFAULT 'other',
  current_package_id TEXT REFERENCES coaching_packages(id) ON DELETE SET NULL,
  goals TEXT,
  notes TEXT,
  communication_preference TEXT,
  important_dates TEXT DEFAULT '[]',
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS coaching_clients_status_idx ON coaching_clients(status);
CREATE INDEX IF NOT EXISTS coaching_clients_email_idx ON coaching_clients(email);

-- Client Notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES coaching_clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  session_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS client_notes_client_id_idx ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS client_notes_type_idx ON client_notes(type);

-- Add clientId FK to coaching_bookings (skip if column already exists)
-- Using CREATE TABLE trick to check column existence
CREATE INDEX IF NOT EXISTS bookings_client_id_idx ON coaching_bookings(client_id);

-- Add clientId FK to coaching_applications (skip if column already exists)
CREATE INDEX IF NOT EXISTS applications_client_id_idx ON coaching_applications(client_id);
