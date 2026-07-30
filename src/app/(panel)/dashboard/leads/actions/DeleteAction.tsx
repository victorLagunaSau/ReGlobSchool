'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface DeleteActionProps {
  leadId: string;
  stageTitle: string;
  stageNumber: string;
  stageClave: string;
  notes: string;
  currentAttempts: number;
  minAttempts: number;
  maxAttempts: number;
  onSuccess: () => void;
}

export default function DeleteAction({
  leadId,
  stageTitle,
  stageNumber,
  stageClave,
  notes,
  currentAttempts,
  minAttempts,
  maxAttempts,
  onSuccess,
}: DeleteActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNotes = notes.trim().length >= 10;
  const canDelete = currentAttempts >= minAttempts && minAttempts > 0;

  const handleDelete = async () => {
    if (!hasNotes) {
      setError('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    if (!canDelete) {
      setError('No se puede eliminar el lead en este momento');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('es-ES');

      // 1. Obtener usuario actual
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('No authenticated user');

      // 2. Auto-completar nota de eliminación
      const autoCompletedNotes = `${notes}\n\n${stageTitle} (Etapa ${stageNumber})\nEliminar Lead\nFecha: ${dateStr}\nHora: ${timeStr}\nIntentos: ${currentAttempts} de ${minAttempts}`;

      // 3. Copiar lead a tabla de eliminados
      const { data: leadData, error: leadFetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadFetchError) throw leadFetchError;

      if (leadData) {
        const { error: deleteLeadError } = await supabase
          .from('deleted_leads')
          .insert({
            original_lead_id: leadData.id,
            business_name: leadData.business_name,
            business_type: leadData.business_type,
            phone: leadData.phone,
            email: leadData.email,
            address: leadData.address,
            website: leadData.website,
            country_id: leadData.country_id,
            status: leadData.status,
            source: leadData.source,
            deletion_reason: 'Límite de intentos alcanzado',
            deletion_note: autoCompletedNotes,
            deleted_by: userId,
            original_created_at: leadData.created_at,
            metadata: JSON.stringify(leadData),
          });

        if (deleteLeadError) throw deleteLeadError;
      }

      // 4. Copiar contactos a tabla de eliminados
      const { data: contactsData, error: contactsFetchError } = await supabase
        .from('lead_contacts')
        .select('*')
        .eq('lead_id', leadId);

      if (contactsFetchError) throw contactsFetchError;

      if (contactsData && contactsData.length > 0) {
        const contactsToArchive = contactsData.map((contact: any) => ({
          original_contact_id: contact.id,
          lead_id: contact.lead_id,
          nombre: contact.nombre,
          cargo: contact.cargo,
          telefono: contact.telefono,
          email: contact.email,
          es_tomador_decision: contact.es_tomador_decision,
          created_by: contact.created_by,
        }));

        const { error: deleteContactsError } = await supabase
          .from('deleted_lead_contacts')
          .insert(contactsToArchive);

        if (deleteContactsError) throw deleteContactsError;
      }

      // 5. Copiar notas a tabla de eliminados
      const { data: notesData, error: notesFetchError } = await supabase
        .from('lead_attempt_notes')
        .select('*')
        .eq('lead_id', leadId);

      if (notesFetchError) throw notesFetchError;

      if (notesData && notesData.length > 0) {
        const notesToArchive = notesData.map((note: any) => ({
          original_note_id: note.id,
          lead_id: note.lead_id,
          stage_clave: note.stage_clave,
          stage_titulo: note.stage_titulo,
          attempt_number: note.attempt_number,
          note_type: note.note_type,
          note_text: note.note_text,
        }));

        const { error: deleteNotesError } = await supabase
          .from('deleted_lead_attempt_notes')
          .insert(notesToArchive);

        if (deleteNotesError) throw deleteNotesError;
      }

      // 6. Eliminar del original: contactos primero (foreign key)
      const { error: deleteContactsDbError } = await supabase
        .from('lead_contacts')
        .delete()
        .eq('lead_id', leadId);

      if (deleteContactsDbError) throw deleteContactsDbError;

      // 7. Eliminar notas
      const { error: deleteNotesDbError } = await supabase
        .from('lead_attempt_notes')
        .delete()
        .eq('lead_id', leadId);

      if (deleteNotesDbError) throw deleteNotesDbError;

      // 8. Eliminar lead
      const { error: deleteLeadDbError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (deleteLeadDbError) throw deleteLeadDbError;

      onSuccess();
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg mb-3">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={isLoading || !canDelete || !hasNotes}
        className={`w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
          !canDelete
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
        title={!canDelete ? 'No se puede eliminar. Requiere alcanzar el límite de intentos.' : ''}
      >
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        Confirmar Eliminación
      </button>
    </>
  );
}
