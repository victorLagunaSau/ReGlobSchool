'use client';

import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import DecisionMakersForm from './DecisionMakersForm';

interface InitialCampaignModalProps {
  isOpen: boolean;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    zone_city: string | null;
    state_name: string | null;
  } | null;
  onClose: () => void;
  onCampaignStarted?: () => void;
}

export default function InitialCampaignModal({
  isOpen,
  lead,
  onClose,
  onCampaignStarted,
}: InitialCampaignModalProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const handleContinue = async () => {
    if (!startDate) {
      setError('Selecciona una fecha de inicio');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get the next pipeline stage (should be "llamada" for stage orden 2)
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('clave')
        .eq('orden', 2)
        .single();

      if (stagesError) throw stagesError;
      const nextStageClave = stagesData?.clave || 'llamada';

      // Create the first lead task (contacto_inicial)
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

      // Update lead status to next stage
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: nextStageClave })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      // Log interaction
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

      // Reset and close
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Iniciar Campaña</h2>
              <p className="text-xs text-slate-300 mt-1">Etapa 1 - Inicio de Campaña</p>
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
              {lead.zone_city && (
                <div className="text-xs text-slate-500">
                  {lead.zone_city}{lead.state_name ? `, ${lead.state_name}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Decision Makers */}
          <div className="space-y-2">
            {lead && <DecisionMakersForm leadId={lead.id} readOnly={false} />}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Fecha de inicio de trabajo</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">Selecciona la fecha en que comenzarás a trabajar este lead</p>
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
            Cancelar
          </button>
          <button
            onClick={handleContinue}
            disabled={!startDate || isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Calendarizar
          </button>
        </div>
      </div>
    </div>
  );
}
