'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface CalendarizeActionProps {
  leadId: string;
  startDate: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSuccess: () => void;
  onCommentAdded?: () => void;
  onLeadUpdated?: () => void;
  isSubmitting?: boolean;
  stageClave?: string;
  stage?: any;
}

export default function CalendarizeAction({
  leadId,
  startDate,
  notes,
  onNotesChange,
  onSuccess,
  onCommentAdded,
  onLeadUpdated,
  isSubmitting = false,
  stageClave,
  stage,
}: CalendarizeActionProps) {
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

  const generateComment = async (stageClave: string, stageTitle: string, date: string) => {
    const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);
    const { error } = await supabase.from('lead_attempt_notes').insert({
      lead_id: leadId,
      stage_clave: stageClave,
      stage_titulo: stageTitle,
      attempt_number: 1,
      note_type: 'success',
      note_text: `${stageTitle} - Reunión agendada para ${date}\n\n${timestamp}`,
    });
    if (error) throw error;
  };

  const handleCalendarize = async () => {
    // Validaciones
    if (!startDate) {
      setError('Selecciona una fecha de inicio');
      return;
    }

    if (!notes.trim() || notes.trim().length < 10) {
      setError('Los comentarios deben tener al menos 10 caracteres');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener la siguiente etapa desde continuar_a_id
      if (!stage?.continuar_a_id) {
        throw new Error(`No hay etapa siguiente configurada. Stage actual: clave=${stage?.clave}, id=${stage?.id}, continuar_a_id=${stage?.continuar_a_id}`);
      }

      const { data: nextStageData, error: nextStageError } = await supabase
        .from('pipeline_stages')
        .select('clave')
        .eq('id', stage.continuar_a_id)
        .single();

      if (nextStageError) throw nextStageError;
      const nextStageClave = nextStageData?.clave;

      // Generar comentario automático PRIMERO
      await generateComment(stage.clave, stage.titulo, startDate);

      // Guardar nota del usuario DESPUÉS
      const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stage.clave,
          stage_titulo: stage.titulo,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${notes.trim()}\n\n${timestamp}`,
        });

      if (noteError) throw noteError;

      // Actualizar estado del lead y guardar fecha de trabajo
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: nextStageClave,
          day_task: startDate,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Registrar interacción
      const user = await supabase.auth.getUser();
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'task_outcome',
          actor_id: user.data.user?.id,
          action_label: 'Campaña iniciada',
          message: `Campaña iniciada para ${startDate}: ${notes.trim()}`,
          metadata: {
            start_date: startDate,
          },
        });

      if (interactionError) throw interactionError;

      // Notificar que se agregó comentario
      onCommentAdded?.();

      // Recargar datos del lead para actualizar el Kanban
      onLeadUpdated?.();

      // Actualizar el modal sin cerrar (para mostrar la siguiente etapa)
      onSuccess?.(false);
    } catch (err: any) {
      console.error('Error in CalendarizeAction:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const hasNotes = notes.trim().length >= 10;

  return (
    <div className="space-y-4">
      {/* TARJETA 2: COMENTARIOS DE ACTIVIDAD */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-green-900 uppercase tracking-wide">Comentarios de Actividad *</h3>

        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Describe lo que sucedió, observaciones, etc..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-green-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-slate-600">{notes.length}/500 caracteres</p>
          <p className={`text-[10px] font-bold ${notes.trim().length >= 10 ? 'text-green-600' : 'text-rose-600'}`}>
            {notes.trim().length >= 10 ? 'Listo' : 'Minimo 10 caracteres'}
          </p>
        </div>
      </div>

      {/* TARJETA 3: ACCIONES */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Acciones</h3>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleCalendarize}
          disabled={!startDate || !hasNotes || isLoading || isSubmitting}
          className="w-full px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          Calendarizar
        </button>
      </div>
    </div>
  );
}
