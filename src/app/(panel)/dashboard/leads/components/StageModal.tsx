'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Info, Building2, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import { getStageConfig } from '../config/stageConfig';
import DecisionMakersForm from './DecisionMakersForm';

// Herramientas
import CalendarTool from '../tools/CalendarTool';

// Accionables
import CalendarizeAction from '../actions/CalendarizeAction';

interface AttemptNote {
  id: string;
  stage_clave: string;
  stage_titulo: string;
  note_type: string;
  note_text: string;
  created_at: string;
}

interface StageModalProps {
  isOpen: boolean;
  leadId: string;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    phone?: string;
    email?: string;
    zone_city?: string;
    state_name?: string;
    country_name?: string;
    created_at?: string;
  } | null;
  stage: {
    id: string;
    clave: string;
    titulo: string;
    orden?: number;
    tipo?: string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StageModal({
  isOpen,
  leadId,
  lead,
  stage,
  onClose,
  onSuccess,
}: StageModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeadInfo, setShowLeadInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado de herramientas
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Estado de comentarios anteriores
  const [attemptNotes, setAttemptNotes] = useState<AttemptNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Cargar notas anteriores
  useEffect(() => {
    if (isOpen && leadId) {
      loadAttemptNotes();
    }
  }, [isOpen, leadId]);

  const loadAttemptNotes = async () => {
    setLoadingNotes(true);
    try {
      const { data, error: err } = await supabase
        .from('lead_attempt_notes')
        .select('id, stage_clave, stage_titulo, note_type, note_text, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAttemptNotes(data || []);
    } catch (err) {
      console.error('Error loading attempt notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  if (!isOpen || !lead || !stage) return null;

  const stageConfig = getStageConfig(stage.clave);

  if (!stageConfig) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Error</h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Configuración no encontrada para la etapa: {stage.clave}
          </p>
        </div>
      </div>
    );
  }

  const handleSuccess = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al procesar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{stage.titulo}</h2>
              <p className="text-xs text-slate-300 mt-1">
                Etapa {stage.orden} {stage.tipo && `- Tipo: ${stage.tipo.charAt(0).toUpperCase() + stage.tipo.slice(1)}`}
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
          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-slate-200">
            {/* Lead Info */}
            <div className="space-y-2 pb-4 border-b-2 border-slate-300">
              <div className="text-3xl font-bold text-slate-900">{lead.business_name}</div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600 flex-1">
                  {lead.zone_city && lead.state_name
                    ? `${lead.zone_city}, ${lead.state_name}`
                    : lead.zone_city || lead.state_name}
                </div>
                <button
                  onClick={() => setShowLeadInfo(!showLeadInfo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0 text-blue-600 hover:text-blue-700 group"
                  title="Ver información del lead"
                >
                  <Info size={18} />
                  <span className="text-xs font-semibold">Información de Lead</span>
                </button>
              </div>
            </div>

            {/* Herramientas Dinámicas */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Herramientas de la Etapa
              </h3>

              {stageConfig.tools.includes('calendar') && (
                <CalendarTool value={selectedDate} onChange={setSelectedDate} />
              )}

              {stageConfig.tools.length === 0 && (
                <p className="text-xs text-slate-400 italic">Sin herramientas para esta etapa</p>
              )}
            </div>

            {/* Notas & Decisiones */}
            <div className="space-y-3 border-t pt-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Notas & Decisiones
                <span className="text-rose-600 ml-1">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe lo que sucedió... (mínimo 10 caracteres)"
                maxLength={500}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg text-xs resize-none focus:outline-slate-400 transition-colors ${
                  notes.length > 0 && notes.length < 10
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-300'
                }`}
              />
              <div className="flex items-center justify-between">
                <p
                  className={`text-[10px] ${
                    notes.length < 10 && notes.length > 0
                      ? 'text-rose-600 font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  {notes.length}/500
                  {notes.length < 10 && notes.length > 0 && (
                    <span className="ml-1">({10 - notes.length} caracteres mínimos)</span>
                  )}
                </p>
                {notes.length > 0 && notes.length < 10 && (
                  <span className="text-[9px] text-rose-600 font-semibold">⚠ Mínimo 10 caracteres</span>
                )}
              </div>
            </div>

            {/* Accionables */}
            <div className="space-y-3 border-t pt-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Accionables de la Etapa
              </label>

              {stageConfig.actions === 'calendarize' && (
                <CalendarizeAction
                  leadId={leadId}
                  startDate={selectedDate}
                  notes={notes}
                  onSuccess={handleSuccess}
                  isSubmitting={isSubmitting}
                />
              )}

              {!stageConfig.actions && (
                <p className="text-xs text-slate-400 italic">Sin accionables para esta etapa</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Right Panel - Fixed Content */}
          <div className="w-80 bg-slate-50 p-4 flex flex-col border-l border-slate-200 overflow-hidden">
            {/* Decision Makers */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                Tomadores de Decisiones
              </h3>
              {leadId && <DecisionMakersForm leadId={leadId} readOnly={false} />}
            </div>

            {/* Comentarios Anteriores */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 sticky top-0 bg-slate-50 pb-2">
                Comentarios Anteriores
              </h3>
              {loadingNotes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
              ) : attemptNotes.length > 0 ? (
                <div className="space-y-3">
                  {attemptNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-700">{note.stage_titulo}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {new Date(note.created_at).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                          note.note_type === 'attempt'
                            ? 'bg-amber-100 text-amber-700'
                            : note.note_type === 'success'
                            ? 'bg-green-100 text-green-700'
                            : note.note_type === 'retry'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {note.note_type}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-600 leading-relaxed">{note.note_text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Sin historial</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lead Info Popover */}
      {showLeadInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowLeadInfo(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-w-2xl w-[90vw] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3 border-b border-slate-800">
              <Building2 size={24} className="text-blue-400" />
              <h3 className="text-lg font-bold">Información de Lead</h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex-1">
              {/* Title */}
              <h4 className="text-xl font-bold text-slate-900 mb-6">{lead.business_name}</h4>

              {/* Tipo */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                <FileText size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tipo de Negocio</p>
                  <p className="text-sm text-slate-900 capitalize mt-1 font-semibold">{lead.business_type}</p>
                </div>
              </div>

              {/* Ubicación */}
              {(lead.zone_city || lead.state_name) && (
                <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                  <MapPin size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ubicación</p>
                    <p className="text-sm text-slate-900 mt-1 font-semibold">
                      {lead.zone_city && lead.state_name
                        ? `${lead.zone_city}, ${lead.state_name}`
                        : lead.zone_city || lead.state_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Teléfono */}
              {lead.phone && (
                <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                  <Phone size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Teléfono</p>
                    <p className="text-sm text-slate-900 mt-1 font-semibold">{lead.phone}</p>
                  </div>
                </div>
              )}

              {/* Email */}
              {lead.email && (
                <div className="flex items-start gap-4">
                  <Mail size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email</p>
                    <p className="text-sm text-slate-900 mt-1 font-semibold break-all">{lead.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setShowLeadInfo(false)}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
