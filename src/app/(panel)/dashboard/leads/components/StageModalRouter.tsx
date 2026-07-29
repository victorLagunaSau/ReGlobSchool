'use client';

import React from 'react';
import InitialCampaignModal from './InitialCampaignModal';
import ContactAttemptModal from './ContactAttemptModal';
import ReunionModal from './ReunionModal';

interface StageModalRouterProps {
  stageType: string;
  leadId: string;
  lead: any;
  stage: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSuccessWithNextStage?: (nextStageType: string) => void;
}

export default function StageModalRouter({
  stageType,
  leadId,
  lead,
  stage,
  isOpen,
  onClose,
  onSuccess,
  onSuccessWithNextStage,
}: StageModalRouterProps) {
  if (!isOpen) return null;

  switch (stageType) {
    case 'inicial':
      return (
        <InitialCampaignModal
          isOpen={isOpen}
          lead={lead}
          stage={stage}
          onClose={onClose}
          onCampaignStarted={onSuccess}
        />
      );

    case 'contacto':
    case 'reagendar':
      return (
        <ContactAttemptModal
          isOpen={isOpen}
          leadId={leadId}
          lead={lead}
          stages={[stage]}
          onClose={onClose}
          onTaskResolved={onSuccess}
          onSuccessWithNextStage={onSuccessWithNextStage}
        />
      );

    case 'reunion':
      return (
        <ReunionModal
          isOpen={isOpen}
          leadId={leadId}
          lead={lead}
          stage={stage}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

    case 'cierre':
      // Future implementation for closing stage
      return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <p className="text-center text-slate-600">Etapa de Cierre - Por implementar</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
