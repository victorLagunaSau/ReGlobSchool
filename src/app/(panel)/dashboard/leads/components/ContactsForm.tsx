'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2, Phone, Mail } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface Contact {
  id?: string;
  nombre: string;
  cargo?: string;
  telefono?: string;
  email?: string;
}

interface ContactsFormProps {
  leadId: string;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export default function ContactsForm({
  leadId,
  readOnly = false,
  onUpdate,
}: ContactsFormProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newContact, setNewContact] = useState<Contact>({
    nombre: '',
    cargo: '',
    telefono: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch contacts where es_tomador_decision = false
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lead_contacts')
          .select('*')
          .eq('lead_id', leadId)
          .eq('es_tomador_decision', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) fetchContacts();
  }, [leadId]);

  const handleAddContact = async () => {
    if (!newContact.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setIsSaving(true);
    try {
      let tipo = 'telefono';
      if (!newContact.telefono?.trim() && newContact.email?.trim()) {
        tipo = 'email';
      }

      const { data, error } = await supabase
        .from('lead_contacts')
        .insert({
          lead_id: leadId,
          nombre: newContact.nombre.trim(),
          cargo: newContact.cargo?.trim() || '',
          telefono: newContact.telefono?.trim() || null,
          email: newContact.email?.trim() || null,
          tipo: tipo,
          source: 'manual',
          es_tomador_decision: false,
        })
        .select()
        .single();

      if (error) throw error;

      setContacts([data, ...contacts]);
      setNewContact({ nombre: '', cargo: '', telefono: '', email: '' });
      setIsAddingNew(false);
      onUpdate?.();
    } catch (err) {
      console.error('Error adding contact:', err);
      alert('Error al agregar contacto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContacts(contacts.filter((c) => c.id !== id));
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting contact:', err);
      alert('Error al eliminar');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-end">
        {!readOnly && (
          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <Plus size={14} /> Agregar
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAddingNew && !readOnly && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <input
            type="text"
            placeholder="Nombre *"
            value={newContact.nombre}
            onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <input
            type="text"
            placeholder="Cargo"
            value={newContact.cargo}
            onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <input
            type="tel"
            placeholder="Teléfono"
            value={newContact.telefono}
            onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <input
            type="email"
            placeholder="Email"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddContact}
              disabled={isSaving}
              className="flex-1 px-2 py-1.5 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isSaving && <Loader2 size={12} className="animate-spin" />}
              Guardar
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              disabled={isSaving}
              className="flex-1 px-2 py-1.5 border border-slate-200 text-xs font-bold rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-500">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span className="text-xs">Cargando...</span>
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Sin contactos registrados</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{contact.nombre}</p>
                  {contact.cargo && <p className="text-[10px] text-slate-600">{contact.cargo}</p>}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => contact.id && handleDeleteContact(contact.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {contact.telefono && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <Phone size={12} className="text-slate-400" />
                    <span>{contact.telefono}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <Mail size={12} className="text-slate-400" />
                    <span>{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
