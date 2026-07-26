'use client';

import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

export interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  orden: number;
}

interface ModalStageSelectionProps {
  isOpen: boolean;
  currentStage: PipelineStage | null;
  stages: PipelineStage[];
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (stageId: string, note: string) => Promise<void>;
}

export default function ModalStageSelection({
  isOpen,
  currentStage,
  stages,
  isLoading = false,
  onClose,
  onConfirm,
}: ModalStageSelectionProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Get next stage (by orden)
  const nextStage = currentStage
    ? stages.find(s => s.orden === currentStage.orden + 1)
    : null;

  // Default to next stage
  const defaultStageId = nextStage?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!selectedStageId || !selectedStageId.trim()) {
      setError('Selecciona una etapa destino');
      return;
    }

    if (!note.trim() || note.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedStageId, note.trim());
      // Reset on success
      setSelectedStageId('');
      setNote('');
    } catch (err) {
      console.error('Error confirming stage:', err);
      setError('Error al confirmar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine available stages (current and forward only)
  const availableStages = currentStage
    ? stages.filter(s => s.orden >= currentStage.orden)
    : stages;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between bg-emerald-600 text-white p-6">
          <h2 className="text-lg font-bold">Avanzar Lead a Siguiente Etapa</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Etapa Destino <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStageId || defaultStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-emerald-600 disabled:opacity-60"
            >
              <option value="">-- Selecciona una etapa --</option>
              {availableStages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.titulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Nota de Salida <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              placeholder="Describe qué sucedió y por qué avanzas el lead..."
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-emerald-600 disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">
              {note.length}/500 caracteres (mínimo 10)
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
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Confirmar Éxito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
