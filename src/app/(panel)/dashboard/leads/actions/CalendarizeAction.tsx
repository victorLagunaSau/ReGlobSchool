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
      const { error } = await supabase
        .from('leads')
        .update({ status: '102' })
        .eq('id', leadId);

      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error('Error al calendarizar:', err);
      setError(`Error al iniciar campaña. Intenta de nuevo.`);
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
