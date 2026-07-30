'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface ContactAttemptActionProps {
  leadId: string;
  selectedPhone: string | null;
  selectedEmail: string | null;
  outcome: 'no_contactado' | 'contacto_establecido' | 'reunion_agendada';
  notes: string;
  onSuccess: () => void;
  isSubmitting?: boolean;
}

export default function ContactAttemptAction({
  leadId,
  selectedPhone,
  selectedEmail,
  outcome,
  notes,
  onSuccess,
  isSubmitting = false,
}: ContactAttemptActionProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAttempt = async () => {
    if (!selectedPhone && !selectedEmail) {
      setError('Selecciona un teléfono o email');
      return;
    }

    if (!notes.trim() || notes.trim().length < 10) {
      setError('Las notas deben tener al menos 10 caracteres');
      return;
    }

    const channel = selectedPhone ? 'phone' : 'email';
    const contactValue = selectedPhone || selectedEmail;

    setIsLoading(true);
    setError(null);

    try {
      // Obtener el siguiente stage (orden 3)
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('clave')
        .eq('orden', 3)
        .single();

      if (stagesError) throw stagesError;
      const nextStageClave = stagesData?.clave || 'negociacion';

      // Crear o actualizar intento de contacto
      const { data: attemptData, error: attemptError } = await supabase
        .from('lead_attempts')
        .insert({
          lead_id: leadId,
          channel: channel,
          outcome: outcome,
          attempt_number: 1,
          status: outcome === 'contacto_establecido' ? 'exitoso' : 'fallido',
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Guardar nota de intento
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: '102',
          stage_titulo: 'Etapa 2 - Contacto Inicial',
          attempt_number: 1,
          note_type: outcome === 'contacto_establecido' ? 'success' : outcome === 'reunion_agendada' ? 'retry' : 'attempt',
          note_text: notes.trim(),
        });

      if (noteError) throw noteError;

      // Solo avanzar si el contacto fue exitoso
      if (outcome === 'contacto_establecido' || outcome === 'reunion_agendada') {
        const { error: leadError } = await supabase
          .from('leads')
          .update({ status: nextStageClave })
          .eq('id', leadId);

        if (leadError) throw leadError;
      }

      // Registrar interacción
      const outcomeLabel = {
        no_contactado: 'No contactado',
        contacto_establecido: 'Contacto establecido',
        reunion_agendada: 'Reunión agendada',
      };

      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'contact_attempt',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Intento de contacto por ${channel}`,
          message: `${outcomeLabel[outcome]}: ${notes.trim()}`,
          metadata: {
            attempt_id: attemptData?.id,
            channel: channel,
            outcome: outcome,
          },
        });

      if (interactionError) throw interactionError;

      onSuccess();
    } catch (err) {
      console.error('Error registering contact attempt:', err);
      setError('Error al registrar intento. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleAttempt}
        disabled={!notes.trim() || notes.trim().length < 10 || isLoading || isSubmitting}
        className="w-full px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        Registrar Intento
      </button>
    </div>
  );
}
