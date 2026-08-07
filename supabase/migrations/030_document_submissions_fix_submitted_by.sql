-- Fix submitted_by column to support automatic auth.uid() assignment
-- Drop NOT NULL constraint to allow NULL values
ALTER TABLE document_submissions
ALTER COLUMN submitted_by DROP NOT NULL,
ALTER COLUMN submitted_by SET DEFAULT auth.uid();

-- Create a trigger to automatically set submitted_by on insert if not provided
CREATE OR REPLACE FUNCTION set_document_submission_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_by IS NULL THEN
    NEW.submitted_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_document_submission_user ON document_submissions;
CREATE TRIGGER trigger_set_document_submission_user
BEFORE INSERT ON document_submissions
FOR EACH ROW
EXECUTE FUNCTION set_document_submission_user();
