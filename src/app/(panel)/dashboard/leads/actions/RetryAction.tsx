'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface RetryActionProps {
  leadId: string;
  stageTitle: string;
  stageNumber: string;
  stageClave: string;
  notes: string;
  currentAttempts: number;
  minAttempts: number;
  maxAttempts: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

// Calcula días hábiles (excluyendo fines de semana)
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let count = 0;

  while (count < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  return result;
}

const RETRY_OPTIONS = [
  { label: 'En 1 día', days: 1 },
  { label: 'En 3 días', days: 3 },
  { label: 'En 5 días', days: 5 },
  { label: 'En 8 días', days: 8 },
];

export default function RetryAction({
  leadId,
  stageTitle,
  stageNumber,
  stageClave,
  notes,
  currentAttempts,
  minAttempts,
  maxAttempts,
  onSuccess,
  onCancel,
}: RetryActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const hasNotes = notes.trim().length >= 10;

  // Calcular fecha legible en español
  const formatDateLong = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`;
  };

  const handleRetrySelect = async (days: number) => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    // Calcular fecha primero (sin iniciar loading)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const retryDate = addBusinessDays(tomorrow, days - 1); // -1 porque ya sumamos 1 día para mañana
    setSelectedDate(retryDate);

    setIsLoading(true);
    setError(null);

    try {

      // Obtener el próximo número de intento
      const nextAttemptNumber = currentAttempts + 1;

      // Auto-completar comentario con: título, número de etapa, fecha, número de intento
      const retryDateFormatted = retryDate.toLocaleDateString('es-ES');
      const autoCompletedNotes = `${notes}\n\n${stageTitle} (Etapa ${stageNumber})\nReintentar: ${retryDateFormatted}\nIntento: ${nextAttemptNumber}`;

      // 1. Guardar nota de intento
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: nextAttemptNumber,
          note_type: 'retry',
          note_text: autoCompletedNotes,
        });

      if (noteError) throw noteError;

      // 2. Incrementar current_stage_attempts
      const { error: updateError } = await supabase
        .from('leads')
        .update({ current_stage_attempts: nextAttemptNumber })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 3. Crear tarea programada para la fecha de reintentar
      const { error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: leadId,
          task_type: 'seguimiento',
          description: `Reintentar contacto - ${stageTitle}`,
          scheduled_for: retryDate.toISOString(),
          status: 'pendiente',
        });

      if (taskError) throw taskError;

      onSuccess();
    } catch (err: any) {
      console.error('Error scheduling retry:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      console.error('Error details:', errorMsg);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {selectedDate && (
        <div className="p-3 bg-white border border-amber-300 rounded-lg">
          <p className="text-xs text-amber-900 font-semibold">
            Fecha seleccionada: <span className="text-amber-700">{formatDateLong(selectedDate)}</span>
          </p>
        </div>
      )}

      <p className="text-xs font-semibold text-amber-900 mb-3">
        Selecciona cuándo reintentar:
      </p>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {RETRY_OPTIONS.map((option) => (
          <button
            key={option.days}
            onClick={() => handleRetrySelect(option.days)}
            disabled={isLoading}
            className="px-2 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
          >
            {isLoading && <Loader2 size={12} className="animate-spin" />}
            <Calendar size={12} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => onCancel?.()}
        className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors rounded-lg"
      >
        Cancelar
      </button>
    </div>
  );
}
