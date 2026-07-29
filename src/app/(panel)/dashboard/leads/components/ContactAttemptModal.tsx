'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, Mail, MapPin, AlertCircle, Loader2, ChevronDown, CheckCircle2, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import { resolveTaskWithPipeline } from '../../../../../lib/task-automation';
import DecisionMakersForm from './DecisionMakersForm';

interface ContactAttemptModalProps {
  isOpen: boolean;
  leadId: string | null;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    website: string | null;
    zone_city: string | null;
    state_name: string | null;
    country_name: string | null;
    created_at: string;
  } | null;
  stages: Array<{ id: string; clave: string; titulo: string; orden: number; tipo?: string; siguiente_etapa_id?: string | null }>;
  onClose: () => void;
  onTaskResolved?: () => void;
  onSuccessWithNextStage?: (nextStageType: string) => void;
}

interface LeadTask {
  id: string;
  lead_id: string;
  task_type: 'contacto_inicial' | 'seguimiento' | 'demo';
  channel: 'telefono' | 'email' | 'ambos' | null;
  attempt_number: number;
  status: string;
}

const calculateNextRetryDate = (days: number): Date => {
  const date = new Date();
  let daysAdded = 0;

  while (daysAdded < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return date;
};

const formatRetryDate = (date: Date): string => {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dayOfWeek = days[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = months[date.getMonth()];
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${dayOfMonth} de ${month}`;
};

export default function ContactAttemptModal({
  isOpen,
  leadId,
  lead,
  stages,
  onClose,
  onTaskResolved,
  onSuccessWithNextStage,
}: ContactAttemptModalProps) {
  const [currentTask, setCurrentTask] = useState<LeadTask | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [isLeadInfoOpen, setIsLeadInfoOpen] = useState(false);
  const [callAttempted, setCallAttempted] = useState(false);
  const [emailAttempted, setEmailAttempted] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'exito' | 'reintentar' | 'descartar' | null>(null);
  const [note, setNote] = useState('');
  const [selectedRetryDays, setSelectedRetryDays] = useState<number | null>(null);

  // Success flow state
  const [scheduledDate, setScheduledDate] = useState('');
  const [modality, setModality] = useState<'virtual' | 'presencial'>('virtual');
  const [calendarLink, setCalendarLink] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [isEditingResponsible, setIsEditingResponsible] = useState(false);
  const [newResponsible, setNewResponsible] = useState('');
  const [attemptNotes, setAttemptNotes] = useState<any[]>([]);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Fetch current pending task
  useEffect(() => {
    if (!isOpen || !leadId) {
      setCurrentTask(null);
      setAttemptNumber(0);
      resetForm();
      return;
    }

    const fetchTask = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch task
        const { data: taskData, error: taskError } = await supabase
          .from('lead_tasks')
          .select('*')
          .eq('lead_id', leadId)
          .eq('status', 'pendiente')
          .in('task_type', ['contacto_inicial', 'seguimiento'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (taskError && taskError.code !== 'PGRST116') {
          throw taskError;
        }

        if (taskData) {
          setCurrentTask(taskData as LeadTask);
          setAttemptNumber(taskData.attempt_number || 0);
        }

        // Fetch lead's assigned_to
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('assigned_to')
          .eq('id', leadId)
          .single();

        if (leadData) {
          setAssignedTo(leadData.assigned_to);
          setNewResponsible(leadData.assigned_to || '');
        }

        // Fetch attempt notes history
        const { data: notesData, error: notesError } = await supabase
          .from('lead_attempt_notes')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true });

        if (notesData) {
          setAttemptNotes(notesData);
        }
      } catch (err) {
        console.error('Error fetching task:', err);
        setError('No se pudo cargar la tarea actual');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [isOpen, leadId]);

  const resetForm = () => {
    setSelectedOutcome(null);
    setNote('');
    setCallAttempted(false);
    setEmailAttempted(false);
    setScheduledDate('');
    setModality('virtual');
    setCalendarLink('');
    setError(null);
  };

  const saveAttemptNote = async (noteType: 'attempt' | 'success' | 'retry' | 'discard') => {
    if (!currentTask || !note.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: currentTask.lead_id,
          stage_clave: 'llamada',
          stage_titulo: 'Etapa 2 - Intento de Contacto',
          attempt_number: attemptNumber,
          note_type: noteType,
          note_text: note.trim(),
        });

      if (error) console.error('Error saving note:', error);
    } catch (err) {
      console.error('Error saving attempt note:', err);
    }
  };

  const handleSuccess = async () => {
    if (!currentTask || !note.trim() || note.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      commentRef.current?.focus();
      commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get all stages to find next stage
      const { data: allStages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('orden');

      if (stagesError || !allStages) {
        throw new Error('Error al cargar las etapas del pipeline');
      }

      const currentStage = stages[0];
      const nextStageId = currentStage?.siguiente_etapa_id;
      const nextStage = nextStageId
        ? allStages.find(s => s.id === nextStageId)
        : allStages.find(s => s.orden === (currentStage?.orden || 2) + 1);

      if (!nextStage) {
        throw new Error('No se encontró la siguiente etapa en el pipeline');
      }

      await saveAttemptNote('success');

      // Log interaction
      await supabase
        .from('lead_interactions')
        .insert({
          lead_id: currentTask.lead_id,
          interaction_type: 'task_outcome',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: 'Contacto exitoso',
          message: note.trim(),
          metadata: {
            contact_methods: {
              llamada: callAttempted,
              email: emailAttempted,
            },
            assigned_to: assignedTo,
          },
        });

      // Advance to next stage
      await resolveTaskWithPipeline(
        {
          id: currentTask.id,
          lead_id: currentTask.lead_id,
          task_type: currentTask.task_type,
          channel: currentTask.channel,
          attempt_number: currentTask.attempt_number,
        },
        'exito',
        nextStage.clave,
        note.trim()
      );

      resetForm();
      // Auto-open next stage modal (no close - transition within modal)
      if (nextStage?.tipo) {
        onSuccessWithNextStage?.(nextStage.tipo);
      } else {
        // If no next stage, close the modal
        onClose();
      }
      onTaskResolved?.();
    } catch (err) {
      console.error('Error marking success:', err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReintentar = async (days: number) => {
    if (!currentTask || !note.trim() || note.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      commentRef.current?.focus();
      commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Only allow reintentar if attempt < 4
    if (attemptNumber >= 4) {
      setError('No puedes reintentar después de 4 intentos. Debes descartar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveAttemptNote('retry');
      const nextDate = calculateNextRetryDate(days);

      await resolveTaskWithPipeline(
        {
          id: currentTask.id,
          lead_id: currentTask.lead_id,
          task_type: currentTask.task_type,
          channel: currentTask.channel,
          attempt_number: currentTask.attempt_number,
        },
        'reintentar',
        undefined,
        note.trim(),
        nextDate.toISOString().split('T')[0]
      );

      resetForm();
      onClose();
      onTaskResolved?.();
    } catch (err) {
      console.error('Error marking retry:', err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDescartar = async () => {
    if (!currentTask || !note.trim() || note.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      commentRef.current?.focus();
      commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveAttemptNote('discard');

      await resolveTaskWithPipeline(
        {
          id: currentTask.id,
          lead_id: currentTask.lead_id,
          task_type: currentTask.task_type,
          channel: currentTask.channel,
          attempt_number: currentTask.attempt_number,
        },
        'descartar',
        undefined,
        note.trim(),
        undefined
      );

      resetForm();
      onClose();
      onTaskResolved?.();
    } catch (err) {
      console.error('Error discarding:', err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const canDiscard = attemptNumber >= 2;
  const isAttempt4 = attemptNumber >= 4;
  const maxAttempts = 4;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Contacto Inicial</h2>
              <p className="text-xs text-slate-300 mt-1">
                Etapa {stages?.[0]?.orden} {stages?.[0]?.tipo && `- Tipo: ${stages[0].tipo.charAt(0).toUpperCase() + stages[0].tipo.slice(1)}`}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel: Datos de la Empresa + Acciones */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-slate-200">
            {/* Datos de la Empresa */}
            {lead && (
              <div className="space-y-1 pb-4 border-b-2 border-slate-300">
                <div className="text-3xl font-bold text-slate-900">{lead.business_name}</div>
                <div className="text-sm text-slate-600">
                  {lead.zone_city && `${lead.zone_city}, `}
                  {lead.state_name && `${lead.state_name}`}
                </div>
              </div>
            )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center h-32 text-slate-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              Cargando...
            </div>
          )}


          {!loading && lead && (
            <>
              {/* Lead Info - Collapsible */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsLeadInfoOpen(!isLeadInfoOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-3 transition-all"
                >
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    ℹ️ Información de Lead
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-600 transition-transform ${
                      isLeadInfoOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isLeadInfoOpen && (
                  <div className="p-4 space-y-2 bg-white border-t border-slate-200 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-bold text-slate-700">Empresa</p>
                        <p className="text-slate-600">{lead.business_name}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">Tipo</p>
                        <p className="text-slate-600 capitalize">{lead.business_type}</p>
                      </div>
                      {lead.phone && (
                        <div>
                          <p className="font-bold text-slate-700">Teléfono</p>
                          <p className="text-slate-600 flex items-center gap-1">
                            <Phone size={10} /> {lead.phone}
                          </p>
                        </div>
                      )}
                      {lead.email && (
                        <div>
                          <p className="font-bold text-slate-700">Email</p>
                          <p className="text-slate-600 flex items-center gap-1">
                            <Mail size={10} /> {lead.email}
                          </p>
                        </div>
                      )}
                      {lead.zone_city && (
                        <div>
                          <p className="font-bold text-slate-700">Zona</p>
                          <p className="text-slate-600 flex items-center gap-1">
                            <MapPin size={10} /> {lead.zone_city}
                          </p>
                        </div>
                      )}
                      {lead.state_name && (
                        <div>
                          <p className="font-bold text-slate-700">Estado/País</p>
                          <p className="text-slate-600">
                            {lead.state_name}
                            {lead.country_name ? `, ${lead.country_name}` : ''}
                          </p>
                        </div>
                      )}
                      {lead.website && (
                        <div>
                          <p className="font-bold text-slate-700">Sitio Web</p>
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {lead.website}
                          </a>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-700">Creado</p>
                        <p className="text-slate-600">
                          {new Date(lead.created_at).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Only for contacto type */}
              {stages?.[0]?.tipo === 'contacto' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600 uppercase">Acciones de Contacto</p>
                    {(callAttempted || emailAttempted) && (
                      <div className="flex gap-1 text-xs">
                        {callAttempted && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold flex items-center gap-1"><Phone size={10} />✓</span>}
                        {emailAttempted && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold flex items-center gap-1"><Mail size={10} />✓</span>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {lead.phone && (
                      <div>
                        <div className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                          <Phone size={13} className="text-slate-400" />
                          <span className="font-semibold">{lead.phone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCallAttempted(!callAttempted)}
                          disabled={isSubmitting}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                            callAttempted
                              ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-900'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                          } disabled:opacity-50`}
                        >
                          <Phone size={16} />
                          {callAttempted ? '✓ Llamada Realizada' : 'Registrar Llamada'}
                        </button>
                      </div>
                    )}
                    {lead.email && (
                      <div>
                        <div className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                          <Mail size={13} className="text-slate-400" />
                          <span className="font-semibold truncate">{lead.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEmailAttempted(!emailAttempted)}
                          disabled={isSubmitting}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                            emailAttempted
                              ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-900'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                          } disabled:opacity-50`}
                        >
                          <Mail size={16} />
                          {emailAttempted ? '✓ Email Enviado' : 'Registrar Email'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress bar with information - After actions */}
              {stages?.[0]?.tipo === 'contacto' && (
                <div className="space-y-2 pb-4 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase">Progreso de Intentos</p>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(attemptNumber / maxAttempts) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {attemptNumber} de {maxAttempts} intentos realizados
                  </p>
                </div>
              )}

              {/* Result Buttons - All 3 together - Only for contacto type */}
              {stages?.[0]?.tipo === 'contacto' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase">Resultado del Intento</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedOutcome) {
                          setSelectedOutcome('descartar');
                        } else if (selectedOutcome === 'descartar') {
                          handleDescartar();
                        }
                      }}
                      disabled={!canDiscard || isSubmitting}
                      className={`flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                        canDiscard
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      <Trash2 size={14} />
                      Descartar
                    </button>
                    {!isAttempt4 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedOutcome) {
                            setSelectedOutcome('reintentar');
                          } else if (selectedOutcome === 'reintentar') {
                            handleReintentar();
                          }
                        }}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-1 px-2 py-2.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all font-semibold text-xs disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        Reintentar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedOutcome) {
                          setSelectedOutcome('exito');
                        } else if (selectedOutcome === 'exito') {
                          handleSuccess();
                        }
                      }}
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-1 px-2 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-xs disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Éxito
                    </button>
                  </div>
                  {!canDiscard && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                      Puedes descartar después del intento 2
                    </p>
                  )}
                </div>
              )}

              {/* Retry Flow */}
              {selectedOutcome === 'reintentar' && (
                <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-slate-900">
                      Intento {attemptNumber + 1} de {maxAttempts}
                    </h3>
                    {selectedRetryDays && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Próximo Intento:</div>
                        <div className="text-lg font-bold text-slate-900">
                          {formatRetryDate(calculateNextRetryDate(selectedRetryDays))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">Selecciona cuando reagendar (excluyendo fines de semana):</p>

                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 5, 8].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSelectedRetryDays(days)}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                          selectedRetryDays === days
                            ? 'bg-slate-900 text-white border border-slate-900'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
                        }`}
                        disabled={isSubmitting}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                        setSelectedRetryDays(null);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50 font-semibold text-sm"
                    >
                      Cancelar
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => selectedRetryDays && handleReintentar(selectedRetryDays)}
                      disabled={isSubmitting || !selectedRetryDays}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      Reagendar
                    </button>
                  </div>
                </div>
              )}

              {/* Discard Flow */}
              {selectedOutcome === 'descartar' && (
                <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-red-900">Descartar Lead</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                      }}
                      className="text-red-600 hover:text-red-800 text-xs font-bold"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-900">
                    Esta acción moverá el lead a estado "Descartado". No se puede deshacer.
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 border border-red-300 rounded-lg text-red-900 hover:bg-red-100 transition-all disabled:opacity-50 font-semibold text-sm"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleDescartar}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      Descartar Lead
                    </button>
                  </div>
                </div>
              )}

            </>
          )}
          </div>

          {/* Right Panel: Historial + Form */}
          <div className="w-80 bg-slate-50 p-4 flex flex-col border-l border-slate-200 overflow-hidden">
            {/* Decision Makers Component */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              {leadId && <DecisionMakersForm leadId={leadId} />}
            </div>

            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
              Notas & Decisiones
            </h3>

            {/* Notes Input - Always visible */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Comentarios <span className="text-slate-400">*</span>
              </label>
              <textarea
                ref={commentRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                placeholder="Describe lo que sucedió..."
                maxLength={500}
                rows={3}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs resize-none focus:outline-slate-400 disabled:opacity-60"
              />
              <p className="text-[10px] text-slate-600 mt-1">
                {note.length}/500 (mínimo 10)
              </p>
              {error && !loading && (
                <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Attempt History - Chronological order */}
            <div className="flex-1 overflow-y-auto">
              {attemptNotes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin historial</p>
              ) : (
                <div className="space-y-2">
                  {attemptNotes.map((note) => {
                    const isSuccess = note.note_type === 'success';
                    const bgColor = isSuccess ? 'bg-emerald-50' : 'bg-white';
                    const borderColor = isSuccess ? 'border-emerald-200' : 'border-slate-200';
                    const textColor = isSuccess ? 'text-emerald-900' : 'text-slate-700';
                    const dateColor = isSuccess ? 'text-emerald-600' : 'text-slate-400';

                    return (
                      <div key={note.id} className={`${bgColor} rounded-lg p-2 border ${borderColor}`}>
                        <p className={`text-[10px] font-bold ${textColor}`}>
                          Intento {note.attempt_number}
                        </p>
                        <p className={`text-[10px] ${textColor} mt-1`}>{note.note_text}</p>
                        <p className={`text-[9px] ${dateColor} mt-1`}>
                          {new Date(note.created_at).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
