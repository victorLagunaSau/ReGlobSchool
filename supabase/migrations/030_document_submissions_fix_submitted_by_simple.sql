-- Simplest fix: make submitted_by nullable
-- This allows inserts without requiring access to auth.users table

ALTER TABLE document_submissions
ALTER COLUMN submitted_by DROP NOT NULL;
