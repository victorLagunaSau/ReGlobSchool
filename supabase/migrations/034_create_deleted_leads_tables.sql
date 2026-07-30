-- Create deleted_lead_contacts archive table
CREATE TABLE deleted_lead_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_contact_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  nombre TEXT,
  cargo TEXT,
  telefono TEXT,
  email TEXT,
  es_tomador_decision BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create deleted_lead_attempt_notes archive table
CREATE TABLE deleted_lead_attempt_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_note_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  stage_clave TEXT,
  stage_titulo TEXT,
  attempt_number INTEGER,
  note_type TEXT,
  note_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE deleted_lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_lead_attempt_notes ENABLE ROW LEVEL SECURITY;

-- Policies for deleted_lead_contacts
CREATE POLICY deleted_lead_contacts_read ON deleted_lead_contacts
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

CREATE POLICY deleted_lead_contacts_write ON deleted_lead_contacts
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

-- Policies for deleted_lead_attempt_notes
CREATE POLICY deleted_lead_attempt_notes_read ON deleted_lead_attempt_notes
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

CREATE POLICY deleted_lead_attempt_notes_write ON deleted_lead_attempt_notes
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

-- Indexes
CREATE INDEX idx_deleted_lead_contacts_lead_id ON deleted_lead_contacts(lead_id);
CREATE INDEX idx_deleted_lead_contacts_deleted_at ON deleted_lead_contacts(deleted_at DESC);
CREATE INDEX idx_deleted_lead_attempt_notes_lead_id ON deleted_lead_attempt_notes(lead_id);
CREATE INDEX idx_deleted_lead_attempt_notes_deleted_at ON deleted_lead_attempt_notes(deleted_at DESC);
