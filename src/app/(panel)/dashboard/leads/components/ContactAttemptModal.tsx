'use client';

import React, { useState, useEffect } from 'react';
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
  stages: Array<{ id: string; clave: string; titulo: string; orden: number }>;
  onClose: () => void;
  onTaskResolved?: () => void;
}

interface LeadTask {
  id: string;
  lead_id: string;
  task_type: 'contacto_inicial' | 'seguimiento' | 'demo';
  channel: 'telefono' | 'email' | 'ambos' | null;
  attempt_number: number;
  status: string;
}

export default function ContactAttemptModal({
  isOpen,
  leadId,
  lead,
  stages,
  onClose,
  onTaskResolved,
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

  // Success flow state
  const [scheduledDate, setScheduledDate] = useState('');
  const [modality, setModality] = useState<'virtual' | 'presencial'>('virtual');
  const [calendarLink, setCalendarLink] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [isEditingResponsible, setIsEditingResponsible] = useState(false);
  const [newResponsible, setNewResponsible] = useState('');
  const [attemptNotes, setAttemptNotes] = useState<any[]>([]);

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
      return;
    }

    if (!scheduledDate) {
      setError('Debes seleccionar una fecha para la demostración');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedDate = new Date(scheduledDate);
      if (selectedDate <= new Date()) {
        setError('La fecha debe ser en el futuro');
        setIsSubmitting(false);
        return;
      }

      // Get next stage (negociacion)
      const nextStage = stages.find(s => s.orden === 3);
      if (!nextStage) {
        throw new Error('No se encontró la etapa de Negociación');
      }

      await saveAttemptNote('success');

      // Log interaction with decision makers
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
            decision_makers: decisionMakers,
            scheduled_date: scheduledDate,
            modality: modality,
          },
        });

      await resolveTaskWithPipeline(
        {
          id: currentTask.id,
          lead_id: currentTask.lead_id,
          task_type: currentTask.task_type,
          channel: currentTask.channel,
          attempt_number: currentTask.attempt_number,
        },
        'exito',
        nextStage.id,
        note.trim(),
        calendarLink || undefined
      );

      resetForm();
      onClose();
      onTaskResolved?.();
    } catch (err) {
      console.error('Error marking success:', err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReintentar = async () => {
    if (!currentTask || !note.trim() || note.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
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
        undefined
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
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {lead && (
                <>
                  <h2 className="text-lg font-bold">{lead.business_name}</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {lead.zone_city && `${lead.zone_city}, `}
                    {lead.state_name && `${lead.state_name}`}
                    {lead.country_name && ` • ${lead.country_name}`}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div>
              <p className="text-xs text-slate-400 mb-1">Etapa 2 - Intento de Contacto</p>
              {currentTask && (
                <span className="px-2.5 py-1 bg-slate-700 rounded text-sm font-bold">
                  {attemptNumber} de {maxAttempts}
                </span>
              )}
            </div>

            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Responsable</p>
              {!isEditingResponsible ? (
                <button
                  onClick={() => {
                    setIsEditingResponsible(true);
                    setNewResponsible(assignedTo || '');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm font-semibold text-white w-full text-left"
                >
                  {assignedTo || '+ Asignar'}
                </button>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newResponsible}
                    onChange={(e) => setNewResponsible(e.target.value)}
                    placeholder="Nombre del responsable"
                    className="flex-1 px-2 py-1 rounded text-sm bg-slate-800 text-white placeholder-slate-500 focus:outline-slate-500"
                    disabled={isSubmitting}
                  />
                  <button
                    onClick={async () => {
                      if (leadId && newResponsible.trim()) {
                        await supabase
                          .from('leads')
                          .update({ assigned_to: newResponsible.trim() })
                          .eq('id', leadId);
                        setAssignedTo(newResponsible.trim());
                      }
                      setIsEditingResponsible(false);
                    }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-bold text-white disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel: Actions */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-slate-200">
            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(attemptNumber / maxAttempts) * 100}%` }}
            />
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center h-32 text-slate-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              Cargando...
            </div>
          )}

          {error && !loading && (
            <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
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

              {/* Action Buttons */}
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

              {/* Outcome Selection */}
              {!selectedOutcome && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase">Resultado del Intento</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('exito')}
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-2 px-3 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg hover:bg-emerald-100 transition-all font-semibold text-sm disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      Éxito
                    </button>
                    {!isAttempt4 && (
                      <button
                        type="button"
                        onClick={() => setSelectedOutcome('reintentar')}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-200 transition-all font-semibold text-sm disabled:opacity-50"
                      >
                        <RotateCcw size={18} />
                        Reintentar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('descartar')}
                      disabled={!canDiscard || isSubmitting}
                      className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg font-semibold text-sm transition-all ${
                        canDiscard
                          ? 'bg-red-50 border border-red-200 text-red-900 hover:bg-red-100'
                          : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      <Trash2 size={18} />
                      Descartar
                    </button>
                  </div>
                  {!canDiscard && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                      Puedes descartar después del intento 2
                    </p>
                  )}
                </div>
              )}

              {/* Success Flow */}
              {selectedOutcome === 'exito' && (
                <div className="space-y-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-emerald-900">Agendar Demostración</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setScheduledDate('');
                        setCalendarLink('');
                      }}
                      className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-900 mb-2">
                      Fecha y Hora <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white focus:outline-emerald-600 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-900 mb-2">
                      Modalidad <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modality}
                      onChange={(e) => setModality(e.target.value as 'virtual' | 'presencial')}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white focus:outline-emerald-600 disabled:opacity-60"
                    >
                      <option value="virtual">Virtual</option>
                      <option value="presencial">Presencial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-900 mb-2">
                      Link de Calendario (Google Meet, Zoom, etc.)
                    </label>
                    <input
                      type="url"
                      value={calendarLink}
                      onChange={(e) => setCalendarLink(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white focus:outline-emerald-600 disabled:opacity-60"
                    />
                  </div>


                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg text-emerald-900 hover:bg-emerald-100 transition-all disabled:opacity-50 font-semibold text-sm"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleSuccess}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      Confirmar Éxito
                    </button>
                  </div>
                </div>
              )}

              {/* Retry Flow */}
              {selectedOutcome === 'reintentar' && (
                <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">
                      Próximo intento en 3 días ({attemptNumber + 1} de {maxAttempts})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                      }}
                      className="text-slate-600 hover:text-slate-800 text-xs font-bold"
                    >
                      Cambiar
                    </button>
                  </div>


                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50 font-semibold text-sm"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleReintentar}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      Reintentar en 3 Días
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

          {/* Right Panel: Notes & History */}
          <div className="w-80 bg-slate-50 p-4 flex flex-col border-l border-slate-200 overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
              Notas & Decisiones
            </h3>

            {/* Decision Makers Component */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              {leadId && <DecisionMakersForm leadId={leadId} />}
            </div>

            {/* Notes Input */}
            {selectedOutcome && (
              <div className="mb-4 pb-4 border-b border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Comentarios <span className="text-red-500">*</span>
                </label>
                <textarea
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
              </div>
            )}

            {/* Attempt History */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-600 mb-2">Intentos Previos</h4>
              {attemptNotes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin intentos previos</p>
              ) : (
                <div className="space-y-2">
                  {attemptNotes.map((note) => (
                    <div key={note.id} className="bg-white rounded-lg p-2 border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-800">
                        Intento {note.attempt_number}
                      </p>
                      <p className="text-[10px] text-slate-700 mt-1">{note.note_text}</p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {new Date(note.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
