'use client';

import React, { useState } from 'react';
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

type Step = 'calendar' | 'context';

export default function ReunionModal({
  isOpen,
  leadId,
  lead,
  stage,
  onClose,
  onSuccess,
}: ReunionModalProps) {
  const [step, setStep] = useState<Step>('calendar');
  const [fechaReunion, setFechaReunion] = useState(new Date().toISOString().split('T')[0]);
  const [horaReunion, setHoraReunion] = useState('10:00');
  const [ubicacion, setUbicacion] = useState<'presencial' | 'virtual'>('presencial');
  const [decisionMakerId, setDecisionMakerId] = useState<string | null>(null);
  const [contexto, setContexto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const handleNextStep = () => {
    if (!fechaReunion) {
      setError('Selecciona una fecha');
      return;
    }
    if (!horaReunion) {
      setError('Selecciona una hora');
      return;
    }
    if (!decisionMakerId) {
      setError('Selecciona un tomador de decisiones');
      return;
    }
    setError(null);
    setStep('context');
  };

  const handleSaveReunion = async () => {
    if (!contexto.trim() || contexto.length < 20) {
      setError('Contexto requerido (mínimo 20 caracteres)');
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
            decision_maker_id: decisionMakerId,
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
            decision_maker_id: decisionMakerId,
          },
        });

      if (interactionError) throw interactionError;

      // Reset and close
      setFechaReunion(new Date().toISOString().split('T')[0]);
      setHoraReunion('10:00');
      setUbicacion('presencial');
      setDecisionMakerId(null);
      setContexto('');
      setStep('calendar');
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
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">
                {step === 'calendar' ? 'Calendarizar Reunión' : 'Contexto de Reunión'}
              </h2>
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
        <div className="p-6 space-y-4">
          {/* Lead Info */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Negocio</div>
            <div>
              <div className="font-bold text-slate-900">{lead.business_name}</div>
              <div className="text-xs text-slate-500">{lead.business_type}</div>
            </div>
          </div>

          {/* Step 1: Calendar & Decision Maker */}
          {step === 'calendar' && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar size={14} /> Fecha de Reunión *
                </label>
                <input
                  type="date"
                  value={fechaReunion}
                  onChange={(e) => {
                    setFechaReunion(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Hora *</label>
                <input
                  type="time"
                  value={horaReunion}
                  onChange={(e) => {
                    setHoraReunion(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin size={14} /> Tipo de Reunión *
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUbicacion('presencial')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                      ubicacion === 'presencial'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    Presencial
                  </button>
                  <button
                    onClick={() => setUbicacion('virtual')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                      ubicacion === 'virtual'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    Virtual
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User size={14} /> Tomador de Decisiones *
                </label>
                <DecisionMakersForm
                  leadId={leadId}
                  readOnly={true}
                />
                <select
                  value={decisionMakerId || ''}
                  onChange={(e) => {
                    setDecisionMakerId(e.target.value || null);
                    if (error) setError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  disabled={isSubmitting}
                >
                  <option value="">Selecciona un tomador de decisiones</option>
                  {/* Options will be populated from lead_decision_makers */}
                </select>
              </div>
            </>
          )}

          {/* Step 2: Context */}
          {step === 'context' && (
            <>
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div>
                  <span className="font-bold text-slate-700">Fecha:</span>
                  <span className="text-slate-600 ml-2">{fechaReunion} a las {horaReunion}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Tipo:</span>
                  <span className="text-slate-600 ml-2 capitalize">{ubicacion}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  ¿Qué se discutirá en esta reunión? *
                </label>
                <textarea
                  value={contexto}
                  onChange={(e) => {
                    setContexto(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Describe el contexto y objetivos de la reunión (mínimo 20 caracteres)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  rows={4}
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-slate-400">
                  {contexto.length}/300
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-200">
          {step === 'context' && (
            <button
              onClick={() => setStep('calendar')}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Atrás
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          {step === 'calendar' && (
            <button
              onClick={handleNextStep}
              disabled={!fechaReunion || !horaReunion || !decisionMakerId || isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Siguiente
            </button>
          )}
          {step === 'context' && (
            <button
              onClick={handleSaveReunion}
              disabled={!contexto.trim() || contexto.length < 20 || isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Guardar y Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
