'use client';

import React, { useState } from 'react';
import { X, Clock, RotateCcw, Trash2, ArrowLeft } from 'lucide-react';

interface ModalOutcomeOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  onPosponer: () => void;
  onRegresar: () => void;
  onReintentar: () => void;
  onDescartar: () => void;
}

export default function ModalOutcomeOptions({
  isOpen,
  onClose,
  onPosponer,
  onRegresar,
  onReintentar,
  onDescartar,
}: ModalOutcomeOptionsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
        <div className="flex items-center justify-between bg-amber-600 text-white p-6">
          <h2 className="text-lg font-bold">Opciones - Sin Éxito</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-amber-700 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600 mb-4">
            ¿Qué deseas hacer con esta tarea?
          </p>

          <button
            onClick={onPosponer}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg hover:bg-amber-100 transition-all font-semibold text-sm"
          >
            <Clock size={18} />
            Posponer Tarea
          </button>

          <button
            onClick={onRegresar}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg hover:bg-blue-100 transition-all font-semibold text-sm"
          >
            <ArrowLeft size={18} />
            Regresar al Paso Anterior
          </button>

          <button
            onClick={onReintentar}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-semibold text-sm"
          >
            <RotateCcw size={18} />
            Reintentar en 3 Días
          </button>

          <button
            onClick={onDescartar}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-900 rounded-lg hover:bg-red-100 transition-all font-semibold text-sm"
          >
            <Trash2 size={18} />
            Descartar Lead
          </button>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all font-semibold text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
