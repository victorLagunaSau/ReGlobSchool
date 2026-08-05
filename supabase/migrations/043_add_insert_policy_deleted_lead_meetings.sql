-- Add INSERT policy for deleted_lead_meetings
-- Allow inserting when deleting own leads or as admin

CREATE POLICY deleted_lead_meetings_insert ON deleted_lead_meetings
  FOR INSERT WITH CHECK (
    auth.uid() = deleted_by OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
  );
