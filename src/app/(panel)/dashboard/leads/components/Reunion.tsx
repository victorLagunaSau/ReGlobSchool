'use client';

import React, { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface ReunionProps {
  leadId: string;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    phone?: string;
    email?: string;
  } | null;
  notes: string;
  stage: {
    id: string;
    clave: string;
    titulo: string;
    nextStageClave?: string;
    nextStageTitle?: string;
  } | null;
  eventScheduled: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function Reunion({
  leadId,
  lead,
  notes,
  stage,
  eventScheduled,
  onSuccess,
  onCancel,
}: ReunionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const hasNotes = notes.trim().length >= 10;

  return (
    <div className="space-y-3">
      {!eventScheduled && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">No hay reunión agendada. Completa el Paso 1 primero.</p>
        </div>
      )}

      {eventScheduled && (
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronLeft size={14} />}
            <span>Reunión Cancelada</span>
          </button>

          <button
            onClick={onSuccess}
            disabled={isLoading || !hasNotes}
            className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${
              !hasNotes
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={!hasNotes ? 'Requiere comentarios (mínimo 10 caracteres)' : ''}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            <span>Reunión Realizada</span>
          </button>
        </div>
      )}
    </div>
  );
}
