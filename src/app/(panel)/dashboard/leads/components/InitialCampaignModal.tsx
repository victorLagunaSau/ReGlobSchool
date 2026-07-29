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
    if (!startDate) {
      setError('Selecciona una fecha de inicio');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('clave')
        .eq('orden', 2)
        .single();

      if (stagesError) throw stagesError;
      const nextStageClave = stagesData?.clave || 'llamada';

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

      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: nextStageClave })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: lead.id,
          interaction_type: 'task_outcome',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: 'Campaña iniciada',
          message: `Campaña iniciada para ${startDate}`,
          metadata: {
            task_id: taskData?.id,
            start_date: startDate,
          },
        });

      if (interactionError) throw interactionError;

      setStartDate(new Date().toISOString().split('T')[0]);
      onClose();
      onCampaignStarted?.();
    } catch (err) {
      console.error('Error creating campaign task:', err);
      setError('Error al iniciar campaña. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
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
        <div className="p-6 space-y-4">
          {/* Lead Info */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Prospecto</div>
            <div>
              <div className="font-bold text-slate-900">{lead.business_name}</div>
              <div className="text-xs text-slate-500">{lead.business_type}</div>
              {lead.zone_city && (
                <div className="text-xs text-slate-500">
                  {lead.zone_city}{lead.state_name ? `, ${lead.state_name}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Calendar */}
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
            <div className="bg-slate-50 rounded-lg p-3">
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

            <p className="text-xs text-slate-500">Selecciona la fecha en que comenzarás a trabajar este prospecto</p>
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
        <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>
          <button
            onClick={handleContinue}
            disabled={!startDate || isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Calendarizar
          </button>
        </div>
      </div>
    </div>
  );
}
