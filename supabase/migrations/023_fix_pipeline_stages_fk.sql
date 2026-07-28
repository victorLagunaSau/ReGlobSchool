-- Fix foreign key constraint on stage_outcomes to allow deletion of pipeline stages
-- This migration adds ON DELETE CASCADE so that deleting a stage also deletes its outcomes

-- Drop the existing foreign key constraint (if it exists)
ALTER TABLE stage_outcomes
  DROP CONSTRAINT IF EXISTS stage_outcomes_stage_id_fkey;

-- Add it back with ON DELETE CASCADE
ALTER TABLE stage_outcomes
  ADD CONSTRAINT stage_outcomes_stage_id_fkey
  FOREIGN KEY (stage_id)
  REFERENCES pipeline_stages(id)
  ON DELETE CASCADE;
