-- Migration: Add additional pipeline stage types
-- Adds documentacion, exito, and negociacion types to support expanded workflow

-- 1. Drop the existing constraint
ALTER TABLE public.pipeline_stages
  DROP CONSTRAINT IF EXISTS check_tipo;

-- 2. Add the new constraint with additional types
ALTER TABLE public.pipeline_stages
  ADD CONSTRAINT check_tipo CHECK (tipo IN ('inicial', 'contacto', 'reunion', 'cierre', 'reagendar', 'documentacion', 'exito', 'negociacion'));
