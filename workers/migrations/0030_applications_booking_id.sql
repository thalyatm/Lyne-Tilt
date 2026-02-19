-- Add bookingId column to coaching_applications for linking discovery call bookings
ALTER TABLE coaching_applications ADD COLUMN booking_id TEXT REFERENCES coaching_bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS applications_booking_id_idx ON coaching_applications(booking_id);
