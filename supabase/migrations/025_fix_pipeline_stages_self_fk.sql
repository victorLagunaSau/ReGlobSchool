-- Fix self-referencing foreign keys in pipeline_stages
-- This allows deleting stages even if other stages reference them as destinations

ALTER TABLE pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_continuar_a_id_fkey;

ALTER TABLE pipeline_stages
  ADD CONSTRAINT pipeline_stages_continuar_a_id_fkey
  FOREIGN KEY (continuar_a_id)
  REFERENCES pipeline_stages(id)
  ON DELETE SET NULL;

ALTER TABLE pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_regresar_a_id_fkey;

ALTER TABLE pipeline_stages
  ADD CONSTRAINT pipeline_stages_regresar_a_id_fkey
  FOREIGN KEY (regresar_a_id)
  REFERENCES pipeline_stages(id)
  ON DELETE SET NULL;
