'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, Mail, MapPin, AlertCircle, Loader2, CheckCircle2, RotateCcw, Trash2, Calendar, Info } from 'lucide-react';
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
  stages: Array<{ id: string; clave: string; titulo: string; orden?: number; tipo?: string; siguiente_etapa_id?: string | null }>;
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
  const [discardCountdown, setDiscardCountdown] = useState(5);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Contact & qualification state
  const [contactPhones, setContactPhones] = useState<any[]>([]);
  const [contactEmails, setContactEmails] = useState<any[]>([]);
  const [selectedInterest, setSelectedInterest] = useState<'Alto' | 'Medio' | 'Bajo' | null>(null);
  const [selectedImportance, setSelectedImportance] = useState<1 | 2 | 3 | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [decisionMakers, setDecisionMakers] = useState<any[]>([]);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [newPhoneName, setNewPhoneName] = useState('');
  const [newPhoneRole, setNewPhoneRole] = useState('');
  const [newPhoneEmail, setNewPhoneEmail] = useState('');
  const [phoneFormError, setPhoneFormError] = useState<string | null>(null);
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newEmailName, setNewEmailName] = useState('');
  const [newEmailRole, setNewEmailRole] = useState('');
  const [newEmailValue, setNewEmailValue] = useState('');
  const [newEmailPhone, setNewEmailPhone] = useState('');
  const [emailFormError, setEmailFormError] = useState<string | null>(null);

  // Handle discard countdown
  useEffect(() => {
    if (selectedOutcome !== 'descartar') {
      setDiscardCountdown(5);
      return;
    }

    if (discardCountdown > 0) {
      const timer = setTimeout(() => setDiscardCountdown(discardCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedOutcome, discardCountdown]);

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

        console.log('Fetching task - leadId:', leadId, 'taskData:', !!taskData, 'taskError:', taskError?.code);

        if (taskError && taskError.code !== 'PGRST116') {
          throw taskError;
        }

        if (taskData) {
          console.log('Task found, setting currentTask');
          setCurrentTask(taskData as LeadTask);
          setAttemptNumber(taskData.attempt_number || 0);
        } else {
          console.log('No pending task found - fetching most recent task for this lead');
          const { data: allTasks } = await supabase
            .from('lead_tasks')
            .select('*')
            .eq('lead_id', leadId)
            .in('task_type', ['contacto_inicial', 'seguimiento'])
            .order('created_at', { ascending: false })
            .limit(1);

          if (allTasks && allTasks.length > 0) {
            console.log('Using most recent task:', allTasks[0].id);
            setCurrentTask(allTasks[0] as LeadTask);
            setAttemptNumber(allTasks[0].attempt_number || 0);
          } else {
            console.log('No tasks found for this lead at all');
          }
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

        // Fetch contacts from lead_contacts table
        const { data: contactsData } = await supabase
          .from('lead_contacts')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true });

        // Filter by actual data presence, not by tipo field
        let phones = contactsData?.filter(c => c.telefono) || [];
        let emails = contactsData?.filter(c => c.email) || [];

        // Add initial lead phone if exists (will be first cell, constante)
        if (lead?.phone) {
          phones.unshift({
            id: `initial-phone-${leadId}`,
            telefono: lead.phone,
            nombre: lead.business_name || 'Contacto Principal',
            cargo: 'Principal',
            source: 'auto',
          } as any);
        }

        // Add initial lead email if exists (will be first cell, constante)
        if (lead?.email) {
          emails.unshift({
            id: `initial-email-${leadId}`,
            email: lead.email,
            nombre: lead.business_name || 'Contacto Principal',
            cargo: 'Principal',
            source: 'auto',
          } as any);
        }

        setContactPhones(phones);
        setContactEmails(emails);

        // Fetch decision makers
        const { data: dmData } = await supabase
          .from('lead_decision_makers')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true });

        if (dmData) {
          setDecisionMakers(dmData);
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
  }, [isOpen, leadId, lead?.id]);

  const deleteContact = async (contactId: string, tipo: 'telefono' | 'email') => {
    // No eliminar contactos iniciales (que no existen en BD)
    if (contactId.startsWith('initial-')) {
      if (tipo === 'telefono') {
        setContactPhones(prev => prev.filter((c: any) => c.id !== contactId));
      } else {
        setContactEmails(prev => prev.filter((c: any) => c.id !== contactId));
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('lead_contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('Error eliminando de BD:', error);
        throw error;
      }

      // Actualizar estado local después de eliminar de BD
      if (tipo === 'telefono') {
        setContactPhones(prev => prev.filter((c: any) => c.id !== contactId));
      } else {
        setContactEmails(prev => prev.filter((c: any) => c.id !== contactId));
      }
    } catch (err) {
      console.error('Error eliminando contacto:', err);
      alert('Error al eliminar contacto.');
    }
  };

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

  const savePhoneContact = async () => {
    setPhoneFormError(null);

    // Validar que al menos teléfono o email esté rellenado
    if (!newPhone.trim() && !newPhoneEmail.trim()) {
      setPhoneFormError('Ingresa al menos un teléfono o email');
      return;
    }

    // Validar que nombre y cargo sean obligatorios
    if (!newPhoneName.trim()) {
      setPhoneFormError('El nombre es obligatorio');
      return;
    }

    if (!newPhoneRole.trim()) {
      setPhoneFormError('El cargo es obligatorio');
      return;
    }

    try {
      // Guardar en BD inmediatamente
      const { data, error } = await supabase
        .from('lead_contacts')
        .insert({
          lead_id: leadId,
          tipo: 'telefono',
          nombre: newPhoneName.trim(),
          cargo: newPhoneRole.trim(),
          telefono: newPhone.trim() || null,
          email: newPhoneEmail.trim() || null,
          source: 'manual',
          es_tomador_decision: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Agregar a la lista local
      if (data) {
        setContactPhones(prev => [...prev, data]);
      }

      // Limpiar el formulario
      setNewPhone('');
      setNewPhoneEmail('');
      setNewPhoneName('');
      setNewPhoneRole('');
      setIsAddingPhone(false);
      setPhoneFormError('');
    } catch (err) {
      console.error('Error guardando contacto telefónico:', err);
      setPhoneFormError('Error al guardar. Intenta de nuevo.');
    }
  };

  const saveEmailContact = async () => {
    setEmailFormError(null);

    // Validar que al menos teléfono o email esté rellenado
    if (!newEmailValue.trim() && !newEmailPhone.trim()) {
      setEmailFormError('Ingresa al menos un teléfono o email');
      return;
    }

    // Validar que nombre y cargo sean obligatorios
    if (!newEmailName.trim()) {
      setEmailFormError('El nombre es obligatorio');
      return;
    }

    if (!newEmailRole.trim()) {
      setEmailFormError('El cargo es obligatorio');
      return;
    }

    try {
      // Guardar en BD inmediatamente
      const { data, error } = await supabase
        .from('lead_contacts')
        .insert({
          lead_id: leadId,
          tipo: 'email',
          nombre: newEmailName.trim(),
          cargo: newEmailRole.trim(),
          email: newEmailValue.trim() || null,
          telefono: newEmailPhone.trim() || null,
          source: 'manual',
          es_tomador_decision: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Agregar a la lista local
      if (data) {
        setContactEmails(prev => [...prev, data]);
      }

      // Limpiar el formulario
      setNewEmailValue('');
      setNewEmailPhone('');
      setNewEmailName('');
      setNewEmailRole('');
      setIsAddingEmail(false);
      setEmailFormError('');
    } catch (err) {
      console.error('Error guardando contacto de email:', err);
      setEmailFormError('Error al guardar. Intenta de nuevo.');
    }
  };

  const saveAttemptNote = async (noteType: 'attempt' | 'success' | 'retry' | 'discard', qualifiedComment?: string) => {
    if (!currentTask || !note.trim()) return;

    const noteText = qualifiedComment || note.trim();

    try {
      const { error } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: currentTask.lead_id,
          stage_clave: 'llamada',
          stage_titulo: 'Etapa 2 - Intento de Contacto',
          attempt_number: attemptNumber,
          note_type: noteType,
          note_text: noteText,
        });

      if (error) console.error('Error saving note:', error);
    } catch (err) {
      console.error('Error saving attempt note:', err);
    }
  };

  const addContactPhone = async (phone: string) => {
    if (!leadId || !phone.trim()) return;

    const newPhoneEntry = {
      value: phone.trim(),
      source: 'manual',
      added_at: new Date().toISOString(),
    };

    const updated = [...contactPhones, newPhoneEntry];
    setContactPhones(updated);
    setNewPhone('');

    try {
      await supabase
        .from('leads')
        .update({ contact_phones: updated })
        .eq('id', leadId);
    } catch (err) {
      console.error('Error saving phone:', err);
    }
  };

  const addContactEmail = async (email: string) => {
    if (!leadId || !email.trim()) return;

    const newEmailEntry = {
      value: email.trim(),
      source: 'manual',
      added_at: new Date().toISOString(),
    };

    const updated = [...contactEmails, newEmailEntry];
    setContactEmails(updated);
    setNewEmail('');

    try {
      await supabase
        .from('leads')
        .update({ contact_emails: updated })
        .eq('id', leadId);
    } catch (err) {
      console.error('Error saving email:', err);
    }
  };

  const getQualifiedComment = (): string => {
    let comment = note.trim();
    const qualifiers: string[] = [];

    if (selectedInterest) qualifiers.push(`Interés: ${selectedInterest}`);
    if (selectedImportance) qualifiers.push(`Importancia: ${selectedImportance}`);

    if (qualifiers.length > 0) {
      comment += ` [${qualifiers.join(', ')}]`;
    }

    return comment;
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

      const qualifiedComment = getQualifiedComment();
      await saveAttemptNote('success', qualifiedComment);

      // Log interaction
      await supabase
        .from('lead_interactions')
        .insert({
          lead_id: currentTask.lead_id,
          interaction_type: 'task_outcome',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: 'Contacto exitoso',
          message: qualifiedComment,
          metadata: {
            contact_methods: {
              llamada: callAttempted,
              email: emailAttempted,
            },
            assigned_to: assignedTo,
            interest: selectedInterest,
            importance: selectedImportance,
          },
        });

      // Advance to next stage with qualified comment
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
        qualifiedComment
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
    const trimmedNote = note.trim();
    if (!trimmedNote || trimmedNote.length < 10) {
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
      const qualifiedComment = getQualifiedComment();
      await saveAttemptNote('retry', qualifiedComment);
      const nextDate = calculateNextRetryDate(days);

      // Get current task if not loaded
      let task = currentTask;
      if (!task && leadId) {
        const { data: taskData } = await supabase
          .from('lead_tasks')
          .select('*')
          .eq('lead_id', leadId)
          .in('task_type', ['contacto_inicial', 'seguimiento'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        task = taskData as LeadTask;
      }

      if (!task) {
        throw new Error('No se pudo encontrar la tarea para reagendar');
      }

      await resolveTaskWithPipeline(
        {
          id: task.id,
          lead_id: task.lead_id,
          task_type: task.task_type,
          channel: task.channel,
          attempt_number: task.attempt_number,
        },
        'reintentar',
        undefined,
        qualifiedComment,
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
      const qualifiedComment = getQualifiedComment();
      await saveAttemptNote('discard', qualifiedComment);

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
        qualifiedComment,
        undefined
      );

      resetForm();
      onClose();
      onTaskResolved?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Error discarding:', errorMessage);
      console.error('Full error:', err);
      setError(`Error al guardar: ${errorMessage}`);
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
              <div className="space-y-2 pb-4 border-b-2 border-slate-300">
                <div className="text-3xl font-bold text-slate-900">{lead.business_name}</div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-600 flex-1">
                    {lead.zone_city && `${lead.zone_city}, `}
                    {lead.state_name && `${lead.state_name}`}
                  </div>
                  <button
                    onClick={() => setIsLeadInfoOpen(!isLeadInfoOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0 text-blue-600 hover:text-blue-700 group"
                    title="Ver información del lead"
                  >
                    <Info size={18} />
                    <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">Información de Lead</span>
                  </button>
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
              {/* Lead Info Popover */}
              {isLeadInfoOpen && (
                <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsLeadInfoOpen(false)} />
              )}
              {isLeadInfoOpen && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-w-3xl w-[90vw] p-6">
                  <button
                    onClick={() => setIsLeadInfoOpen(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X size={18} />
                  </button>

                  <h3 className="text-lg font-bold text-slate-900 mb-6">Información de Contacto</h3>

                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="font-bold text-slate-700 mb-1">Empresa</p>
                      <p className="text-slate-600">{lead.business_name}</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 mb-1">Tipo</p>
                      <p className="text-slate-600 capitalize">{lead.business_type}</p>
                    </div>
                    {lead.phone && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" /> Teléfono
                        </p>
                        <p className="text-slate-600">{lead.phone}</p>
                      </div>
                    )}
                    {lead.email && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                          <Mail size={14} className="text-slate-400" /> Email
                        </p>
                        <p className="text-slate-600 break-all">{lead.email}</p>
                      </div>
                    )}
                    {lead.zone_city && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" /> Zona
                        </p>
                        <p className="text-slate-600">{lead.zone_city}</p>
                      </div>
                    )}
                    {lead.state_name && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1">Estado/País</p>
                        <p className="text-slate-600">
                          {lead.state_name}
                          {lead.country_name ? `, ${lead.country_name}` : ''}
                        </p>
                      </div>
                    )}
                    {lead.website && (
                      <div className="col-span-2">
                        <p className="font-bold text-slate-700 mb-1">Sitio Web</p>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {lead.website}
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-700 mb-1">Creado</p>
                      <p className="text-slate-600">
                        {new Date(lead.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons - Only for contacto type */}
              {stages?.[0]?.tipo === 'contacto' && (
                <>
                  {/* Section Title - Larger & Outside */}
                  <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Acciones de Contacto</h3>
                  {(callAttempted || emailAttempted) && (
                    <div className="flex gap-2 mt-2">
                      {callAttempted && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs flex items-center gap-1"><Phone size={12} />✓ Llamada</span>}
                      {emailAttempted && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs flex items-center gap-1"><Mail size={12} />✓ Email</span>}
                    </div>
                  )}
                </div>

                {/* Llamadas Section - Separate Card */}
                <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 mb-4">
                  {/* Llamadas Section */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Llamadas</h4>

                    {/* Phone/Contact Grid Catalog - 4 columns */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {contactPhones.length === 0 ? (
                        <div className="col-span-4 text-xs text-slate-400 italic">Sin contactos telefónicos agregados</div>
                      ) : (
                        contactPhones.map((phone, idx) => {
                          const isInitial = phone.id?.startsWith('initial-phone-');
                          return (
                            <div
                              key={phone.id || `contact-${idx}`}
                              className={`flex flex-col gap-1 p-2 rounded-lg transition-all relative group ${
                                isInitial
                                  ? 'bg-emerald-50 border border-emerald-300'
                                  : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 text-xs truncate">{phone.nombre}</div>
                                <div className="text-slate-600 text-[10px] truncate">{phone.cargo}</div>
                                {phone.telefono && (
                                  <button
                                    onClick={() => window.location.href = `tel:${phone.telefono}`}
                                    className="flex items-center gap-1 mt-1 text-blue-600 hover:text-blue-700 text-[10px] font-semibold"
                                  >
                                    <Phone size={10} />
                                    {phone.telefono}
                                  </button>
                                )}
                              </div>
                              {!isInitial && (
                                <button
                                  onClick={() => deleteContact(phone.id, 'telefono')}
                                  className="absolute top-1 right-1 text-slate-400 hover:text-red-600 transition-colors p-0.5 opacity-0 group-hover:opacity-100"
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* Add Phone - Left, Subtle Link Style */}
                      <button
                        type="button"
                        onClick={() => setIsAddingPhone(!isAddingPhone)}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-all disabled:opacity-50"
                      >
                        +Agregar
                      </button>

                      {/* Register Call - Right, Prominent */}
                      <button
                        type="button"
                        onClick={() => setCallAttempted(!callAttempted)}
                        disabled={isSubmitting}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          callAttempted
                            ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-900'
                            : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                        } disabled:opacity-50`}
                      >
                        <Phone size={16} />
                        {callAttempted ? '✓ Realizada' : 'Registrar Llamada'}
                      </button>
                    </div>

                    {/* Add Phone Form */}
                    {isAddingPhone && (
                      <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        {/* Row 1: Cargo 30%, Nombre 70% */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Cargo (Obligatorio)"
                            value={newPhoneRole}
                            onChange={(e) => setNewPhoneRole(e.target.value)}
                            className="w-3/10 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Nombre (Obligatorio)"
                            value={newPhoneName}
                            onChange={(e) => setNewPhoneName(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                        </div>

                        {/* Row 2: Teléfono 50%, Email 50% */}
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="Teléfono (Opcional)"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                          <input
                            type="email"
                            placeholder="Email (Opcional)"
                            value={newPhoneEmail}
                            onChange={(e) => setNewPhoneEmail(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                        </div>
                        {phoneFormError && (
                          <div className="text-[10px] text-red-600 font-semibold">{phoneFormError}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingPhone(false);
                              setNewPhone('');
                              setNewPhoneEmail('');
                              setNewPhoneName('');
                              setNewPhoneRole('');
                              setPhoneFormError('');
                            }}
                            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={savePhoneContact}
                            className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-all"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emails Section - Separate Card */}
                <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Emails</h4>

                    {/* Email List - 3 columns */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {contactEmails.length === 0 ? (
                        <div className="col-span-3 text-xs text-slate-400 italic">Sin contactos de email agregados</div>
                      ) : (
                        contactEmails.map((contact, idx) => {
                          const isInitial = contact.id?.startsWith('initial-email-');
                          return (
                            <div
                              key={contact.id || `email-${idx}`}
                              className={`flex flex-col gap-1 p-2 rounded-lg transition-all relative group ${
                                isInitial
                                  ? 'bg-emerald-50 border border-emerald-300'
                                  : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 text-xs truncate">{contact.nombre}</div>
                                <div className="text-slate-600 text-[10px] truncate">{contact.cargo}</div>
                                {contact.email && (
                                  <button
                                    onClick={() => window.location.href = `mailto:${contact.email}`}
                                    className="flex items-center gap-1 mt-1 text-blue-600 hover:text-blue-700 text-[10px] font-semibold"
                                  >
                                    <Mail size={10} />
                                    {contact.email}
                                  </button>
                                )}
                              </div>
                              {!isInitial && (
                                <button
                                  onClick={() => deleteContact(contact.id, 'email')}
                                  className="absolute top-1 right-1 text-slate-400 hover:text-red-600 transition-colors p-0.5 opacity-0 group-hover:opacity-100"
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* Add Email - Left, Subtle Link Style */}
                      <button
                        type="button"
                        onClick={() => setIsAddingEmail(!isAddingEmail)}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-all disabled:opacity-50"
                      >
                        +Agregar
                      </button>

                      {/* Register Email - Right, Prominent */}
                      <button
                        type="button"
                        onClick={() => setEmailAttempted(!emailAttempted)}
                        disabled={isSubmitting}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          emailAttempted
                            ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-900'
                            : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                        } disabled:opacity-50`}
                      >
                        <Mail size={16} />
                        {emailAttempted ? '✓ Enviado' : 'Registrar Email'}
                      </button>
                    </div>

                    {/* Add Email Form */}
                    {isAddingEmail && (
                      <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        {/* Row 1: Cargo 30%, Nombre 70% */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Cargo (Obligatorio)"
                            value={newEmailRole}
                            onChange={(e) => setNewEmailRole(e.target.value)}
                            className="w-3/10 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Nombre (Obligatorio)"
                            value={newEmailName}
                            onChange={(e) => setNewEmailName(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                        </div>

                        {/* Row 2: Teléfono 50%, Email 50% */}
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="Teléfono (Opcional)"
                            value={newEmailPhone}
                            onChange={(e) => setNewEmailPhone(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                          <input
                            type="email"
                            placeholder="Email (Opcional)"
                            value={newEmailValue}
                            onChange={(e) => setNewEmailValue(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                          />
                        </div>
                        {emailFormError && (
                          <div className="text-[10px] text-red-600 font-semibold">{emailFormError}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingEmail(false);
                              setNewEmailValue('');
                              setNewEmailPhone('');
                              setNewEmailName('');
                              setNewEmailRole('');
                              setEmailFormError('');
                            }}
                            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={saveEmailContact}
                            className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-all"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}

              {/* Progress & Result Card - Only for contacto type */}
              {stages?.[0]?.tipo === 'contacto' && (
                <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200">
                  {/* Progress bar with information */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase">Progreso de Intentos</p>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          attemptNumber >= maxAttempts * 0.75
                            ? 'bg-red-600'
                            : attemptNumber >= maxAttempts * 0.5
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(attemptNumber / maxAttempts) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {attemptNumber} de {maxAttempts} intentos realizados
                    </p>
                  </div>

                  {/* Result Buttons - All 3 together */}
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
                        onClick={handleSuccess}
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
                  <h3 className="font-bold text-red-900">Descartar Lead</h3>

                  <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-900">
                    Esta acción moverá el lead a estado "Descartado". No se puede deshacer.
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutcome(null);
                        setNote('');
                        setDiscardCountdown(5);
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-2 border border-red-300 rounded-lg text-red-900 hover:bg-red-100 transition-all disabled:opacity-50 font-semibold text-xs"
                    >
                      Cancelar
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={handleDescartar}
                      disabled={isSubmitting || discardCountdown > 0}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      {discardCountdown > 0 ? `Descartar en ${discardCountdown}s` : 'Descartar Lead'}
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
            <div className="mb-4">
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

            {/* Qualification - Optional selects below comments */}
            <div className="pb-4 border-b border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interés</label>
                  <select
                    value={selectedInterest || ''}
                    onChange={(e) => setSelectedInterest(e.target.value as any || null)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Alto">Alto</option>
                    <option value="Medio">Medio</option>
                    <option value="Bajo">Bajo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Importancia</label>
                  <select
                    value={selectedImportance || ''}
                    onChange={(e) => setSelectedImportance(e.target.value ? (parseInt(e.target.value) as any) : null)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Attempt History - Reverse chronological order */}
            <div className="flex-1 overflow-y-auto">
              {attemptNotes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin historial</p>
              ) : (
                <>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 mt-3 sticky top-0 bg-slate-50 pb-2">
                    Comentarios anteriores:
                  </h3>
                  <div className="space-y-2">
                    {attemptNotes.slice().reverse().map((note) => {
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
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
