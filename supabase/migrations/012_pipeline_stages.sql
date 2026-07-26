-- Create pipeline_stages table with editable stage configuration
CREATE TABLE pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,  -- Unique identifier (e.g., 'prospecto', 'llamada')
  titulo TEXT NOT NULL,         -- Display title (e.g., 'Prospecto')
  descripcion TEXT,             -- What happens in this stage
  objetivo TEXT,                -- Commercial goal/intent
  orden INT NOT NULL,           -- Display order in pipeline
  limite_pospuestas INT DEFAULT 3, -- Max allowed postponements before forced action
  intentos_requeridos INT DEFAULT 1, -- Required contact attempts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial data matching existing LEAD_STATUSES
INSERT INTO pipeline_stages (clave, titulo, descripcion, objetivo, orden, limite_pospuestas, intentos_requeridos) VALUES
('prospecto', 'Prospecto', 'Lead inicial sin contacto', 'Identificar cliente potencial', 1, 3, 1),
('llamada', 'Llamada', 'Contacto inicial realizado', 'Valorar interés y disponibilidad', 2, 3, 2),
('negociacion', 'Negociación', 'Negociación de términos', 'Alinear propuesta comercial', 3, 3, 2),
('sociedad_comercial', 'Sociedad Comercial', 'Acuerdo comercial activo', 'Socios activos y pagantes', 4, 0, 1),
('descartado', 'Descartado', 'Lead no viable', 'Registrar razón de rechazo', 5, 0, 0);

-- Ensure data consistency (only admins can modify)
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_stages_read ON pipeline_stages
  FOR SELECT USING (TRUE);

CREATE POLICY pipeline_stages_admin_write ON pipeline_stages
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true AND role = 'Administrador'));

-- Index for efficient stage lookups
CREATE INDEX idx_pipeline_stages_orden ON pipeline_stages(orden);
CREATE INDEX idx_pipeline_stages_clave ON pipeline_stages(clave);
