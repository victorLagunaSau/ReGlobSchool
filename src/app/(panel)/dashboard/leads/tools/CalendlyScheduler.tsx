'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { InlineWidget } from 'react-calendly';
import { supabase } from '@/src/lib/supabase/client';

interface CalendlySchedulerProps {
  leadId: string;
  lead: {
    business_name: string;
    email?: string;
    phone?: string;
  } | null;
  onEventScheduled: (eventData: any) => void;
  onError: (error: string) => void;
}

export default function CalendlyScheduler({
  leadId,
  lead,
  onEventScheduled,
  onError,
}: CalendlySchedulerProps) {
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCalendlyUrl = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError('No autenticado');
          setLoading(false);
          return;
        }

        const { data: integration, error: err } = await supabase
          .from('user_integrations')
          .select('config, is_active')
          .eq('user_id', userData.user.id)
          .eq('provider', 'calendly')
          .single();

        if (err || !integration) {
          setError('Calendly no está configurado. Ve a Configuración → Integraciones');
          setLoading(false);
          return;
        }

        if (!integration.is_active) {
          setError('Integración de Calendly deshabilitada');
          setLoading(false);
          return;
        }

        const url = (integration.config as any)?.calendly_url;
        if (!url) {
          setError('URL de Calendly no configurada. Ve a Configuración → Integraciones');
          setLoading(false);
          return;
        }

        setCalendlyUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error loading Calendly URL:', err);
        setError('Error cargando configuración de Calendly');
        setLoading(false);
      }
    };

    loadCalendlyUrl();
  }, []);

  const handleEventScheduled = async (event: any) => {
    try {
      const eventData = event.data;

      console.log('📅 Evento agendado en Calendly:', {
        titulo: eventData.event.title,
        inicio: eventData.event.start_time,
        fin: eventData.event.end_time,
        invitado: eventData.invitee.name,
        email: eventData.invitee.email,
        teléfono: eventData.invitee.phone,
        zona: eventData.invitee.timezone,
        uri: eventData.event.uri,
      });

      // Actualizar lead_meetings con todos los datos
      const { data: meetingData, error: updateError } = await supabase
        .from('lead_meetings')
        .update({
          event_type: eventData.event.title,
          start_time: eventData.event.start_time,
          end_time: eventData.event.end_time,
          invitee_name: eventData.invitee.name,
          invitee_email: eventData.invitee.email,
          invitee_phone: eventData.invitee.phone,
          invitee_timezone: eventData.invitee.timezone,
          calendly_uri: eventData.event.uri,
          status: 'agendada',
        })
        .eq('lead_id', leadId)
        .eq('invitee_email', `${leadId}@calendarregglobschool.com`)
        .select('id')
        .single();

      if (updateError) {
        console.error('Error actualizando lead_meetings:', updateError);
        throw updateError;
      }

      // Actualizar leads con current_meeting_id y event_scheduled
      const { error: leadsError } = await supabase
        .from('leads')
        .update({
          current_meeting_id: meetingData.id,
          event_scheduled: true,
        })
        .eq('id', leadId);

      if (leadsError) {
        console.error('Error actualizando leads:', leadsError);
        throw leadsError;
      }

      // Guardar comentario automático en lead_attempt_notes
      const commentText = `Reunión agendada - ${eventData.event.start_time} - Invitado: ${eventData.invitee.name} (${eventData.invitee.email})`;

      const { error: commentError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: '103',
          stage_titulo: 'Reunión de Demostración',
          note_type: 'reunion_agendada',
          note_text: commentText,
        });

      if (commentError) {
        console.error('Error guardando comentario:', commentError);
      }

      // Notificar al componente padre
      onEventScheduled({
        event_type: eventData.event.title,
        start_time: eventData.event.start_time,
        invitee_name: eventData.invitee.name,
        invitee_email: eventData.invitee.email,
        calendly_uri: eventData.event.uri,
      });
    } catch (err) {
      console.error('Error en handleEventScheduled:', err);
      onError(err instanceof Error ? err.message : 'Error agendando reunión');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-slate-400 mr-2" />
        <span className="text-xs text-slate-500">Cargando calendario...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {calendlyUrl && (
        <div className="border border-slate-200 rounded-lg shadow-sm overflow-hidden bg-white">
          <InlineWidget
            url={calendlyUrl}
            onEventScheduled={handleEventScheduled}
            styles={{
              height: '700px',
            }}
            pageSettings={{
              hideEventTypeDetails: true,
              hideLandingPageDetails: true,
            }}
          />
        </div>
      )}
    </div>
  );
}
