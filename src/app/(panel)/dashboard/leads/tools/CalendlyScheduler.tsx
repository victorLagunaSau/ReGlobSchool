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

      // PASO 1: Upsert en lead_meetings (crea si no existe, actualiza si existe)
      const { data: meetingData, error: meetingError } = await supabase
        .from('lead_meetings')
        .upsert({
          lead_id: leadId,
          event_type: eventData.event.title,
          start_time: eventData.event.start_time,
          end_time: eventData.event.end_time,
          invitee_name: eventData.invitee.name,
          invitee_email: eventData.invitee.email,
          invitee_phone: eventData.invitee.phone,
          invitee_timezone: eventData.invitee.timezone,
          calendly_uri: eventData.event.uri,
          status: 'agendada',
        }, {
          onConflict: 'lead_id'
        })
        .select('id')
        .single();

      if (meetingError) {
        console.error('❌ Error upsert lead_meetings:', meetingError);
        throw meetingError;
      }

      console.log('✅ lead_meetings upserted:', meetingData.id);

      // PASO 2: Guardar comentario automático en lead_attempt_notes
      const startTimeFormatted = new Date(eventData.event.start_time).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const commentText = `📅 Reunión agendada\n👤 ${eventData.invitee.name} (${eventData.invitee.email})\n🕐 ${startTimeFormatted}`;

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
        console.error('⚠️ Error guardando comentario:', commentError);
        // No throw - continuar aunque falle el comentario
      } else {
        console.log('✅ Comentario guardado');
      }

      // PASO 3: Notificar al componente padre con datos para mostrar
      onEventScheduled({
        event_type: eventData.event.title,
        start_time: eventData.event.start_time,
        invitee_name: eventData.invitee.name,
        invitee_email: eventData.invitee.email,
        calendly_uri: eventData.event.uri,
      });

      console.log('✅ Reunión agendada exitosamente');
    } catch (err) {
      console.error('🔥 Error en handleEventScheduled:', err);
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
