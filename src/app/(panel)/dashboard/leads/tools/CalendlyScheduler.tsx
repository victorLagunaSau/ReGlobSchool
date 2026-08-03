'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/src/lib/supabase/client';

interface CalendlySchedulerProps {
  leadId: string;
  stageId: string;
  stageTitulo: string;
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
  stageId,
  stageTitulo,
  lead,
  onEventScheduled,
  onError,
}: CalendlySchedulerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [inviteeName, setInviteeName] = useState(lead?.business_name || '');
  const [inviteeEmail, setInviteeEmail] = useState(lead?.email || '');
  const [inviteePhone, setInviteePhone] = useState(lead?.phone || '');

  // Availability
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Cargar disponibilidad
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        setLoading(true);

        // Obtener sesión del usuario
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          setError('No hay sesión activa');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/calendly/availability?days=14', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('📅 Availability response:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Availability error:', errorData);
          setError(`No se pudo cargar la disponibilidad: ${errorData.error}`);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('✅ Availability data:', data);

        setAvailability(data.availability || {});
        setAvailableDates(Object.keys(data.availability || {}).sort());
        setLoading(false);
      } catch (err) {
        console.error('🔥 Error loading availability:', err);
        setError(`Error cargando horarios: ${err instanceof Error ? err.message : 'Unknown'}`);
        setLoading(false);
      }
    };

    loadAvailability();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteeName || !inviteeEmail || !selectedDate || !selectedTime) {
      setError('Completa todos los campos');
      return;
    }

    setSubmitting(true);

    try {
      console.log('📅 Agendando reunión...');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }

      console.log('✅ Token obtenido:', token.substring(0, 20) + '...');

      const startTime = `${selectedDate}T${selectedTime}:00`;

      // API route maneja: Calendly, BD (lead_meetings), comentarios
      const createEventResponse = await fetch('/api/calendly/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId,
          stageId,
          stageTitulo,
          startTime,
          inviteeName,
          inviteeEmail,
          inviteePhone,
        }),
      });

      console.log('📡 Response status:', createEventResponse.status);

      if (!createEventResponse.ok) {
        const errorData = await createEventResponse.json();
        console.error('❌ Server error:', errorData);
        throw new Error(`Error creando evento (${createEventResponse.status}): ${errorData.error || 'Unknown error'}`);
      }

      const eventResult = await createEventResponse.json();
      console.log('✅ Evento creado:', eventResult);

      // Llamar callback para indicar éxito
      onEventScheduled({
        event_type: 'Meeting',
        start_time: startTime,
        invitee_name: inviteeName,
        invitee_email: inviteeEmail,
        invitee_link: eventResult.inviteeLink,
      });

      // Abrir Calendly en nueva ventana después de un breve delay
      if (eventResult.inviteeLink) {
        setTimeout(() => {
          window.open(eventResult.inviteeLink, '_blank', 'width=800,height=600');
        }, 500);
      }

      setSubmitting(false);
      console.log('✅ Flujo completado');
    } catch (err) {
      console.error('🔥 Error:', err);
      setError(err instanceof Error ? err.message : 'Error agendando');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-slate-400 mr-2" />
        <span className="text-xs text-slate-500">Cargando disponibilidad...</span>
      </div>
    );
  }

  if (error && availableDates.length === 0) {
    return (
      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSchedule} className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Nombre */}
      <div>
        <label className="text-xs font-semibold text-slate-700">Nombre del cliente</label>
        <input
          type="text"
          value={inviteeName}
          onChange={(e) => setInviteeName(e.target.value)}
          placeholder="Ej: Juan Pérez"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-500"
          disabled={submitting}
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-xs font-semibold text-slate-700">Email</label>
        <input
          type="email"
          value={inviteeEmail}
          onChange={(e) => setInviteeEmail(e.target.value)}
          placeholder="cliente@example.com"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-500"
          disabled={submitting}
        />
      </div>

      {/* Teléfono */}
      <div>
        <label className="text-xs font-semibold text-slate-700">Teléfono</label>
        <input
          type="tel"
          value={inviteePhone}
          onChange={(e) => setInviteePhone(e.target.value)}
          placeholder="+52 1234567890"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-500"
          disabled={submitting}
        />
      </div>

      {/* Fecha */}
      <div>
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <Calendar size={14} /> Selecciona fecha
        </label>
        <select
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedTime('');
          }}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-500"
          disabled={submitting}
        >
          <option value="">-- Selecciona un día --</option>
          {availableDates.map((date) => {
            // Parse date correctly avoiding timezone issues
            const [year, month, day] = date.split('-');
            const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const label = d.toLocaleDateString('es-ES', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            });
            return (
              <option key={date} value={date}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Hora */}
      {selectedDate && (
        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Clock size={14} /> Selecciona hora
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-500"
            disabled={submitting}
          >
            <option value="">-- Selecciona una hora --</option>
            {availability[selectedDate]?.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Botón */}
      <button
        type="submit"
        disabled={submitting || !inviteeName || !inviteeEmail || !selectedDate || !selectedTime}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors"
      >
        {submitting ? 'Agendando...' : 'Confirmar Reunión'}
      </button>
    </form>
  );
}
