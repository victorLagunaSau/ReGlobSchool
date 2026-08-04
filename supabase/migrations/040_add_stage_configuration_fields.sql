-- Migración: Agregar configuración de etapas (Si Falla → Regresar a:, Éxito → Continuar a:)
-- Permite que cada etapa defina dinámicamente hacia dónde ir en caso de falla o éxito

ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS fail_stage_clave TEXT REFERENCES public.pipeline_stages(clave) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fail_stage_titulo TEXT,
  ADD COLUMN IF NOT EXISTS success_stage_clave TEXT REFERENCES public.pipeline_stages(clave) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS success_stage_titulo TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.pipeline_stages.fail_stage_clave IS 'Si Falla → Regresar a: etapa clave de destino';
COMMENT ON COLUMN public.pipeline_stages.fail_stage_titulo IS 'Si Falla → Regresar a: título de etapa para display';
COMMENT ON COLUMN public.pipeline_stages.success_stage_clave IS 'Éxito → Continuar a: etapa clave de destino';
COMMENT ON COLUMN public.pipeline_stages.success_stage_titulo IS 'Éxito → Continuar a: título de etapa para display';
