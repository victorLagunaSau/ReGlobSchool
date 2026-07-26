'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

export interface PipelineStageFormData {
  clave: string;
  titulo: string;
  descripcion: string;
  objetivo: string;
  orden: number;
  limite_pospuestas: number;
  intentos_requeridos: number;
}

interface ModalPipelineStageProp {
  isOpen: boolean;
  isLoading?: boolean;
  stage?: PipelineStageFormData & { id?: string };
  existingClaves?: string[];
  onClose: () => void;
  onConfirm: (data: PipelineStageFormData) => Promise<void>;
}

export default function ModalPipelineStage({
  isOpen,
  isLoading = false,
  stage,
  existingClaves = [],
  onClose,
  onConfirm,
}: ModalPipelineStageProp) {
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [formData, setFormData] = useState<PipelineStageFormData>(
    stage || {
      clave: '',
      titulo: '',
      descripcion: '',
      objetivo: '',
      orden: 0,
      limite_pospuestas: 3,
      intentos_requeridos: 1,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when stage changes
  useEffect(() => {
    if (stage) {
      setFormData({
        clave: stage.clave || '',
        titulo: stage.titulo || '',
        descripcion: stage.descripcion || '',
        objetivo: stage.objetivo || '',
        orden: stage.orden || 0,
        limite_pospuestas: stage.limite_pospuestas || 3,
        intentos_requeridos: stage.intentos_requeridos || 1,
      });
    } else {
      setFormData({
        clave: '',
        titulo: '',
        descripcion: '',
        objetivo: '',
        orden: 0,
        limite_pospuestas: 3,
        intentos_requeridos: 1,
      });
    }
    setStep('form');
    setErrors({});
  }, [stage, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof PipelineStageFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clave.trim()) {
      newErrors.clave = 'Clave es requerida';
    } else if (!stage?.id && existingClaves.includes(formData.clave.toLowerCase())) {
      newErrors.clave = 'Esta clave ya existe';
    }

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título es requerido';
    }

    if (formData.orden < 1) {
      newErrors.orden = 'Orden debe ser mayor a 0';
    }

    if (formData.limite_pospuestas < 0) {
      newErrors.limite_pospuestas = 'No puede ser negativo';
    }

    if (formData.intentos_requeridos < 1) {
      newErrors.intentos_requeridos = 'Debe ser al menos 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    try {
      await onConfirm(formData);
      setStep('form');
      setFormData({
        clave: '',
        titulo: '',
        descripcion: '',
        objetivo: '',
        orden: 0,
        limite_pospuestas: 3,
        intentos_requeridos: 1,
      });
    } catch (error) {
      console.error('Error confirming stage:', error);
    }
  };

  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-200 p-4">
            <div className="flex gap-3 items-start">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-slate-900">Confirmar {stage?.id ? 'Cambios' : 'Nueva Etapa'}</h3>
                <p className="text-xs text-slate-600 mt-1">
                  {stage?.id ? 'Se actualizarán los datos de la etapa.' : 'Se creará una nueva etapa en el pipeline.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Clave:</span>
                <span className="font-mono font-bold text-slate-900">{formData.clave}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Título:</span>
                <span className="font-bold text-slate-900">{formData.titulo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Orden:</span>
                <span className="font-bold text-slate-900">{formData.orden}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        <div className="flex items-center justify-between bg-slate-900 text-white p-6">
          <h2 className="text-lg font-bold">
            {stage?.id ? 'Editar Etapa' : 'Nueva Etapa del Pipeline'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Clave <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clave}
                onChange={e => handleChange('clave', e.target.value)}
                disabled={!!stage?.id}
                placeholder="ej: prospecto"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 disabled:opacity-60"
              />
              {errors.clave && <p className="text-xs text-red-500 mt-1">{errors.clave}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Orden <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.orden}
                onChange={e => handleChange('orden', parseInt(e.target.value) || 0)}
                placeholder="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
              {errors.orden && <p className="text-xs text-red-500 mt-1">{errors.orden}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={e => handleChange('titulo', e.target.value)}
              placeholder="ej: Prospecto"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
            {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={e => handleChange('descripcion', e.target.value)}
              placeholder="Qué ocurre en esta etapa"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Objetivo Comercial
            </label>
            <textarea
              value={formData.objetivo}
              onChange={e => handleChange('objetivo', e.target.value)}
              placeholder="Meta o propósito de la etapa"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Límite de Pospuestas
              </label>
              <input
                type="number"
                value={formData.limite_pospuestas}
                onChange={e => handleChange('limite_pospuestas', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
              {errors.limite_pospuestas && (
                <p className="text-xs text-red-500 mt-1">{errors.limite_pospuestas}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Intentos Requeridos
              </label>
              <input
                type="number"
                value={formData.intentos_requeridos}
                onChange={e => handleChange('intentos_requeridos', parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
              {errors.intentos_requeridos && (
                <p className="text-xs text-red-500 mt-1">{errors.intentos_requeridos}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
