'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Info, Building2, FileText, Phone, Mail, MapPin, Plus } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import { getStageConfig } from '../config/stageConfig';
import DecisionMakersForm from './DecisionMakersForm';

// Herramientas
import CalendarTool from '../tools/CalendarTool';
import ContactChannelSelector from '../tools/ContactChannelSelector';

// Accionables
import CalendarizeAction from '../actions/CalendarizeAction';
import ContactAttemptAction from '../actions/ContactAttemptAction';
import Etapa2Actions from '../actions/Etapa2Actions';


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
    limite_pospuestas?: number;
    intentos_requeridos?: number;
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
  const [selectedPhone, setSelectedPhone] = useState<string | null>(lead?.phone || null);
  const [selectedPhoneName, setSelectedPhoneName] = useState<string>('Teléfono Principal');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(lead?.email || null);
  const [selectedEmailName, setSelectedEmailName] = useState<string>('Email Principal');
  const [contactOutcome, setContactOutcome] = useState<'no_contactado' | 'contacto_establecido' | 'reunion_agendada'>('no_contactado');

  // Estado de comentarios anteriores
  const [attemptNotes, setAttemptNotes] = useState<AttemptNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [currentAttempts, setCurrentAttempts] = useState(0);

  // Estado de contactos
  const [contacts, setContacts] = useState<any[]>([]);

  // Estado local de stage (se actualiza cuando el lead avanza)
  const [currentStage, setCurrentStage] = useState(stage);

  // Estado para agregar contactos generales
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactCargo, setNewContactCargo] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);

  // Estado para registrar llamadas/emails
  const [isRegisteringCall, setIsRegisteringCall] = useState(false);
  const [isRegisteringEmail, setIsRegisteringEmail] = useState(false);

  // Cargar notas anteriores y contactos
  useEffect(() => {
    if (isOpen && leadId) {
      loadAttemptNotes();
      loadContacts();
    }
  }, [isOpen, leadId]);

  const reloadLeadStage = async () => {
    try {
      const { data: updatedLead, error: leadError } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      if (updatedLead && updatedLead.status !== currentStage?.clave) {
        // El lead cambió de etapa, cargar la nueva etapa
        const { data: stageData, error: stageError } = await supabase
          .from('stages')
          .select('id, clave, titulo, orden, tipo')
          .eq('clave', updatedLead.status)
          .single();

        if (stageError) throw stageError;

        if (stageData) {
          setCurrentStage(stageData);
          // El modal se mantiene abierto, solo refrescar el contenido
        }
      }
    } catch (err) {
      console.error('Error reloading lead stage:', err);
    }
  };

  const loadAttemptNotes = async () => {
    setLoadingNotes(true);
    try {
      // Cargar notas históricas
      const { data, error: err } = await supabase
        .from('lead_attempt_notes')
        .select('id, stage_clave, stage_titulo, note_type, note_text, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAttemptNotes(data || []);

      // Cargar contador de intentos de la etapa actual desde leads
      const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .select('current_stage_attempts')
        .eq('id', leadId)
        .single();

      if (leadErr) throw leadErr;
      setCurrentAttempts(leadData?.current_stage_attempts || 0);
    } catch (err) {
      console.error('Error loading attempt notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error: err } = await supabase
        .from('lead_contacts')
        .select('id, nombre, telefono, email')
        .eq('lead_id', leadId);

      if (err) throw err;
      setContacts(data || []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  if (!isOpen || !lead || !currentStage) return null;

  const stageConfig = getStageConfig(currentStage.clave);

  // Títulos dinámicos según la etapa
  const stageTitles: Record<string, string> = {
    '101': 'Herramientas de la Etapa',
    '102': 'Datos de Contacto',
    '103': 'Herramientas de la Etapa',
    '104': 'Herramientas de la Etapa',
  };

  const toolsTitle = stageTitles[currentStage.clave] || 'Herramientas de la Etapa';

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

  const handleRegisterCall = async () => {
    if (!selectedPhone) {
      alert('Selecciona un teléfono para registrar la llamada');
      return;
    }

    setIsRegisteringCall(true);
    try {
      const now = new Date();
      const noteText = `${selectedPhoneName}\n${selectedPhone}\n${now.toLocaleString('es-ES')}`;

      const { error } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: currentStage.clave,
          stage_titulo: currentStage.titulo,
          attempt_number: 1,
          note_type: 'attempt',
          note_text: noteText,
        });

      if (error) throw error;
      loadAttemptNotes();
    } catch (err) {
      console.error('Error registering call:', err);
      alert('Error al registrar llamada');
    } finally {
      setIsRegisteringCall(false);
    }
  };

  const handleRegisterEmail = async () => {
    if (!selectedEmail) {
      alert('Selecciona un email para registrar');
      return;
    }

    setIsRegisteringEmail(true);
    try {
      const now = new Date();
      const noteText = `${selectedEmailName}\n${selectedEmail}\n${now.toLocaleString('es-ES')}`;

      const { error } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: currentStage.clave,
          stage_titulo: currentStage.titulo,
          attempt_number: 1,
          note_type: 'attempt',
          note_text: noteText,
        });

      if (error) throw error;
      loadAttemptNotes();
    } catch (err) {
      console.error('Error registering email:', err);
      alert('Error al registrar email');
    } finally {
      setIsRegisteringEmail(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (!newContactPhone.trim() && !newContactEmail.trim()) {
      alert('Agrega al menos un teléfono o email');
      return;
    }

    setIsAddingContact(true);
    try {
      const tipo = !newContactPhone.trim() && newContactEmail.trim() ? 'email' : 'telefono';
      const { error } = await supabase
        .from('lead_contacts')
        .insert({
          lead_id: leadId,
          nombre: newContactName.trim(),
          cargo: newContactCargo.trim() || null,
          telefono: newContactPhone.trim() || null,
          email: newContactEmail.trim() || null,
          tipo: tipo,
          source: 'manual',
          es_tomador_decision: false,
        });

      if (error) throw error;

      setNewContactName('');
      setNewContactCargo('');
      setNewContactPhone('');
      setNewContactEmail('');
      setShowAddContactModal(false);
    } catch (err) {
      console.error('Error adding contact:', err);
      alert('Error al agregar contacto');
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleSuccess = async (shouldClose = true) => {
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
              <h2 className="text-lg font-bold">{currentStage.titulo}</h2>
              <p className="text-xs text-slate-300 mt-1">
                Etapa {currentStage.orden} {currentStage.tipo && `- Tipo: ${currentStage.tipo.charAt(0).toUpperCase() + currentStage.tipo.slice(1)}`}
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  {toolsTitle}
                </h3>
                {stageConfig.tools.includes('contact-channel') && (
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Plus size={14} /> Agregar Contacto
                  </button>
                )}
              </div>

              {stageConfig.tools.includes('calendar') && (
                <CalendarTool value={selectedDate} onChange={setSelectedDate} />
              )}

              {stageConfig.tools.includes('contact-channel') && (
                <ContactChannelSelector
                  leadId={leadId}
                  selectedPhone={selectedPhone}
                  selectedEmail={selectedEmail}
                  onPhoneSelect={(phone, name) => {
                    setSelectedPhone(phone);
                    setSelectedPhoneName(name);
                  }}
                  onEmailSelect={(email, name) => {
                    setSelectedEmail(email);
                    setSelectedEmailName(name);
                  }}
                  phone={lead.phone}
                  email={lead.email}
                  onRegisterCall={handleRegisterCall}
                  onRegisterEmail={handleRegisterEmail}
                  isRegisteringCall={isRegisteringCall}
                  isRegisteringEmail={isRegisteringEmail}
                />
              )}


              {stageConfig.tools.length === 0 && (
                <p className="text-xs text-slate-400 italic">Sin herramientas para esta etapa</p>
              )}
            </div>

            {/* Comentarios de Actividad */}
            <div className="space-y-3 mt-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Comentarios de Actividad
                <span className="text-rose-600 ml-1">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe la actividad realizada... (mínimo 10 caracteres)"
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


            {/* Acciones */}
            <div className="space-y-3 mt-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Acciones:
              </label>

              {(!notes.trim() || notes.trim().length < 10) && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">Para continuar, deja tus comentarios de actividad en la sección anterior.</p>
                </div>
              )}

              {/* Progreso de Intentos (solo para Etapa 2) */}
              {currentStage.clave === '102' && currentStage.limite_pospuestas && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-700">
                    Intentos <span className="font-bold text-slate-900">{currentAttempts} de {currentStage.limite_pospuestas}</span>
                  </p>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    {(() => {
                      const progress = Math.min(
                        (currentAttempts / currentStage.limite_pospuestas) * 100,
                        100
                      );
                      let bgColor = 'bg-green-500';
                      if (progress > 75) bgColor = 'bg-red-500';
                      else if (progress > 50) bgColor = 'bg-orange-500';
                      else if (progress > 25) bgColor = 'bg-amber-500';

                      return (
                        <div
                          className={`h-full ${bgColor} transition-all duration-300`}
                          style={{ width: `${progress}%` }}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {stageConfig.actions === 'calendarize' && (
                <CalendarizeAction
                  leadId={leadId}
                  startDate={selectedDate}
                  notes={notes}
                  onSuccess={() => handleSuccess(true)}
                  isSubmitting={isSubmitting}
                />
              )}

              {stageConfig.actions === 'contact-attempt' && (
                <Etapa2Actions
                  leadId={leadId}
                  notes={notes}
                  minAttempts={currentStage.intentos_requeridos || 0}
                  maxAttempts={currentStage.limite_pospuestas || 0}
                  currentAttempts={currentAttempts}
                  stageTitle={currentStage.titulo}
                  stageNumber={String(currentStage.orden)}
                  stageClave={currentStage.clave}
                  nextStageClave={stageConfig.nextStageClave}
                  nextStageTitle={stageConfig.nextStageTitle}
                  onSuccess={handleSuccess}
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

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowAddContactModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-w-sm w-[90vw]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3 border-b border-slate-800 rounded-t-2xl">
              <Plus size={24} className="text-blue-400" />
              <h3 className="text-lg font-bold">Agregar Contacto</h3>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Nombre *"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                disabled={isAddingContact}
                autoFocus
              />
              <input
                type="text"
                placeholder="Cargo"
                value={newContactCargo}
                onChange={(e) => setNewContactCargo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                disabled={isAddingContact}
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                disabled={isAddingContact}
              />
              <input
                type="email"
                placeholder="Email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                disabled={isAddingContact}
              />

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  onClick={() => setShowAddContactModal(false)}
                  disabled={isAddingContact}
                  className="px-6 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={isAddingContact}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingContact && <Loader2 size={14} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
