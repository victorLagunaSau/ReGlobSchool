'use client';

import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

interface ReasonOption {
  value: string;
  label: string;
}

interface ModalReasonProps {
  isOpen: boolean;
  title: string;
  description?: string;
  reasons: ReasonOption[];
  defaultReason?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<void>;
}

export default function ModalReason({
  isOpen,
  title,
  description,
  reasons,
  defaultReason,
  isLoading = false,
  onClose,
  onConfirm,
}: ModalReasonProps) {
  const [reason, setReason] = useState(defaultReason || reasons[0]?.value || '');
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
      setReason(defaultReason || reasons[0]?.value || '');
      setNote('');
    } catch (err) {
      console.error('Error confirming:', err);
      setError('Error al confirmar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between bg-slate-900 text-white p-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {description && (
            <p className="text-sm text-slate-600 mb-4">{description}</p>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-slate-900 disabled:opacity-60"
            >
              {reasons.map(opt => (
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
              placeholder="Explica el motivo..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-slate-900 disabled:opacity-60"
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
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
