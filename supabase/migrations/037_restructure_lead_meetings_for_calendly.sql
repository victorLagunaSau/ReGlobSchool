-- Reestructurar lead_meetings para Calendly workflow sin webhook
-- Key es lead_id (no invitee_email)

-- Verificar si la tabla existe, si no crearla
CREATE TABLE IF NOT EXISTS lead_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE, -- Una reunión por lead, UNIQUE asegura esto
  status TEXT DEFAULT 'pendiente', -- pendiente, agendada, cancelada, realizada

  -- Datos capturados del widget Calendly
  invitee_name TEXT,
  invitee_email TEXT,
  invitee_phone TEXT,
  invitee_timezone TEXT,

  -- Datos del evento
  event_type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,

  -- Links
  calendly_uri TEXT, -- Link del evento en Calendly (ej: calendly.com/...)
  zoom_uri TEXT,     -- Link de Zoom si Calendly lo genera

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_lead_meetings_lead_id ON lead_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_meetings_status ON lead_meetings(status);
CREATE INDEX IF NOT EXISTS idx_lead_meetings_created ON lead_meetings(created_at DESC);

-- RLS: Usuario solo ve reuniones de sus leads
ALTER TABLE lead_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_meetings_select ON lead_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_meetings.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

CREATE POLICY lead_meetings_insert ON lead_meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_meetings.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

CREATE POLICY lead_meetings_update ON lead_meetings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_meetings.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

CREATE POLICY lead_meetings_delete ON lead_meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_meetings.lead_id
      AND leads.owner_id = auth.uid()
    )
  );
