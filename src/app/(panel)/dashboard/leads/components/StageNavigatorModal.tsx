'use client';

import React, { useState, useEffect } from 'react';
import StageModal from './StageModal';

interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  tipo?: string;
  orden?: number;
  siguiente_etapa_id?: string | null;
}

interface StageNavigatorModalProps {
  isOpen: boolean;
  leadId: string;
  lead: any;
  stages: PipelineStage[];
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * StageNavigatorModal
 * Detecta la etapa actual del lead y abre StageModal universal
 * StageModal cargará dinámicamente las herramientas y accionables
 */
export default function StageNavigatorModal({
  isOpen,
  leadId,
  lead,
  stages,
  onClose,
  onRefresh,
}: StageNavigatorModalProps) {
  const [currentStageClave, setCurrentStageClave] = useState<string | null>(null);
  const [initialStageSet, setInitialStageSet] = useState(false);

  // Detectar la etapa actual del lead por su status (clave)
  useEffect(() => {
    if (isOpen && !initialStageSet && lead?.status && stages.length > 0) {
      setCurrentStageClave(lead.status);
      setInitialStageSet(true);
    }
  }, [isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStageClave(null);
      setInitialStageSet(false);
    }
  }, [isOpen]);

  const currentStage = stages.find(s => s.clave === currentStageClave);

  if (!isOpen || !currentStage) return null;

  return (
    <StageModal
      isOpen={isOpen}
      leadId={leadId}
      lead={lead}
      stage={currentStage}
      onClose={onClose}
      onSuccess={onRefresh}
    />
  );
}
