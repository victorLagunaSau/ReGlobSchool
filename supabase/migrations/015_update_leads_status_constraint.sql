-- Migration: Update leads status constraint to accept pipeline stage claves
-- This allows status to be any pipeline stage clave instead of hardcoded values

ALTER TABLE public.leads
DROP CONSTRAINT "leads_status_check";

ALTER TABLE public.leads
ADD CONSTRAINT leads_status_valid CHECK (status IS NOT NULL);

-- Note: We could add a foreign key check to pipeline_stages.clave, but for now
-- we allow any non-null value to maintain flexibility with dynamic stages.
