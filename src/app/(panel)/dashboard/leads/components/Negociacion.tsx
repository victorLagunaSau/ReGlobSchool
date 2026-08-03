'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { handleAdvanceStage, handleBackStage } from '../utils/baseStageActions';

interface NegociacionProps {
  leadId: string;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    phone?: string;
    email?: string;
  } | null;
  stage: {
    id: string;
    clave: string;
    titulo: string;
    nextStageClave?: string;
    nextStageTitle?: string;
  } | null;
  notes: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function Negociacion({
  leadId,
  lead,
  stage,
  notes,
  onSuccess,
  onCancel,
}: NegociacionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNotes = notes.trim().length >= 10;

  const handleContinue = async () => {
    if (!hasNotes) {
      setError('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    if (!stage?.nextStageClave || !stage?.nextStageTitle) {
      setError('No hay etapa siguiente configurada');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await handleAdvanceStage({
      leadId,
      currentStageClave: stage.clave,
      currentStageTitle: stage.titulo,
      currentStageNumber: 'Negociación',
      nextStageClave: stage.nextStageClave,
      nextStageTitle: stage.nextStageTitle,
      notes,
    });

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Error avanzando a siguiente etapa');
    }

    setIsLoading(false);
  };

  const handleBack = async () => {
    setIsLoading(true);
    setError(null);

    const result = await handleBackStage({
      leadId,
      previousStageClave: '301',
      currentStageTitle: stage?.titulo || 'Negociación',
      currentStageNumber: 'Negociación',
      notes,
    });

    if (result.success) {
      onCancel?.();
    } else {
      setError(result.error || 'Error regresando a etapa anterior');
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{stage?.titulo}</h3>
        <p className="text-xs text-slate-500 mt-1">Tipo Negociación</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Tools Section */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-700">HERRAMIENTAS DE LA ETAPA</p>
        <p className="text-xs text-slate-500">Sin herramientas para esta etapa</p>
      </div>

      {/* Notes Section */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700">
          COMENTARIOS DE ACTIVIDAD *
        </label>
        <p className="text-xs text-slate-500">
          Nota: Los campos se actualizan en tiempo real desde el modal principal
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronLeft size={14} />}
          <span>Atrás</span>
        </button>

        <button
          onClick={handleContinue}
          disabled={isLoading || !hasNotes}
          className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${
            !hasNotes
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title={!hasNotes ? 'Requiere comentario (mínimo 10 caracteres)' : ''}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
          <span>Adelante</span>
        </button>
      </div>
    </div>
  );
}
