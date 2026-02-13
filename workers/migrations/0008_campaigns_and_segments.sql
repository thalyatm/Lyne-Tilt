-- Migration: Create campaigns, campaign_events, and segments tables

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  preheader TEXT,
  body TEXT NOT NULL DEFAULT '[]',
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  audience TEXT NOT NULL DEFAULT 'all',
  segment_id TEXT,
  segment_filters TEXT,
  scheduled_for TEXT,
  scheduled_timezone TEXT,
  sent_at TEXT,
  recipient_count INTEGER,
  recipient_snapshot TEXT,
  delivered_count INTEGER DEFAULT 0,
  test_sent_to TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_scheduled_for_idx ON campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS campaigns_sent_at_idx ON campaigns(sent_at);
CREATE INDEX IF NOT EXISTS campaigns_created_by_idx ON campaigns(created_by);

CREATE TABLE IF NOT EXISTS campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  subscriber_id TEXT REFERENCES subscribers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_events_campaign_id_idx ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_events_subscriber_id_idx ON campaign_events(subscriber_id);
CREATE INDEX IF NOT EXISTS campaign_events_event_type_idx ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS campaign_events_created_at_idx ON campaign_events(created_at);
CREATE INDEX IF NOT EXISTS campaign_events_campaign_event_idx ON campaign_events(campaign_id, event_type);

CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT NOT NULL,
  subscriber_count INTEGER DEFAULT 0,
  last_calculated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS segments_name_idx ON segments(name);
