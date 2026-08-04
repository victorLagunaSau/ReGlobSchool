/**
 * Configuración de etapas por clave
 * Las herramientas se definen por TIPO, no por clave
 * Múltiples claves pueden tener el mismo tipo y compartir herramientas
 *
 * Ejemplo:
 * - Clave 102 "Contacto Inicial" → Tipo: contacto → herramientas de contacto
 * - Clave 105 "Reagendar Llamada" → Tipo: contacto → MISMAS herramientas de contacto
 */

export type StageClave = '101' | '102' | '103' | '104' | '201' | '301' | '401' | string;
export type StageType = 'inicial' | 'contacto' | 'reunion' | 'documentacion' | 'exito' | 'negociacion' | 'cierre' | string;

interface StageConfig {
  tipo: StageType; // Define qué herramientas usar
  actions: string; // Define qué acciones mostrar
  minAttempts?: number;
  nextStageClave?: string;
  nextStageTitle?: string;
  failStageClave?: string; // Si Falla → Regresar a:
  failStageTitle?: string;
  successStageClave?: string; // Éxito → Continuar a:
  successStageTitle?: string;
}

// Herramientas definidas por TIPO (no por clave)
// Múltiples etapas pueden compartir el mismo tipo
export const toolsByType: Record<StageType, string[]> = {
  'inicial': ['calendar'],
  'contacto': ['contact-channel'],
  'reunion': [],
  'documentacion': [],
  'exito': [],
  'negociacion': [],
  'cierre': [],
};

// Configuración de etapas: clave → propiedades (incluyendo tipo)
export const stageConfig: Record<StageClave, StageConfig> = {
  // Etapa 1 - Inicial (Iniciar Campaña)
  '101': {
    tipo: 'inicial',
    actions: 'calendarize',
    nextStageClave: '102',
    nextStageTitle: 'Contacto Inicial',
  },

  // Etapa 2 - Contacto (Contacto Inicial)
  '102': {
    tipo: 'contacto',
    actions: 'contact-attempt',
    minAttempts: 6,
    nextStageClave: '103',
    nextStageTitle: 'Reunión de Demostración',
  },

  // Etapa 3 - Reunión (Reunión de Demostración)
  '103': {
    tipo: 'reunion',
    actions: 'reunion',
    nextStageClave: '104',
    nextStageTitle: 'Propuesta',
    failStageClave: '102',
    failStageTitle: 'Contacto Inicial',
    successStageClave: '999',
    successStageTitle: 'Cierre de Lead',
  },

  // Etapa 4 - Propuesta
  '104': {
    tipo: 'reunion',
    actions: 'proposal',
    nextStageClave: '201',
    nextStageTitle: 'Documentación',
    failStageClave: '103',
    failStageTitle: 'Reunión de Demostración',
    successStageClave: '201',
    successStageTitle: 'Documentación',
  },

  // Etapa 5 - Documentación
  '201': {
    tipo: 'documentacion',
    actions: 'documentacion',
    nextStageClave: '202',
    nextStageTitle: 'Éxito',
  },

  // Etapa 6 - Éxito
  '301': {
    tipo: 'exito',
    actions: 'exito',
    nextStageClave: '302',
    nextStageTitle: 'Negociación',
  },

  // Etapa 7 - Negociación
  '401': {
    tipo: 'negociacion',
    actions: 'negociacion',
  },

  // Etapa 9 - Cierre de Lead
  '999': {
    tipo: 'cierre',
    actions: 'cierre',
  },
};

export const getStageConfig = (clave: string): StageConfig | null => {
  return stageConfig[clave] || null;
};

export const getToolsByType = (tipo: StageType): string[] => {
  return toolsByType[tipo] || [];
};
