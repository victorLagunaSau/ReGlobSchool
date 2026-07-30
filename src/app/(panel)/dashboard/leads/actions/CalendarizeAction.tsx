'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface CalendarizeActionProps {
  leadId: string;
  startDate: string;
  notes: string;
  onSuccess: () => void;
  isSubmitting?: boolean;
}

export default function CalendarizeAction({
  leadId,
  startDate,
  notes,
  onSuccess,
  isSubmitting = false,
}: CalendarizeActionProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalendarize = async () => {
    if (!startDate) {
      setError('Selecciona una fecha de inicio');
      return;
    }

    if (!notes.trim() || notes.trim().length < 10) {
      setError('Las notas deben tener al menos 10 caracteres');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener el siguiente stage (orden 2)
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('clave')
        .eq('orden', 2)
        .single();

      if (stagesError) throw stagesError;
      const nextStageClave = stagesData?.clave || 'llamada';

      // Crear tarea de contacto inicial
      const { data: taskData, error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: leadId,
          task_type: 'contacto_inicial',
          channel: null,
          attempt_number: 1,
          status: 'pendiente',
          scheduled_for: startDate,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Guardar nota de intento
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: '101',
          stage_titulo: 'Etapa 1 - Inicio de Campaña',
          attempt_number: 1,
          note_type: 'attempt',
          note_text: notes.trim(),
        });

      if (noteError) throw noteError;

      // Actualizar estado del lead
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: nextStageClave })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'task_outcome',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: 'Campaña iniciada',
          message: `Campaña iniciada para ${startDate}: ${notes.trim()}`,
          metadata: {
            task_id: taskData?.id,
            start_date: startDate,
          },
        });

      if (interactionError) throw interactionError;

      onSuccess();
    } catch (err) {
      console.error('Error creating campaign task:', err);
      setError('Error al iniciar campaña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleCalendarize}
        disabled={!startDate || !notes.trim() || notes.trim().length < 10 || isLoading || isSubmitting}
        className="w-full px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        Calendarizar
      </button>
    </div>
  );
}
