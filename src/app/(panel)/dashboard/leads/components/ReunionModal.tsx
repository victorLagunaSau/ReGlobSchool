'use client';

import React, { useState, useRef } from 'react';
import { X, Loader2, AlertCircle, Calendar, MapPin, User } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import DecisionMakersForm from './DecisionMakersForm';

interface ReunionModalProps {
  isOpen: boolean;
  leadId: string;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    zone_city: string | null;
    state_name: string | null;
  } | null;
  stage: any;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DecisionMaker {
  id: string;
  nombre: string;
  cargo: string;
  email?: string;
  telefono?: string;
}

export default function ReunionModal({
  isOpen,
  leadId,
  lead,
  stage,
  onClose,
  onSuccess,
}: ReunionModalProps) {
  const [fechaReunion, setFechaReunion] = useState(new Date().toISOString().split('T')[0]);
  const [horaReunion, setHoraReunion] = useState('10:00');
  const [ubicacion, setUbicacion] = useState<'presencial' | 'virtual'>('presencial');
  const [decisionMakersSeleccionados, setDecisionMakersSeleccionados] = useState<DecisionMaker[]>([]);
  const [contexto, setContexto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextoRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen || !lead) return null;

  const handleSaveReunion = async () => {
    if (!fechaReunion) {
      setError('Selecciona una fecha');
      return;
    }
    if (!horaReunion) {
      setError('Selecciona una hora');
      return;
    }
    if (decisionMakersSeleccionados.length === 0) {
      setError('Selecciona al menos un tomador de decisiones');
      return;
    }
    if (!contexto.trim() || contexto.length < 20) {
      setError('Contexto requerido (mínimo 20 caracteres)');
      contextoRef.current?.focus();
      contextoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledDateTime = `${fechaReunion}T${horaReunion}:00`;

      // Create lead_task for reunion
      const { data: taskData, error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: leadId,
          task_type: 'reunion',
          status: 'pendiente',
          scheduled_for: scheduledDateTime,
          metadata: {
            ubicacion,
            decision_makers: decisionMakersSeleccionados.map(dm => ({ id: dm.id, nombre: dm.nombre })),
          },
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Store reunion context in lead_attempt_notes
      const { error: notesError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          attempt_number: 1,
          note_type: 'reunion_context',
          note_text: contexto,
        });

      if (notesError) throw notesError;

      // Update lead status to reunion stage
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: stage.clave })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Log interaction
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'task_outcome',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: 'Reunión calendarizada',
          message: `Reunión ${ubicacion === 'presencial' ? 'presencial' : 'virtual'} para ${fechaReunion} a las ${horaReunion}`,
          metadata: {
            task_id: taskData?.id,
            contexto,
            ubicacion,
            decision_makers: decisionMakersSeleccionados.map(dm => dm.nombre),
          },
        });

      if (interactionError) throw interactionError;

      // Reset and close
      setFechaReunion(new Date().toISOString().split('T')[0]);
      setHoraReunion('10:00');
      setUbicacion('presencial');
      setDecisionMakersSeleccionados([]);
      setContexto('');
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error('Error creating reunion:', err);
      setError('Error al calendarizar reunión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 sticky top-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Reunión de Demostración</h2>
              <p className="text-xs text-slate-300 mt-1">
                Etapa {stage?.orden} {stage?.tipo && `- Tipo: ${stage.tipo.charAt(0).toUpperCase() + stage.tipo.slice(1)}`}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Lead Info */}
          <div className="space-y-2 pb-4 border-b-2 border-slate-300">
            <div className="text-3xl font-bold text-slate-900">{lead.business_name}</div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600 flex-1">
                {lead.zone_city}{lead.state_name ? `, ${lead.state_name}` : ''}
              </div>
              <div className="text-xs text-slate-600">{lead.business_type}</div>
            </div>
          </div>

          {/* Acciones de Reunión */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Acciones de Reunión</h3>

            {/* Calendarizar Section */}
            <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-600 uppercase">Calendarizar</h4>

              {/* Fecha */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar size={14} /> Fecha *
                </label>
                <input
                  type="date"
                  value={fechaReunion}
                  onChange={(e) => {
                    setFechaReunion(e.target.value);
                    if (error?.includes('fecha')) setError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  disabled={isSubmitting}
                />
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Hora *</label>
                <input
                  type="time"
                  value={horaReunion}
                  onChange={(e) => {
                    setHoraReunion(e.target.value);
                    if (error?.includes('hora')) setError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  disabled={isSubmitting}
                />
              </div>

              {/* Tipo de Reunión */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin size={14} /> Tipo *
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUbicacion('presencial')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                      ubicacion === 'presencial'
                        ? 'bg-slate-900 text-white border-2 border-slate-900'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    Presencial
                  </button>
                  <button
                    onClick={() => setUbicacion('virtual')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                      ubicacion === 'virtual'
                        ? 'bg-slate-900 text-white border-2 border-slate-900'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    Virtual
                  </button>
                </div>
              </div>
            </div>

            {/* Tomadores de Decisiones Section */}
            <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-600 uppercase">Responsables</h4>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  disabled={isSubmitting}
                >
                  + Agregar
                </button>
              </div>

              <DecisionMakersForm leadId={leadId} readOnly={true} />

              {/* Listado de seleccionados */}
              {decisionMakersSeleccionados.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  {decisionMakersSeleccionados.map((dm) => (
                    <div key={dm.id} className="flex items-start justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{dm.nombre}</p>
                        <p className="text-[10px] text-slate-600">{dm.cargo}</p>
                      </div>
                      <button
                        onClick={() => setDecisionMakersSeleccionados(decisionMakersSeleccionados.filter(d => d.id !== dm.id))}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comentarios / Contexto Section */}
            <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-600 uppercase">Notas & Decisiones</h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Contexto & Objetivos *
                </label>
                <textarea
                  ref={contextoRef}
                  value={contexto}
                  onChange={(e) => {
                    setContexto(e.target.value);
                    if (error?.includes('Contexto')) setError(null);
                  }}
                  placeholder="Describe el contexto, objetivos y expectativas de la reunión (mínimo 20 caracteres)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  rows={4}
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {contexto.length}/500 (mínimo 20)
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-200 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveReunion}
            disabled={!fechaReunion || !horaReunion || decisionMakersSeleccionados.length === 0 || !contexto.trim() || contexto.length < 20 || isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Calendarizar Reunión
          </button>
        </div>
      </div>
    </div>
  );
}
