'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface ContinueActionProps {
  leadId: string;
  stageTitle: string;
  stageNumber: string;
  stageClave: string;
  nextStageClave: string;
  nextStageTitle: string;
  notes: string;
  onSuccess: (shouldClose?: boolean) => void;
  compact?: boolean;
  currentAttempts?: number;
  minAttempts?: number;
  maxAttempts?: number;
}

export default function ContinueAction({
  leadId,
  stageTitle,
  stageNumber,
  stageClave,
  nextStageClave,
  nextStageTitle,
  notes,
  onSuccess,
  compact = false,
  currentAttempts = 0,
  minAttempts = 0,
  maxAttempts = 0,
}: ContinueActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNotes = notes.trim().length >= 10;
  const hasReachedMaxAttempts = currentAttempts >= maxAttempts && maxAttempts > 0;

  const handleContinue = async () => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Guardar nota de transición
      const now = new Date();
      const autoCompletedNotes = `${notes}\n\n${stageTitle} (Etapa ${stageNumber})\nAvanzar a: ${nextStageTitle}\nFecha: ${now.toLocaleDateString('es-ES')}`;

      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: autoCompletedNotes,
        });

      if (noteError) throw noteError;

      // 2. Actualizar lead al siguiente stage
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: nextStageClave,
          current_stage_attempts: 0, // Reset contador para nueva etapa
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 3. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_advance',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Avance a ${nextStageTitle}`,
          message: `Lead avanzó de ${stageTitle} a ${nextStageTitle}`,
          metadata: {
            from_stage: stageClave,
            to_stage: nextStageClave,
          },
        });

      if (interactionError) throw interactionError;

      onSuccess(); // Llamar sin parámetros para ejecutar el callback normal (refrescar Kanban)
    } catch (err: any) {
      console.error('Error continuing to next stage:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleContinue}
        disabled={isLoading || hasReachedMaxAttempts}
        className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
          hasReachedMaxAttempts
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
        title={hasReachedMaxAttempts ? 'Límite máximo de intentos alcanzado. Solo puedes eliminar el lead.' : ''}
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
        <span>Avanzar</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full px-2 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1.5"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
        <span>Avanzar</span>
      </button>
    </div>
  );
}
