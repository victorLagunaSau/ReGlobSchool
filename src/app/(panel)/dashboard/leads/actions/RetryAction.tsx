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
  onCommentAdded?: () => void;
  onLeadUpdated?: () => void;
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
  onCommentAdded,
  onLeadUpdated,
}: RetryActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const hasNotes = notes.trim().length >= 10;

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

  // Calcular fecha legible en español
  const formatDateLong = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`;
  };

  const handleRetrySelect = (days: number) => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    // Calcular fecha DESDE HOY (no desde fecha anterior)
    // Usar fecha sin hora para evitar problemas de zona horaria
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const retryDate = addBusinessDays(today, days);
    setSelectedDate(retryDate);
  };

  const handleAccept = async () => {
    if (!selectedDate) {
      setError('Selecciona una fecha primero');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextAttemptNumber = currentAttempts + 1;
      const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);
      const retryDateFormatted = selectedDate.toLocaleDateString('es-ES');

      // 1. Guardar comentario automático PRIMERO
      const { error: autoNoteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: nextAttemptNumber,
          note_type: 'retry',
          note_text: `${stageTitle} - Reintentar programado para ${retryDateFormatted}\n\n${timestamp}`,
        });

      if (autoNoteError) throw autoNoteError;

      // 2. Guardar comentario del usuario DESPUÉS
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: nextAttemptNumber,
          note_type: 'retry',
          note_text: `${notes.trim()}\n\n${timestamp}`,
        });

      if (noteError) throw noteError;

      // 3. Recargar comentarios inmediatamente después de guardar
      onCommentAdded?.();

      // 4. Incrementar current_stage_attempts y guardar fecha en day_task
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          current_stage_attempts: nextAttemptNumber,
          day_task: selectedDate.toISOString().split('T')[0]
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 5. Recargar datos del lead para actualizar el Kanban
      onLeadUpdated?.();

      onSuccess();
    } catch (err: any) {
      console.error('Error scheduling retry:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
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

      <p className="text-xs font-semibold text-amber-900 mb-2">
        Selecciona cuándo reintentar:
      </p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {RETRY_OPTIONS.map((option) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const calculatedDate = addBusinessDays(today, option.days);
          const isSelected = selectedDate && selectedDate.toDateString() === calculatedDate.toDateString();
          return (
            <button
              key={option.days}
              onClick={() => handleRetrySelect(option.days)}
              disabled={isLoading}
              className={`px-2 py-2.5 text-xs font-bold rounded-lg transition-colors flex flex-col items-center justify-center gap-1 ${
                isSelected
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Calendar size={12} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg mb-4">
          <p className="text-xs text-blue-900 font-semibold">
            Reintentar el: <span className="text-blue-700 font-bold">{formatDateLong(selectedDate)}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onCancel?.()}
          className="flex-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors rounded-lg disabled:opacity-50"
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          onClick={handleAccept}
          disabled={!selectedDate || isLoading}
          className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            !selectedDate || isLoading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isLoading && <Loader2 size={12} className="animate-spin" />}
          Aceptar
        </button>
      </div>
    </div>
  );
}
