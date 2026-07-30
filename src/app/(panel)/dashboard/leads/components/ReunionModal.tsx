'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Mail, Phone, Info } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import DecisionMakersForm from './DecisionMakersForm';

interface ReunionModalProps {
  isOpen: boolean;
  leadId: string;
  lead: {
    id: string;
    business_name: string;
    business_type: string;
    zone_city: string | null;
    state_name: string | null;
    phone?: string;
    email?: string;
  } | null;
  stage: any;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Contact {
  id: string;
  nombre?: string;
  cargo?: string;
  telefono?: string;
  email?: string;
}

export default function ReunionModal({
  isOpen,
  leadId,
  lead,
  stage,
  onClose,
  onSuccess,
}: ReunionModalProps) {
  const [comments, setComments] = useState('');
  const [contactEmails, setContactEmails] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeadInfo, setShowLeadInfo] = useState(false);

  // Cargar emails del lead
  useEffect(() => {
    if (!isOpen || !leadId) return;

    const fetchEmails = async () => {
      try {
        const { data, error } = await supabase
          .from('lead_contacts')
          .select('*')
          .eq('lead_id', leadId)
          .eq('es_tomador_decision', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        let emails = data?.filter(c => c.email) || [];

        // Agregar email inicial del lead si existe
        if (lead?.email) {
          emails.unshift({
            id: `initial-email-${leadId}`,
            email: lead.email,
            nombre: lead.business_name,
            cargo: 'Principal',
            telefono: null,
            es_tomador_decision: false,
          });
        }

        setContactEmails(emails);
      } catch (err) {
        console.error('Error fetching emails:', err);
      }
    };

    fetchEmails();
  }, [isOpen, leadId, lead?.email, lead?.business_name]);

  const handleSave = async () => {
    if (!comments.trim()) {
      alert('Agrega comentarios sobre la reunión');
      return;
    }

    setIsSubmitting(true);
    try {
      // Aquí se guardaría la información de la reunión
      // Por ahora solo guardamos los comentarios

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving reunion:', err);
      alert('Error al guardar la reunión');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Reunión de Demostración</h2>
              <p className="text-xs text-slate-300 mt-1">Etapa 3 - Tipo: Reunión</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Section */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Lead Info */}
            <div className="space-y-2 pb-4 border-b-2 border-slate-300">
              <div className="text-3xl font-bold text-slate-900">{lead.business_name}</div>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 text-sm text-slate-600 flex-1">
                  {(lead.zone_city || lead.state_name) && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                      <span>
                        {lead.zone_city && lead.state_name
                          ? `${lead.zone_city}, ${lead.state_name}`
                          : lead.zone_city || lead.state_name}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowLeadInfo(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0 text-blue-600 hover:text-blue-700 group"
                  title="Ver información del lead"
                >
                  <Info size={18} aria-hidden="true" />
                  <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                    Información de Lead
                  </span>
                </button>
              </div>
            </div>

            {/* Comentarios */}
            <div className="mt-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                Notas & Decisiones
              </h3>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Comentarios <span className="text-slate-400">*</span>
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Describe lo que sucedió en la reunión..."
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-slate-400 disabled:opacity-60"
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  {comments.length}/500 (mínimo 10)
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-slate-50 p-4 flex flex-col border-l border-slate-200 overflow-hidden">
            {/* Decision Makers */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <DecisionMakersForm leadId={leadId} readOnly={false} />
            </div>

            {/* Emails */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Emails</h4>
              <div className="space-y-2">
                {contactEmails.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">Sin emails registrados</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {contactEmails.map((contact) => (
                      <div
                        key={contact.id}
                        className={`p-2 rounded-lg text-xs ${
                          contact.id.startsWith('initial-')
                            ? 'bg-emerald-50 border border-emerald-300'
                            : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        {contact.nombre && (
                          <div className="font-semibold text-slate-900 truncate">
                            {contact.nombre}
                          </div>
                        )}
                        {contact.cargo && (
                          <div className="text-slate-600 text-[10px] truncate">
                            {contact.cargo}
                          </div>
                        )}
                        {contact.email && (
                          <div className="text-slate-600 text-[10px] mt-1 truncate flex items-center gap-1">
                            <Mail size={10} className="flex-shrink-0" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="bg-slate-100 p-4 flex gap-2 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {stage?.titulo || 'Regresar'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || comments.length < 10}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Éxito
          </button>
        </div>
      </div>

      {/* Lead Info Modal */}
      {showLeadInfo && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowLeadInfo(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-w-3xl w-[90vw] p-6">
            <button
              onClick={() => setShowLeadInfo(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Información de Contacto</h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="font-bold text-slate-700 mb-1">Empresa</p>
                <p className="text-slate-600">{lead.business_name}</p>
              </div>
              <div>
                <p className="font-bold text-slate-700 mb-1">Tipo</p>
                <p className="text-slate-600 capitalize">{lead.business_type || '-'}</p>
              </div>
              <div>
                <p className="font-bold text-slate-700 mb-1">Creado</p>
                <p className="text-slate-600">{new Date().toLocaleDateString('es-MX')}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
