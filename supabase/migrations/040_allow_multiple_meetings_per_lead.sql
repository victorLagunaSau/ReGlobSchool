-- Permitir múltiples reuniones por lead
-- Remover constraint UNIQUE en lead_id para evitar duplicidad en DB
-- La UI controlará la lógica de negocio (solo mostrar agendar si no hay activa)

-- Remover constraint UNIQUE en lead_id
ALTER TABLE lead_meetings DROP CONSTRAINT lead_meetings_lead_id_key;

-- Crear índice normal (sin UNIQUE) para queries rápidas
CREATE INDEX IF NOT EXISTS idx_lead_meetings_lead_id ON lead_meetings(lead_id);
