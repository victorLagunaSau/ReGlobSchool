-- Tabla de auditoría: deleted_lead_meetings
-- Estructura idéntica a lead_meetings + campos de auditoría

CREATE TABLE IF NOT EXISTS deleted_lead_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencia al registro original
  original_meeting_id UUID NOT NULL,
  original_lead_id UUID,

  -- Estructura idéntica a lead_meetings
  lead_id UUID NOT NULL,
  status TEXT DEFAULT 'pendiente',
  invitee_name TEXT,
  invitee_email TEXT,
  invitee_phone TEXT,
  invitee_timezone TEXT,
  event_type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  calendly_uri TEXT,
  zoom_uri TEXT,

  -- Auditoría
  deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_reason TEXT,

  -- Timestamps originales
  original_created_at TIMESTAMP WITH TIME ZONE,
  original_updated_at TIMESTAMP WITH TIME ZONE,

  -- Backup en JSON
  metadata JSONB
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_deleted_lead_meetings_original_id ON deleted_lead_meetings(original_meeting_id);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_meetings_lead_id ON deleted_lead_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_meetings_deleted_at ON deleted_lead_meetings(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_meetings_deleted_by ON deleted_lead_meetings(deleted_by);

-- RLS: Solo administradores y quien lo eliminó pueden ver
ALTER TABLE deleted_lead_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY deleted_lead_meetings_select ON deleted_lead_meetings
  FOR SELECT USING (
    auth.uid() = deleted_by OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY deleted_lead_meetings_view_own_lead ON deleted_lead_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = deleted_lead_meetings.lead_id
      AND leads.owner_id = auth.uid()
    )
  );
