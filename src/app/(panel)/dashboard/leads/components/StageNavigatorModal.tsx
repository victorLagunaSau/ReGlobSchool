'use client';

import React, { useState, useEffect } from 'react';
import InitialCampaignModal from './InitialCampaignModal';
import ContactAttemptModal from './ContactAttemptModal';
import ReunionModal from './ReunionModal';

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

export default function StageNavigatorModal({
  isOpen,
  leadId,
  lead,
  stages,
  onClose,
  onRefresh,
}: StageNavigatorModalProps) {
  const [currentStageType, setCurrentStageType] = useState<string | null>(null);
  const [initialStageSet, setInitialStageSet] = useState(false);

  // Detectar la etapa actual del lead solo cuando se abre el modal
  useEffect(() => {
    if (isOpen && !initialStageSet && lead?.status && stages.length > 0) {
      const currentStage = stages.find(s => s.clave === lead.status);
      if (currentStage?.tipo) {
        setCurrentStageType(currentStage.tipo);
        setInitialStageSet(true);
      }
    }
  }, [isOpen]);

  const handleStageChange = (nextStageType: string) => {
    setCurrentStageType(nextStageType);
    onRefresh();
  };

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStageType(null);
      setInitialStageSet(false);
    }
  }, [isOpen]);

  const currentStage = stages.find(s => s.tipo === currentStageType);

  if (!isOpen || !currentStage) return null;

  // Renderizar el módulo correspondiente a la etapa actual
  switch (currentStageType) {
    case 'inicial':
      return (
        <InitialCampaignModal
          isOpen={isOpen}
          lead={lead}
          stage={currentStage}
          onClose={onClose}
          onCampaignStarted={() => {
            handleStageChange('contacto');
          }}
        />
      );

    case 'contacto':
    case 'reagendar':
      return (
        <ContactAttemptModal
          isOpen={isOpen}
          leadId={leadId}
          lead={lead}
          stages={[currentStage]}
          onClose={onClose}
          onTaskResolved={onRefresh}
          onSuccessWithNextStage={(nextStageType: string) => {
            handleStageChange(nextStageType);
          }}
        />
      );

    case 'reunion':
      return (
        <ReunionModal
          isOpen={isOpen}
          leadId={leadId}
          lead={lead}
          stage={currentStage}
          onClose={onClose}
          onSuccess={() => {
            handleStageChange('cierre');
          }}
        />
      );

    default:
      return null;
  }
}
