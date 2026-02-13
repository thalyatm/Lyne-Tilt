-- Email Automations
CREATE TABLE IF NOT EXISTS email_automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('newsletter_signup', 'purchase', 'coaching_inquiry', 'contact_form', 'manual')),
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused')),
  steps TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS email_automations_trigger_idx ON email_automations(trigger);
CREATE INDEX IF NOT EXISTS email_automations_status_idx ON email_automations(status);

-- Automation Queue
CREATE TABLE IF NOT EXISTS automation_queue (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,
  automation_name TEXT,
  step_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  scheduled_for TEXT NOT NULL,
  sent_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS automation_queue_automation_id_idx ON automation_queue(automation_id);
CREATE INDEX IF NOT EXISTS automation_queue_recipient_email_idx ON automation_queue(recipient_email);
CREATE INDEX IF NOT EXISTS automation_queue_status_idx ON automation_queue(status);
CREATE INDEX IF NOT EXISTS automation_queue_scheduled_for_idx ON automation_queue(scheduled_for);
