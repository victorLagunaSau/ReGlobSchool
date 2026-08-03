'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import { deleteLeadArchive } from '../utils/deleteLead';

interface DeleteActionProps {
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

export default function DeleteAction({
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
}: DeleteActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hasNotes = notes.trim().length >= 10;
  const canDelete = currentAttempts >= minAttempts && minAttempts > 0;
  const canConfirm = canDelete && hasNotes && secondsLeft === 0;

  const handleDelete = async () => {
    if (!hasNotes) {
      setError('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    if (!canDelete) {
      setError('No se puede eliminar el lead en este momento');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('es-ES');

      // 1. Get current user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('No authenticated user');

      // 2. Auto-complete deletion notes
      const autoCompletedNotes = `${notes}\n\n${stageTitle} (Etapa ${stageNumber})\nEliminar Lead\nFecha: ${dateStr}\nHora: ${timeStr}\nIntentos: ${currentAttempts} de ${minAttempts}`;

      // 3. Use reusable delete archive function
      const result = await deleteLeadArchive({
        leadId,
        userId,
        stageClave,
        stageTitle,
        stageNumber,
        reason: 'Límite de intentos alcanzado',
        autoCompletedNotes,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error archiving and deleting lead');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg mb-3">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Advertencia de eliminación */}
      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg mb-3">
        <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-bold text-rose-700 mb-1">Esta acción no tiene marcha atrás</p>
          <p className="text-xs text-rose-600">El lead será eliminado permanentemente junto con todos sus contactos e historial.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors rounded-lg"
        >
          Cancelar
        </button>

        <button
          onClick={handleDelete}
          disabled={isLoading || !canDelete || !hasNotes || !canConfirm}
          className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            !canConfirm
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title={!canDelete ? 'No se puede eliminar. Requiere alcanzar el límite de intentos.' : secondsLeft > 0 ? `Disponible en ${secondsLeft}s` : ''}
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          {secondsLeft > 0 ? (
            <>
              <Clock size={14} />
              Confirmar en {secondsLeft}s
            </>
          ) : (
            'Confirmar Eliminación'
          )}
        </button>
      </div>
    </>
  );
}
