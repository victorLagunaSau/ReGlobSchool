import { NextResponse } from 'next/server';

/**
 * GET /api/setup/migrations
 * Returns SQL statements for manual execution in Supabase SQL Editor
 */

export async function GET() {
  const sqlSetup = `-- Setup SQL for Leads Pipeline Configuration
-- Execute this in Supabase SQL Editor

-- 1. Pipeline Stages Table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  objetivo TEXT,
  orden INT NOT NULL,
  limite_pospuestas INT DEFAULT 3,
  intentos_requeridos INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pipeline_stages (clave, titulo, descripcion, objetivo, orden, limite_pospuestas, intentos_requeridos) VALUES
('prospecto', 'Prospecto', 'Lead inicial sin contacto', 'Identificar cliente potencial', 1, 3, 1),
('llamada', 'Llamada', 'Contacto inicial realizado', 'Valorar interés y disponibilidad', 2, 3, 2),
('negociacion', 'Negociación', 'Negociación de términos', 'Alinear propuesta comercial', 3, 3, 2),
('sociedad_comercial', 'Sociedad Comercial', 'Acuerdo comercial activo', 'Socios activos y pagantes', 4, 0, 1),
('descartado', 'Descartado', 'Lead no viable', 'Registrar razón de rechazo', 5, 0, 0)
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_stages_read ON pipeline_stages;
CREATE POLICY pipeline_stages_read ON pipeline_stages FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS pipeline_stages_admin_write ON pipeline_stages;
CREATE POLICY pipeline_stages_admin_write ON pipeline_stages FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true AND role = 'Administrador'));

-- 2. Deleted Leads Archive
CREATE TABLE IF NOT EXISTS deleted_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_lead_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  zone_id UUID,
  country_id TEXT,
  state_id TEXT,
  status TEXT,
  source TEXT,
  owner_id UUID,
  deletion_reason TEXT,
  deletion_note TEXT,
  deleted_by UUID NOT NULL REFERENCES profiles(id),
  original_created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

ALTER TABLE deleted_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deleted_leads_read ON deleted_leads;
CREATE POLICY deleted_leads_read ON deleted_leads FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

DROP POLICY IF EXISTS deleted_leads_admin_write ON deleted_leads;
CREATE POLICY deleted_leads_admin_write ON deleted_leads FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true AND role = 'Administrador'));

-- 3. Lead Interactions
CREATE TABLE IF NOT EXISTS lead_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action_label TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_interactions_read ON lead_interactions;
CREATE POLICY lead_interactions_read ON lead_interactions FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

DROP POLICY IF EXISTS lead_interactions_write ON lead_interactions;
CREATE POLICY lead_interactions_write ON lead_interactions FOR INSERT
  USING (auth.uid() = actor_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_orden ON pipeline_stages(orden);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_clave ON pipeline_stages(clave);
CREATE INDEX IF NOT EXISTS idx_deleted_leads_deleted_at ON deleted_leads(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id, created_at DESC);`;

  return NextResponse.json({
    message: 'Execute this SQL in Supabase SQL Editor',
    sql: sqlSetup,
  });
}
