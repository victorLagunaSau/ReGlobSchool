'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface Contact {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
}

interface ContactChannelSelectorProps {
  leadId: string;
  selectedPhone: string | null;
  selectedEmail: string | null;
  onPhoneSelect: (phone: string, name: string) => void;
  onEmailSelect: (email: string, name: string) => void;
  phone?: string | null;
  email?: string | null;
  onRegisterCall?: () => void;
  onRegisterEmail?: () => void;
  isRegisteringCall?: boolean;
  isRegisteringEmail?: boolean;
  refreshKey?: number;
}

export default function ContactChannelSelector({
  leadId,
  selectedPhone,
  selectedEmail,
  onPhoneSelect,
  onEmailSelect,
  phone,
  email,
  onRegisterCall,
  onRegisterEmail,
  isRegisteringCall,
  isRegisteringEmail,
  refreshKey,
}: ContactChannelSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_contacts')
        .select('id, nombre, telefono, email')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchContacts();
  }, [leadId, refreshKey]);

  // Filtrar teléfonos y emails
  const phones = [
    ...(phone ? [{ nombre: 'Teléfono Principal', telefono: phone }] : []),
    ...contacts.filter((c) => c.telefono).map((c) => ({ nombre: c.nombre, telefono: c.telefono })),
  ];

  const emails = [
    ...(email ? [{ nombre: 'Email Principal', email: email }] : []),
    ...contacts.filter((c) => c.email).map((c) => ({ nombre: c.nombre, email: c.email })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-slate-400 mr-2" />
        <span className="text-xs text-slate-400">Cargando contactos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* LLAMADAS */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Llamadas
        </label>
        {phones.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {phones.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onPhoneSelect(p.telefono!, p.nombre)}
                className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-start gap-1 text-left min-h-[80px] ${
                  selectedPhone === p.telefono
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <Phone
                  size={14}
                  className={`flex-shrink-0 ${
                    selectedPhone === p.telefono ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs font-semibold text-slate-900 truncate">{p.nombre}</p>
                  <p className="text-[10px] text-slate-600 truncate">{p.telefono}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Sin teléfonos disponibles</p>
        )}
      </div>

      {/* Registrar Llamada */}
      {onRegisterCall && (
        <button
          onClick={onRegisterCall}
          disabled={!selectedPhone || isRegisteringCall}
          className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {isRegisteringCall && <Loader2 size={12} className="animate-spin" />}
          Registrar Llamada
        </button>
      )}

      {/* EMAILS */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Emails
        </label>
        {emails.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {emails.map((e, idx) => (
              <button
                key={idx}
                onClick={() => onEmailSelect(e.email!, e.nombre)}
                className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-start gap-1 text-left min-h-[80px] ${
                  selectedEmail === e.email
                    ? 'border-green-600 bg-green-50'
                    : 'border-slate-200 hover:border-green-300'
                }`}
              >
                <Mail
                  size={14}
                  className={`flex-shrink-0 ${
                    selectedEmail === e.email ? 'text-green-600' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs font-semibold text-slate-900 truncate">{e.nombre}</p>
                  <p className="text-[10px] text-slate-600 truncate">{e.email}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Sin emails disponibles</p>
        )}
      </div>

      {/* Registrar Email */}
      {onRegisterEmail && (
        <button
          onClick={onRegisterEmail}
          disabled={!selectedEmail || isRegisteringEmail}
          className="w-full px-3 py-2 border border-green-300 bg-green-50 text-xs font-bold text-green-700 hover:bg-green-100 transition-colors rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {isRegisteringEmail && <Loader2 size={12} className="animate-spin" />}
          Registrar Email
        </button>
      )}
    </div>
  );
}
