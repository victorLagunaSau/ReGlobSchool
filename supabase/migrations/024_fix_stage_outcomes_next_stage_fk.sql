-- Fix foreign key constraint for next_stage_id in stage_outcomes
-- This allows deleting stages that are referenced as next_stage destinations

ALTER TABLE stage_outcomes
  DROP CONSTRAINT IF EXISTS stage_outcomes_next_stage_id_fkey;

ALTER TABLE stage_outcomes
  ADD CONSTRAINT stage_outcomes_next_stage_id_fkey
  FOREIGN KEY (next_stage_id)
  REFERENCES pipeline_stages(id)
  ON DELETE CASCADE;
