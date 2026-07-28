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
  tipo?: string;
  tasa_exito?: number;
  siguiente_etapa_id?: string | null;
  continuar_a_id?: string | null;
  regresar_a_id?: string | null;
}

interface PipelineStage {
  id: string;
  titulo: string;
  clave: string;
}

interface ModalPipelineStageProp {
  isOpen: boolean;
  isLoading?: boolean;
  stage?: PipelineStageFormData & { id?: string };
  existingClaves?: string[];
  allStages?: PipelineStage[];
  onClose: () => void;
  onConfirm: (data: PipelineStageFormData) => Promise<void>;
}

export default function ModalPipelineStage({
  isOpen,
  isLoading = false,
  stage,
  existingClaves = [],
  allStages = [],
  onClose,
  onConfirm,
}: ModalPipelineStageProp) {
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [formData, setFormData] = useState<PipelineStageFormData>(() => {
    if (stage) {
      return {
        clave: stage.clave || '',
        titulo: stage.titulo || '',
        descripcion: stage.descripcion || '',
        objetivo: stage.objetivo || '',
        orden: stage.orden || 0,
        limite_pospuestas: stage.limite_pospuestas || 3,
        intentos_requeridos: stage.intentos_requeridos || 1,
        tipo: stage.tipo || 'contacto',
        tasa_exito: stage.tasa_exito || 0,
        siguiente_etapa_id: stage.siguiente_etapa_id || null,
        continuar_a_id: stage.continuar_a_id || null,
        regresar_a_id: stage.regresar_a_id || null,
      };
    }
    return {
      clave: '',
      titulo: '',
      descripcion: '',
      objetivo: '',
      orden: 0,
      limite_pospuestas: 3,
      intentos_requeridos: 1,
      tipo: 'contacto',
      tasa_exito: 0,
      siguiente_etapa_id: null,
      continuar_a_id: null,
      regresar_a_id: null,
    };
  });
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
        tipo: stage.tipo || 'contacto',
        tasa_exito: stage.tasa_exito || 0,
        siguiente_etapa_id: stage.siguiente_etapa_id || null,
        continuar_a_id: stage.continuar_a_id || null,
        regresar_a_id: stage.regresar_a_id || null,
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
        tipo: 'contacto',
        tasa_exito: 0,
        siguiente_etapa_id: null,
        continuar_a_id: null,
        regresar_a_id: null,
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
        tipo: 'contacto',
        tasa_exito: 0,
        siguiente_etapa_id: null,
        continuar_a_id: null,
        regresar_a_id: null,
      });
    } catch (error) {
      console.error('Error confirming stage:', error);
    }
  };

  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
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
          {/* Row 1: Clave, Orden, Tipo */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Clave <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clave}
                onChange={e => handleChange('clave', e.target.value)}
                disabled={!!stage?.id}
                placeholder="Numérico"
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
                placeholder="Ej: 1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
              {errors.orden && <p className="text-xs text-red-500 mt-1">{errors.orden}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo || 'contacto'}
                onChange={e => handleChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="inicial">Inicial</option>
                <option value="contacto">Contacto</option>
                <option value="reunion">Reunión</option>
                <option value="reagendar">Reagendar</option>
                <option value="cierre">Cierre</option>
              </select>
            </div>
          </div>

          {/* Título */}
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

          {/* Descripción y Objetivo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={e => handleChange('descripcion', e.target.value)}
                placeholder="Qué ocurre en esta etapa"
                rows={2}
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
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
              />
            </div>
          </div>

          {/* Row: Límite, Intentos, Tasa */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Límite Pospuestas
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
                Intentos Máximos
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Tasa Éxito (%)
              </label>
              <input
                type="number"
                value={formData.tasa_exito || 0}
                onChange={e => handleChange('tasa_exito', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Flujo del Proceso */}
          <div className="border-t-2 border-slate-200 pt-4 mt-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3">Flujo del Proceso</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Si Falla - Izquierda */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold mb-2">
                  <div className="w-3 h-3 rounded bg-yellow-400"></div>
                  Si Falla → Regresar a:
                </label>
                <select
                  value={formData.regresar_a_id || ''}
                  onChange={e => handleChange('regresar_a_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Sin retroceso (Eliminar) --</option>
                  {allStages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.titulo}
                    </option>
                  ))}
                </select>
                {formData.regresar_a_id && (
                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                    ✓ {allStages.find(s => s.id === formData.regresar_a_id)?.titulo}
                  </div>
                )}
              </div>

              {/* Si Éxito - Derecha */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold mb-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  Éxito → Continuar a:
                </label>
                <select
                  value={formData.continuar_a_id || ''}
                  onChange={e => handleChange('continuar_a_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Sin siguiente (Terminal) --</option>
                  {allStages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.titulo}
                    </option>
                  ))}
                </select>
                {formData.continuar_a_id && (
                  <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                    ✓ {allStages.find(s => s.id === formData.continuar_a_id)?.titulo}
                  </div>
                )}
              </div>
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
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
