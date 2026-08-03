-- Agregar user_id a lead_meetings y re-habilitar RLS correctamente

-- 1. Deshabilitamos RLS temporalmente para agregar la columna
ALTER TABLE lead_meetings DISABLE ROW LEVEL SECURITY;

-- 2. Agregamos la columna user_id
ALTER TABLE lead_meetings
ADD COLUMN user_id UUID;

-- 3. Llenamos los valores existentes basados en leads.owner_id
UPDATE lead_meetings
SET user_id = leads.owner_id
FROM leads
WHERE leads.id = lead_meetings.lead_id;

-- 4. Hacemos la columna NOT NULL
ALTER TABLE lead_meetings
ALTER COLUMN user_id SET NOT NULL;

-- 5. Agregamos la restricción FK a auth.users
ALTER TABLE lead_meetings
ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Creamos índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_lead_meetings_user_id ON lead_meetings(user_id);

-- 7. Re-habilitamos RLS
ALTER TABLE lead_meetings ENABLE ROW LEVEL SECURITY;

-- 8. Eliminamos las políticas antiguas si existen
DROP POLICY IF EXISTS lead_meetings_select ON lead_meetings;
DROP POLICY IF EXISTS lead_meetings_insert ON lead_meetings;
DROP POLICY IF EXISTS lead_meetings_update ON lead_meetings;
DROP POLICY IF EXISTS lead_meetings_delete ON lead_meetings;

-- 9. Creamos nuevas políticas RLS que usen user_id directamente
CREATE POLICY lead_meetings_select ON lead_meetings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY lead_meetings_insert ON lead_meetings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY lead_meetings_update ON lead_meetings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY lead_meetings_delete ON lead_meetings
  FOR DELETE USING (user_id = auth.uid());
