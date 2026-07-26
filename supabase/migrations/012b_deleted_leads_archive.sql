-- Create deleted_leads archive table for soft-delete tracking with full history preservation
CREATE TABLE deleted_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_lead_id UUID NOT NULL, -- Reference to original lead (not FK, allows tracking after deletion)
  business_name TEXT NOT NULL,
  business_type TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  zone_id UUID,
  country_id TEXT,
  state_id TEXT,
  status TEXT, -- Final status when archived
  source TEXT, -- Original source
  owner_id UUID, -- Who owned it
  deletion_reason TEXT, -- Why it was deleted/archived
  deletion_note TEXT, -- Admin notes
  deleted_by UUID NOT NULL REFERENCES profiles(id),
  original_created_at TIMESTAMPTZ, -- Original lead creation date
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- Snapshot of full lead data for future analysis
);

-- Ensure RLS: Only authorized users can read deleted leads (for analytics)
ALTER TABLE deleted_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY deleted_leads_read ON deleted_leads
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

CREATE POLICY deleted_leads_admin_write ON deleted_leads
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true AND role = 'Administrador'));

-- Indexes for efficient queries
CREATE INDEX idx_deleted_leads_deleted_at ON deleted_leads(deleted_at DESC);
CREATE INDEX idx_deleted_leads_original_lead_id ON deleted_leads(original_lead_id);
CREATE INDEX idx_deleted_leads_deleted_by ON deleted_leads(deleted_by);
