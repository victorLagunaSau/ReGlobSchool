-- Comprehensive fix for all foreign key constraints involving pipeline_stages
-- This ensures stages can be deleted without cascade issues

-- 1. Fix stage_outcomes FK to stage_id (delete outcomes when stage is deleted)
ALTER TABLE stage_outcomes
  DROP CONSTRAINT IF EXISTS stage_outcomes_stage_id_fkey CASCADE;

ALTER TABLE stage_outcomes
  ADD CONSTRAINT stage_outcomes_stage_id_fkey
  FOREIGN KEY (stage_id)
  REFERENCES pipeline_stages(id)
  ON DELETE CASCADE;

-- 2. Fix stage_outcomes FK to next_stage_id (nullify outcome if target stage deleted)
ALTER TABLE stage_outcomes
  DROP CONSTRAINT IF EXISTS stage_outcomes_next_stage_id_fkey CASCADE;

ALTER TABLE stage_outcomes
  ADD CONSTRAINT stage_outcomes_next_stage_id_fkey
  FOREIGN KEY (next_stage_id)
  REFERENCES pipeline_stages(id)
  ON DELETE SET NULL;

-- 3. Fix pipeline_stages self-reference: siguiente_etapa_id (nullify if deleted)
ALTER TABLE pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_siguiente_etapa_id_fkey CASCADE;

ALTER TABLE pipeline_stages
  ADD CONSTRAINT pipeline_stages_siguiente_etapa_id_fkey
  FOREIGN KEY (siguiente_etapa_id)
  REFERENCES pipeline_stages(id)
  ON DELETE SET NULL;

-- 4. Fix pipeline_stages self-reference: continuar_a_id (nullify if deleted)
ALTER TABLE pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_continuar_a_id_fkey CASCADE;

ALTER TABLE pipeline_stages
  ADD CONSTRAINT pipeline_stages_continuar_a_id_fkey
  FOREIGN KEY (continuar_a_id)
  REFERENCES pipeline_stages(id)
  ON DELETE SET NULL;

-- 5. Fix pipeline_stages self-reference: regresar_a_id (nullify if deleted)
ALTER TABLE pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_regresar_a_id_fkey CASCADE;

ALTER TABLE pipeline_stages
  ADD CONSTRAINT pipeline_stages_regresar_a_id_fkey
  FOREIGN KEY (regresar_a_id)
  REFERENCES pipeline_stages(id)
  ON DELETE SET NULL;
