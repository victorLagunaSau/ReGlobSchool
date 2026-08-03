'use client';

import React, { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Calendar, User, Mail } from 'lucide-react';

interface ReunionStepsProps {
  eventScheduled: boolean;
  meetingDetails?: {
    title?: string;
    startTime?: string;
    endTime?: string;
    inviteeName?: string;
    inviteeEmail?: string;
    calendlyUri?: string;
  };
  calendlyComponent?: ReactNode;
}

export default function ReunionSteps({
  eventScheduled,
  meetingDetails,
  calendlyComponent,
}: ReunionStepsProps) {
  return (
    <div className="space-y-4">
      {/* PASO 1: AGENDAR REUNIÓN */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">1</div>
          <h4 className="text-sm font-bold text-slate-900">AGENDAR REUNIÓN</h4>
          {eventScheduled && <CheckCircle2 size={16} className="text-green-600 ml-auto" />}
        </div>
        {!eventScheduled && (
          <>
            <p className="text-xs text-slate-500 ml-8">Selecciona fecha, hora, nombre y email en el calendario</p>
          </>
        )}
        {eventScheduled && (
          <p className="text-xs text-green-600 ml-8 font-semibold">✓ Reunión agendada correctamente</p>
        )}

        {/* Calendario Calendly */}
        {calendlyComponent && (
          <div className="ml-8 mt-4">
            {calendlyComponent}
          </div>
        )}
      </div>

      {/* SEPARADOR */}
      {eventScheduled && <div className="h-px bg-slate-200" />}

      {/* PASO 2: VER REUNIÓN */}
      {!eventScheduled ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-400 font-bold text-xs">2</div>
            <h4 className="text-sm font-bold text-slate-500">VER REUNIÓN</h4>
          </div>
          <div className="flex items-start gap-2 ml-8 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Completa el Paso 1 para ver los detalles</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">2</div>
            <h4 className="text-sm font-bold text-slate-900">VER REUNIÓN</h4>
          </div>

          <div className="ml-8 space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900">Fecha y Hora</p>
                <p className="text-xs text-blue-700">
                  {meetingDetails?.startTime
                    ? new Date(meetingDetails.startTime).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900">Invitado</p>
                <p className="text-xs text-blue-700">{meetingDetails?.inviteeName || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900">Email</p>
                <p className="text-xs text-blue-700">{meetingDetails?.inviteeEmail || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
