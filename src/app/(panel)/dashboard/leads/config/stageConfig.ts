/**
 * Configuración de etapas por clave
 * Define qué herramientas y accionables se cargan en cada etapa
 */

export type StageClave = '101' | '102' | '103' | '104' | string;

interface StageToolConfig {
  tools: string[]; // ['calendar', 'phones', 'emails', 'progress', 'decision-makers']
  actions: string; // 'calendarize' | 'contact-outcome' | 'reunion'
  minAttempts?: number;
  nextStageClave?: string;
  nextStageTitle?: string;
}

export const stageConfig: Record<StageClave, StageToolConfig> = {
  // Etapa 1 - Inicial (Iniciar Campaña)
  '101': {
    tools: ['calendar'],
    actions: 'calendarize',
    nextStageClave: '102',
    nextStageTitle: 'Contacto Inicial',
  },

  // Etapa 2 - Contacto (Contacto Inicial)
  '102': {
    tools: ['contact-channel'],
    actions: 'contact-attempt',
    minAttempts: 6,
    nextStageClave: '103',
    nextStageTitle: 'Reunión de Demostración',
  },

  // Etapa 3 - Reunión (Reunión de Demostración)
  '103': {
    tools: [],
    actions: 'reunion',
    nextStageClave: '104',
    nextStageTitle: 'Propuesta',
  },

  // Etapa 4 - Propuesta
  '104': {
    tools: [],
    actions: 'proposal',
  },
};

export const getStageConfig = (clave: string): StageToolConfig | null => {
  return stageConfig[clave] || null;
};
