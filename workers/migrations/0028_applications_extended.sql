-- Add new columns to coaching_applications
ALTER TABLE coaching_applications ADD COLUMN referred_from TEXT DEFAULT NULL;
ALTER TABLE coaching_applications ADD COLUMN scheduled_call_at TEXT DEFAULT NULL;
ALTER TABLE coaching_applications ADD COLUMN scheduled_call_timezone TEXT DEFAULT 'Australia/Sydney';

-- Migrate existing statuses to new values
UPDATE coaching_applications SET status = 'contacted_awaiting' WHERE status = 'contacted';
UPDATE coaching_applications SET status = 'complete_closed' WHERE status = 'closed';
