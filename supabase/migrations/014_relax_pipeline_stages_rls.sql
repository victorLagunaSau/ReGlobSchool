-- Relax pipeline_stages RLS to allow authorized users to create stages
-- Previously only admins could create, now any authorized user can

-- Drop existing policy
DROP POLICY IF EXISTS pipeline_stages_admin_write ON pipeline_stages;

-- Create new policy that allows authorized users to create/edit/delete
CREATE POLICY pipeline_stages_authorized_write ON pipeline_stages
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

-- Keep read policy as is (everyone can read)
-- The read policy was already permissive, so no changes needed there
