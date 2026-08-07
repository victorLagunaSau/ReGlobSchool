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
  onSuccess: (shouldClose?: boolean) => void | Promise<void>;
  onCommentAdded?: () => void;
  onLeadUpdated?: () => void;
  compact?: boolean;
  currentAttempts?: number;
  minAttempts?: number;
  maxAttempts?: number;
  isDisabled?: boolean;
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
  onCommentAdded,
  onLeadUpdated,
  compact = false,
  currentAttempts = 0,
  minAttempts = 0,
  maxAttempts = 0,
  isDisabled = false,
}: ContinueActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  };

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
      const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);

      // 1. Guardar comentario automático PRIMERO
      const { error: autoNoteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${stageTitle} completada - Avanzar a ${nextStageTitle}\n\n${timestamp}`,
        });

      if (autoNoteError) throw autoNoteError;

      // 2. Guardar comentario del usuario DESPUÉS
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${notes.trim()}\n\n${timestamp}`,
        });

      if (noteError) throw noteError;

      // 3. Recargar comentarios inmediatamente después de guardar
      onCommentAdded?.();

      // 4. Actualizar lead al siguiente stage
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: nextStageClave,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 5. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_advance',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Avance a ${nextStageTitle}`,
          message: `Lead avanzó de ${stageTitle} a ${nextStageTitle}: ${notes.trim()}`,
          metadata: {
            from_stage: stageClave,
            to_stage: nextStageClave,
          },
        });

      if (interactionError) throw interactionError;

      // 6. Recargar datos del lead para actualizar el Kanban
      onLeadUpdated?.();

      onSuccess(false);
    } catch (err: any) {
      console.error('Error continuing to next stage:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    const buttonDisabled = hasReachedMaxAttempts || !hasNotes || isDisabled;
    return (
      <button
        onClick={handleContinue}
        disabled={isLoading || buttonDisabled}
        className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
          buttonDisabled
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
        title={isDisabled ? 'Cancela la acción actual primero' : !hasNotes ? 'Requiere comentario (mínimo 10 caracteres)' : hasReachedMaxAttempts ? 'Límite máximo de intentos alcanzado. Solo puedes eliminar el lead.' : ''}
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
