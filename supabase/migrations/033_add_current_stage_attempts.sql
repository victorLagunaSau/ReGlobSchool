-- Migration: Add current_stage_attempts counter to leads
-- Tracks attempts in the current stage (resets to 0 when status changes)
-- Distinct from lead_attempt_notes which maintains full historical audit trail

ALTER TABLE public.leads
  ADD COLUMN current_stage_attempts INTEGER DEFAULT 0 CHECK (current_stage_attempts >= 0);

CREATE INDEX idx_leads_current_stage_attempts ON public.leads(current_stage_attempts);

-- When lead status changes, reset attempts counter
CREATE OR REPLACE FUNCTION reset_stage_attempts_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.current_stage_attempts := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_stage_attempts
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION reset_stage_attempts_on_status_change();
