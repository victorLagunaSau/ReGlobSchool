-- Migración: Poblar configuración de etapas desde el pipeline existente
-- Establece los valores fail/success stage para cada etapa según la lógica del pipeline

UPDATE public.pipeline_stages
SET 
  fail_stage_clave = '102',
  fail_stage_titulo = 'Contacto Inicial'
WHERE clave = '103';

UPDATE public.pipeline_stages
SET 
  success_stage_clave = '999',
  success_stage_titulo = 'Cierre de Lead'
WHERE clave = '103';

UPDATE public.pipeline_stages
SET 
  fail_stage_clave = '103',
  fail_stage_titulo = 'Reunión de Demostración'
WHERE clave = '104';

UPDATE public.pipeline_stages
SET 
  success_stage_clave = '201',
  success_stage_titulo = 'Intercambio de documentos'
WHERE clave = '104';
