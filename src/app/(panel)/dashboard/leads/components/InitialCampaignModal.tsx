'use client';

import React, { useState, useMemo } from 'react';
import { X, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface InitialCampaignModalProps {
  isOpen: boolean;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    zone_city: string | null;
    state_name: string | null;
  } | null;
  stage?: {
    orden?: number;
    tipo?: string;
  } | null;
  onClose: () => void;
  onCampaignStarted?: () => void;
}

export default function InitialCampaignModal({
  isOpen,
  lead,
  stage,
  onClose,
  onCampaignStarted,
}: InitialCampaignModalProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayString = today.toISOString().split('T')[0];

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isMonthDisabled = (month: Date) => {
    return month < today;
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const numDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    return days;
  }, [currentMonth]);

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;
    const dateString = date.toISOString().split('T')[0];
    return dateString < todayString;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return date.toISOString().split('T')[0] === startDate;
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      setStartDate(date.toISOString().split('T')[0]);
      if (error) setError(null);
    }
  };

  const handleContinue = async () => {
    // Validaciones
    if (!startDate) {
      setActionError('Selecciona una fecha de inicio');
      return;
    }

    if (!notes.trim() || notes.trim().length < 10) {
      setActionError('Los comentarios deben tener al menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      // Obtener el siguiente stage (orden 2)
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('clave')
        .eq('orden', 2)
        .single();

      if (stagesError) throw stagesError;
      const nextStageClave = stagesData?.clave || 'contacto';

      // Crear tarea de contacto inicial
      const { data: taskData, error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: lead.id,
          task_type: 'contacto_inicial',
          channel: null,
          attempt_number: 1,
          status: 'pendiente',
          scheduled_for: startDate,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Guardar nota de intento
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: lead.id,
          stage_clave: '101',
          stage_titulo: 'Etapa 1 - Inicio de Campaña',
          attempt_number: 1,
          note_type: 'attempt',
          note_text: notes.trim(),
        });

      if (noteError) throw noteError;

      // Actualizar estado del lead
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: nextStageClave })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      // Registrar interacción
      const user = await supabase.auth.getUser();
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: lead.id,
          interaction_type: 'task_outcome',
          actor_id: user.data.user?.id,
          action_label: 'Campaña iniciada',
          message: `Campaña iniciada para ${startDate}: ${notes.trim()}`,
          metadata: {
            task_id: taskData?.id,
            start_date: startDate,
          },
        });

      if (interactionError) throw interactionError;

      onCampaignStarted?.();
      onClose();
    } catch (err) {
      console.error('Error creating campaign task:', err);
      setActionError('Error al iniciar campaña. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Iniciar Campaña</h2>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lead Info */}
          <div className="space-y-1 pb-4 border-b-2 border-slate-300">
            <div className="text-right text-xs text-slate-600">{lead.business_type}</div>
            <div className="text-3xl font-bold text-slate-900">{lead.business_name}</div>
            {lead.zone_city && (
              <div className="text-sm text-slate-600">
                {lead.zone_city}{lead.state_name ? `, ${lead.state_name}` : ''}
              </div>
            )}
          </div>

          {/* TARJETA 1: HERRAMIENTAS DE LA ETAPA */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">📦 Herramientas de la Etapa</h3>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">Fecha de inicio de trabajo</label>

              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
                  }
                  disabled={isMonthDisabled(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <span className="text-xs font-bold text-slate-700 capitalize">{monthName}</span>
                <button
                  onClick={() =>
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
                  }
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                    const disabled = isDateDisabled(date);
                    const selected = isDateSelected(date);

                    return (
                      <button
                        key={idx}
                        onClick={() => date && handleDateSelect(date)}
                        disabled={disabled}
                        className={`
                          aspect-square text-[11px] font-bold rounded-lg transition-all
                          ${!date ? 'invisible' : ''}
                          ${
                            selected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : disabled
                              ? 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed'
                              : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100'
                          }
                        `}
                      >
                        {date?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-slate-600">Selecciona la fecha en que comenzarás a trabajar este prospecto</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            )}
          </div>

          {/* TARJETA 2: COMENTARIOS DE ACTIVIDAD */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-green-900 uppercase tracking-wide">📋 Comentarios de Actividad *</h3>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe lo que sucedió, observaciones, etc..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-green-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-slate-600">{notes.length}/500 caracteres</p>
              <p className={`text-[10px] font-bold ${notes.trim().length >= 10 ? 'text-green-600' : 'text-rose-600'}`}>
                {notes.trim().length >= 10 ? '✓ Listo' : '⚠️ Mínimo 10 caracteres'}
              </p>
            </div>
          </div>

          {/* TARJETA 3: ACCIONES */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">⚡ Acciones</h3>

            {actionError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700">{actionError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cerrar
              </button>
              <div className="flex-1">
                <button
                  onClick={handleContinue}
                  disabled={!startDate || notes.trim().length < 10 || isSubmitting}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Calendarizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
