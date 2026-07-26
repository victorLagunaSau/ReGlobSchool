'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface ModalDiscardProps {
  isOpen: boolean;
  leadName?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<void>;
}

const DISCARD_REASONS = [
  { value: 'no_interesado', label: 'No interesado' },
  { value: 'presupuesto', label: 'Sin presupuesto' },
  { value: 'competencia', label: 'Fue a competencia' },
  { value: 'cambio_direccion', label: 'Cambio de dirección' },
  { value: 'otros', label: 'Otros' },
];

export default function ModalDiscard({
  isOpen,
  leadName = 'este lead',
  isLoading = false,
  onClose,
  onConfirm,
}: ModalDiscardProps) {
  const [reason, setReason] = useState('no_interesado');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      await onConfirm(reason, note.trim());
      // Reset on success
      setReason('no_interesado');
      setNote('');
    } catch (err) {
      console.error('Error discarding lead:', err);
      setError('Error al descartar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between bg-red-600 text-white p-6">
          <h2 className="text-lg font-bold">Descartar Lead</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">
              Descartar <strong>{leadName}</strong> lo archivará permanentemente. No se podrá recuperar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Motivo <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-red-600 disabled:opacity-60"
              >
                {DISCARD_REASONS.map(opt => (
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
                placeholder="Por qué se descarta..."
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-red-600 disabled:opacity-60"
              />
              <p className="text-xs text-slate-500 mt-1">
                {note.length}/500 (mínimo 10)
              </p>
            </div>

            {error && (
              <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Descartar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
