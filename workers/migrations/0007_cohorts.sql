-- Migration: Cohorts System
-- Adds cohort scheduling, sessions, enrollments for workshops/courses

-- ============================================
-- COHORTS (scheduled instances of workshops)
-- ============================================

CREATE TABLE cohorts (
  id TEXT PRIMARY KEY,
  learn_item_id TEXT NOT NULL REFERENCES learn_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  internal_notes TEXT,

  -- Scheduling
  start_at TEXT,
  end_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  registration_opens_at TEXT,
  registration_closes_at TEXT,

  -- Capacity
  capacity INTEGER,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  waitlist_enabled INTEGER NOT NULL DEFAULT 0,
  waitlist_capacity INTEGER,
  waitlist_count INTEGER NOT NULL DEFAULT 0,

  -- Pricing (overrides learn_item when set)
  price TEXT,
  compare_at_price TEXT,
  early_bird_price TEXT,
  early_bird_ends_at TEXT,
  currency TEXT NOT NULL DEFAULT 'AUD',

  -- Delivery (overrides learn_item when set)
  delivery_mode TEXT,
  location_label TEXT,
  location_address TEXT,
  meeting_url TEXT,

  -- Facilitator
  instructor_name TEXT,
  instructor_email TEXT,

  -- Duplication tracking
  duplicated_from_id TEXT,

  -- Lifecycle timestamps
  published_at TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX cohorts_learn_item_id_idx ON cohorts(learn_item_id);
CREATE INDEX cohorts_status_idx ON cohorts(status);
CREATE UNIQUE INDEX cohorts_slug_idx ON cohorts(slug);
CREATE INDEX cohorts_start_at_idx ON cohorts(start_at);
CREATE INDEX cohorts_status_start_idx ON cohorts(status, start_at);

-- ============================================
-- COHORT SESSIONS (individual class dates)
-- ============================================

CREATE TABLE cohort_sessions (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  session_number INTEGER NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  duration_minutes INTEGER,
  location_label TEXT,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX cohort_sessions_cohort_id_idx ON cohort_sessions(cohort_id);
CREATE INDEX cohort_sessions_start_at_idx ON cohort_sessions(start_at);

-- ============================================
-- COHORT ENROLLMENTS
-- ============================================

CREATE TABLE cohort_enrollments (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_id TEXT REFERENCES customer_users(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price_paid TEXT,
  currency TEXT NOT NULL DEFAULT 'AUD',
  payment_method TEXT,

  -- Waitlist
  waitlist_position INTEGER,
  waitlist_added_at TEXT,
  promoted_from_waitlist_at TEXT,

  -- Cancellation
  cancelled_at TEXT,
  cancellation_reason TEXT,
  refunded_at TEXT,
  refund_amount TEXT,

  -- Admin
  enrolled_by TEXT NOT NULL DEFAULT 'admin',
  internal_notes TEXT,

  -- Timestamps
  enrolled_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX cohort_enrollments_cohort_id_idx ON cohort_enrollments(cohort_id);
CREATE INDEX cohort_enrollments_customer_email_idx ON cohort_enrollments(customer_email);
CREATE INDEX cohort_enrollments_status_idx ON cohort_enrollments(status);
CREATE UNIQUE INDEX cohort_enrollments_cohort_email_idx ON cohort_enrollments(cohort_id, customer_email);

-- ============================================
-- COHORT ATTENDANCE
-- ============================================

CREATE TABLE cohort_attendance (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES cohort_sessions(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES cohort_enrollments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present',
  checked_in_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX cohort_attendance_session_id_idx ON cohort_attendance(session_id);
CREATE INDEX cohort_attendance_enrollment_id_idx ON cohort_attendance(enrollment_id);
CREATE UNIQUE INDEX cohort_attendance_session_enrollment_idx ON cohort_attendance(session_id, enrollment_id);
