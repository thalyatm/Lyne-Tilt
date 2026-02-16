-- Coach availability windows (recurring weekly schedule)
CREATE TABLE IF NOT EXISTS coach_availability (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  day_of_week INTEGER NOT NULL,  -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TEXT NOT NULL,       -- "09:00"
  end_time TEXT NOT NULL,         -- "17:00"
  slot_duration INTEGER NOT NULL DEFAULT 60,  -- minutes per slot
  timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Blocked dates (holidays, time off, etc.)
CREATE TABLE IF NOT EXISTS coach_blocked_dates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  blocked_date TEXT NOT NULL,     -- "2025-03-15"
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON coach_blocked_dates(blocked_date);

-- Individual coaching session bookings
CREATE TABLE IF NOT EXISTS coaching_bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id TEXT REFERENCES customer_users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  coaching_package_id TEXT REFERENCES coaching_packages(id),
  package_name TEXT,
  session_date TEXT NOT NULL,     -- "2025-02-20"
  start_time TEXT NOT NULL,       -- "10:00"
  end_time TEXT NOT NULL,         -- "11:00"
  timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, confirmed, completed, cancelled, no_show
  meeting_url TEXT,
  notes TEXT,                     -- admin notes
  customer_notes TEXT,            -- customer notes when booking
  cancelled_at TEXT,
  cancel_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON coaching_bookings(session_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON coaching_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON coaching_bookings(customer_id);
