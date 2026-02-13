-- Migration: Add email automation template fields and new trigger types
-- Recreates email_automations with expanded trigger CHECK and template columns

CREATE TABLE email_automations_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN (
    'newsletter_signup', 'purchase', 'coaching_inquiry', 'contact_form', 'manual',
    'form_submission_received', 'order_placed', 'order_fulfilled_or_delivered', 'cart_abandoned'
  )),
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused')),
  steps TEXT DEFAULT '[]',
  subject TEXT,
  preview_text TEXT,
  body_text TEXT,
  body_html TEXT,
  cta_label TEXT,
  cta_url TEXT,
  footer_text TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  send_delay_days INTEGER NOT NULL DEFAULT 0,
  send_delay_hours INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  one_time_per_recipient INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TEXT,
  total_triggered INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy existing data (only columns guaranteed from 0002 migration)
INSERT INTO email_automations_new (id, name, description, trigger, status, steps, created_at, updated_at)
SELECT id, name, description, trigger, status, steps, created_at, updated_at
FROM email_automations;

DROP TABLE email_automations;

ALTER TABLE email_automations_new RENAME TO email_automations;

CREATE INDEX email_automations_trigger_idx ON email_automations(trigger);
CREATE INDEX email_automations_status_idx ON email_automations(status);
CREATE INDEX email_automations_enabled_idx ON email_automations(enabled);
