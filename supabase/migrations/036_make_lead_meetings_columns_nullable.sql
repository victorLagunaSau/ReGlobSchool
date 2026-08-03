-- Make lead_meetings columns nullable to support webhook-driven creation
-- Allows creating empty records that get filled in by webhook

ALTER TABLE lead_meetings
  ALTER COLUMN event_type DROP NOT NULL,
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL,
  ALTER COLUMN invitee_email DROP NOT NULL,
  ALTER COLUMN invitee_name DROP NOT NULL;
