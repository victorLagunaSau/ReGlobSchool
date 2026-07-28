-- Migration: Add stage type system and success metrics
-- Adds flexibility to support different workflows (Inicial, Contacto, Reunion, Cierre, Reagendar)

-- Add new columns to pipeline_stages
ALTER TABLE public.pipeline_stages
  ADD COLUMN tipo TEXT NOT NULL DEFAULT 'contacto',
  ADD COLUMN tasa_exito DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN siguiente_etapa_id UUID REFERENCES public.pipeline_stages(id),
  ADD CONSTRAINT check_tipo CHECK (tipo IN ('inicial', 'contacto', 'reunion', 'cierre', 'reagendar'));

-- Create index for siguiente_etapa_id lookups
CREATE INDEX idx_pipeline_stages_siguiente_etapa ON public.pipeline_stages(siguiente_etapa_id);

-- Update existing stages with tipo and forward links
-- Etapa 1: prospecto (inicial) → Etapa 2: llamada
UPDATE public.pipeline_stages
SET tipo = 'inicial', tasa_exito = 2, siguiente_etapa_id = (
  SELECT id FROM public.pipeline_stages WHERE clave = 'llamada' LIMIT 1
)
WHERE clave = 'prospecto';

-- Etapa 2: llamada (contacto) → Etapa 3: reunion (will be created)
UPDATE public.pipeline_stages
SET tipo = 'contacto', tasa_exito = 20
WHERE clave = 'llamada';

-- Etapa 3: negociacion → Etapa 4: sociedad_comercial (rename to reflect actual use)
UPDATE public.pipeline_stages
SET tipo = 'reunion', tasa_exito = 20, siguiente_etapa_id = (
  SELECT id FROM public.pipeline_stages WHERE clave = 'sociedad_comercial' LIMIT 1
)
WHERE clave = 'negociacion';

-- Etapa 4: sociedad_comercial (cierre)
UPDATE public.pipeline_stages
SET tipo = 'cierre', tasa_exito = 95, siguiente_etapa_id = NULL
WHERE clave = 'sociedad_comercial';

-- Etapa 5: descartado (terminal, no next stage)
UPDATE public.pipeline_stages
SET tipo = 'contacto', tasa_exito = 0, siguiente_etapa_id = NULL
WHERE clave = 'descartado';

-- Insert new stage: Reagendar Reunion (Etapa 3B)
-- This stage appears after reunion cancellation
INSERT INTO public.pipeline_stages (clave, titulo, descripcion, objetivo, orden, limite_pospuestas, intentos_requeridos, tipo, tasa_exito, siguiente_etapa_id)
SELECT
  'reagendar_reunion',
  'Reagendar Reunión',
  'Reagendamiento de reunión cancelada',
  'Reagendar demostración en nueva fecha',
  3.5,  -- Between reunion (3) and sociedad_comercial (4)
  4,
  1,
  'contacto',  -- Uses same contact workflow
  0,  -- 0% success - only leads to rescheduled reunion or discard
  (SELECT id FROM public.pipeline_stages WHERE clave = 'negociacion' LIMIT 1)  -- Back to reunion attempt
FROM public.pipeline_stages
WHERE clave = 'prospecto' LIMIT 1;  -- Just to check if table is not empty

-- Update llamada to point to negociacion (which is now reunion)
UPDATE public.pipeline_stages
SET siguiente_etapa_id = (
  SELECT id FROM public.pipeline_stages WHERE clave = 'negociacion' LIMIT 1
)
WHERE clave = 'llamada';
