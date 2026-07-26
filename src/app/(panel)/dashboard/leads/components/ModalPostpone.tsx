'use client';

import React, { useState } from 'react';
import { X, AlertCircle, Loader2, Calendar } from 'lucide-react';

interface ModalPostponeProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (scheduledDate: string, reason: string, note: string) => Promise<void>;
}

const POSTPONE_REASONS = [
  { value: 'ocupado', label: 'Ocupado/No disponible' },
  { value: 'no_contesta', label: 'No contesta' },
  { value: 'revalorar', label: 'Necesita revaluación' },
  { value: 'otros', label: 'Otros' },
];

export default function ModalPostpone({
  isOpen,
  isLoading = false,
  onClose,
  onConfirm,
}: ModalPostponeProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [reason, setReason] = useState('ocupado');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!scheduledDate) {
      setError('Selecciona una fecha para reprogramar');
      return;
    }

    const selectedDate = new Date(scheduledDate);
    if (selectedDate <= new Date()) {
      setError('La fecha debe ser en el futuro');
      return;
    }

    if (!reason.trim()) {
      setError('Selecciona un motivo');
      return;
    }

    if (!note.trim() || note.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(scheduledDate, reason, note.trim());
      // Reset on success
      setScheduledDate('');
      setReason('ocupado');
      setNote('');
    } catch (err) {
      console.error('Error postponing task:', err);
      setError('Error al posponer. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between bg-amber-600 text-white p-6">
          <h2 className="text-lg font-bold">Posponer Tarea</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-amber-700 rounded-lg transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Nueva Fecha/Hora <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-amber-600 disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">Mínimo en 3 días</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-amber-600 disabled:opacity-60"
            >
              {POSTPONE_REASONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Nota <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              placeholder="Por qué se pospone..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-amber-600 disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">
              {note.length}/500 (mínimo 10)
            </p>
          </div>

          {error && (
            <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Posponer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
