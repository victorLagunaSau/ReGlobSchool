'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Calendar, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/src/lib/supabase/client';

interface GoogleCalendarSchedulerProps {
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

export default function GoogleCalendarScheduler({
  leadId,
  stageId,
  stageTitulo,
  lead,
  onEventScheduled,
  onError,
}: GoogleCalendarSchedulerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  // Estado de reunión anterior
  const [existingMeeting, setExistingMeeting] = useState<any>(null);
  const [meetingIsFuture, setMeetingIsFuture] = useState(false);
  const [shouldShowForm, setShouldShowForm] = useState(true);

  // Step control: 1=Fecha, 2=Hora, 3=Datos
  const [step, setStep] = useState(1);

  // Form state
  const [inviteeName, setInviteeName] = useState(lead?.business_name || '');
  const [inviteeEmail, setInviteeEmail] = useState(lead?.email || '');
  const [inviteePhone, setInviteePhone] = useState(lead?.phone || '');

  // Availability
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Cargar reunión anterior y disponibilidad
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Cargar reunión con fecha/hora más futura para este lead en esta etapa
        const { data: meetings, error: meetingsErr } = await supabase
          .from('lead_meetings')
          .select('*')
          .eq('lead_id', leadId)
          .eq('stage_id', stageId)
          .order('start_time', { ascending: false })
          .limit(1);

        if (!meetingsErr && meetings && meetings.length > 0) {
          const meeting = meetings[0];
          setExistingMeeting(meeting);

          // Verificar si es futuro o pasado
          const startTime = new Date(meeting.start_time);
          const isFuture = startTime > new Date();
          setMeetingIsFuture(isFuture);
          setShouldShowForm(!isFuture); // Mostrar si es pasado, ocultar si es futuro
        }

        // SIEMPRE llenar con datos del lead (no de reunión anterior)
        if (lead) {
          setInviteeName(lead.business_name || '');
          setInviteeEmail(lead.email || '');
          setInviteePhone(lead.phone || '');
        }

        // 2. Cargar disponibilidad solo si debe mostrar el formulario
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          setError('No hay sesión activa');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/google-calendar/availability?days=21', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any = {};
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            // ignore
          }
          setError(`No se pudo cargar la disponibilidad: ${errorData.error || errorText || 'Error desconocido'}`);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAvailability(data.availability || {});
        setAvailableDates(Object.keys(data.availability || {}).sort());
        setLoading(false);
      } catch (err) {
        console.error('🔥 Error loading data:', err);
        setError(`Error cargando datos: ${err instanceof Error ? err.message : 'Unknown'}`);
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, stageId]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteeName || !inviteeEmail || !selectedDate || !selectedTime) {
      setError('Completa todos los campos');
      return;
    }

    setSubmitting(true);

    try {
      console.log('📅 Agendando reunión en Google Calendar...');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }

      console.log('✅ Token obtenido:', token.substring(0, 20) + '...');

      const startTime = `${selectedDate}T${selectedTime}:00`;

      const createEventResponse = await fetch('/api/google-calendar/create-event', {
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

      // Marcar como agendado exitosamente
      setScheduled(true);
      setSubmitting(false);

      // Llamar callback para indicar éxito
      onEventScheduled({
        event_type: 'Meeting',
        start_time: startTime,
        invitee_name: inviteeName,
        invitee_email: inviteeEmail,
        google_event_link: eventResult.googleEventLink,
      });

      // Abrir Google Calendar si hay link
      if (eventResult.googleEventLink) {
        setTimeout(() => {
          window.open(eventResult.googleEventLink, '_blank', 'width=800,height=600');
        }, 500);
      }

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

  // Mostrar mensaje si reunión existe en futuro
  if (!shouldShowForm && existingMeeting && meetingIsFuture) {
    const startTime = new Date(existingMeeting.start_time);
    const dateStr = startTime.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-700">Ya existe una reunión agendada</p>
          <p className="text-xs text-amber-600 mt-1">{dateStr}</p>
          <button
            type="button"
            className="text-xs text-amber-700 hover:text-amber-900 font-semibold mt-2 underline"
            onClick={() => {
              setShouldShowForm(true);
              setScheduled(false);
            }}
          >
            Reagendar
          </button>
        </div>
      </div>
    );
  }

  if (error && availableDates.length === 0 && !shouldShowForm) {
    return (
      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700">{error}</p>
      </div>
    );
  }

  if (!shouldShowForm && !scheduled) {
    return null;
  }

  // Renderizar interfaz estilo Calendly
  return (
    <div className={`space-y-4 p-4 rounded-lg transition-colors ${
      scheduled ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'
    }`}>
      {/* Mensaje de éxito */}
      {scheduled && (
        <div className="flex items-start gap-2 p-3 bg-emerald-100 border border-emerald-300 rounded-lg">
          <span className="text-sm font-bold text-emerald-700">✓ Reunión agendada correctamente</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {!scheduled ? (
        <form onSubmit={handleSchedule} className="space-y-4">
          {/* PASO 1: SELECCIONAR FECHA */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Selecciona una fecha</h3>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {availableDates.map((date) => {
                  const [year, month, day] = date.split('-');
                  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const isSelected = selectedDate === date;

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime('');
                        setStep(2);
                      }}
                      className={`p-3 rounded-lg border-2 transition-colors text-center ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{dayName}</div>
                      <div className="text-sm font-bold">{dayNum}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIONAR HORA */}
          {step === 2 && selectedDate && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                ← Cambiar fecha
              </button>
              <h3 className="text-sm font-bold text-slate-900">Selecciona una hora</h3>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {availability[selectedDate]?.map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setSelectedTime(time);
                        setStep(3);
                      }}
                      className={`p-3 rounded-lg border-2 transition-colors text-center ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-sm font-bold">{time}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 3: DATOS */}
          {step === 3 && selectedDate && selectedTime && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                ← Cambiar hora
              </button>
              <h3 className="text-sm font-bold text-slate-900">Tus datos</h3>

              <div>
                <label className="text-xs font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-500"
                  disabled={submitting}
                />
              </div>

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

              <button
                type="submit"
                disabled={submitting || !inviteeName || !inviteeEmail}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Confirmar reunión</>}
              </button>
            </div>
          )}

          {/* Progress indicator */}
          {!scheduled && (
            <div className="flex gap-1 justify-center pt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step >= s ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-900">{selectedDate} - {selectedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-emerald-700">{inviteeName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
