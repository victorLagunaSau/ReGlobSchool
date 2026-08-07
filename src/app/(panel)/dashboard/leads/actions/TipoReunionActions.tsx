'use client';

import React, { useState } from 'react';
import { Trash2, RotateCcw, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/src/lib/supabase/client';
import DeleteAction from './DeleteAction';

interface TipoReunionActionsProps {
  leadId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  stageTitle?: string;
  stageNumber?: string;
  stageClave?: string;
  failStage?: {
    clave: string;
    titulo: string;
  };
  successStage?: {
    clave: string;
    titulo: string;
  };
  onSuccess?: (shouldClose?: boolean) => void;
  onCommentAdded?: () => void;
  onLeadUpdated?: () => void;
  currentAttempts?: number;
  minAttempts?: number;
  maxAttempts?: number;
}

export default function TipoReunionActions({
  leadId,
  notes,
  onNotesChange,
  stageTitle = 'Reunión de Demostración',
  stageNumber = '3',
  stageClave = '103',
  failStage,
  successStage,
  onSuccess,
  onCommentAdded,
  onLeadUpdated,
  currentAttempts = 0,
  minAttempts = 0,
  maxAttempts = 0,
}: TipoReunionActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingReagendar, setIsLoadingReagendar] = useState(false);
  const [isLoadingExito, setIsLoadingExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  };

  const hasNotes = notes.trim().length >= 10;
  const canDelete = hasNotes;

  const handleDeleteClick = () => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }
    setShowDeleteConfirm(!showDeleteConfirm);
  };

  const handleReagendar = async () => {
    if (!hasNotes) {
      alert('Requiere comentario de actividad');
      return;
    }

    if (!failStage) {
      alert('Configuración de etapa incompleta');
      return;
    }

    setIsLoadingReagendar(true);
    setError(null);

    try {
      const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);

      // 1. Guardar comentario automático PRIMERO
      const { error: autoNoteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${stageTitle} - Reagendada a ${failStage.titulo}\n\n${timestamp}`,
        });

      if (autoNoteError) throw autoNoteError;

      // 2. Guardar comentario del usuario DESPUÉS
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${notes.trim()}\n\n${timestamp}`,
        });

      if (noteError) throw noteError;

      // 3. Cambiar el lead a la etapa de falla
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: failStage.clave,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 4. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_regress',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Reagendar a ${failStage.titulo}`,
          message: `Lead regresó de ${stageTitle} a ${failStage.titulo}: ${notes.trim()}`,
          metadata: {
            from_stage: stageClave,
            to_stage: failStage.clave,
          },
        });

      if (interactionError) throw interactionError;

      // 5. Refrescar comentarios y lead
      onCommentAdded?.();
      onLeadUpdated?.();

      onSuccess?.(true);
    } catch (err: any) {
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoadingReagendar(false);
    }
  };

  const handleExito = async () => {
    if (!hasNotes) {
      alert('Requiere comentario de actividad');
      return;
    }

    if (!successStage) {
      alert('Configuración de etapa incompleta');
      return;
    }

    setIsLoadingExito(true);
    setError(null);

    try {
      const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);

      // 1. Guardar comentario automático PRIMERO
      const { error: autoNoteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${stageTitle} completada - Avanzar a ${successStage.titulo}\n\n${timestamp}`,
        });

      if (autoNoteError) throw autoNoteError;

      // 2. Guardar comentario del usuario DESPUÉS
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${notes.trim()}\n\n${timestamp}`,
        });

      if (noteError) throw noteError;

      // 3. Cambiar lead a siguiente etapa
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: successStage.clave,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 4. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_advance',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Avance a ${successStage.titulo}`,
          message: `Lead avanzó de ${stageTitle} a ${successStage.titulo}: ${notes.trim()}`,
          metadata: {
            from_stage: stageClave,
            to_stage: successStage.clave,
          },
        });

      if (interactionError) throw interactionError;

      // 5. Refrescar comentarios y lead
      onCommentAdded?.();
      onLeadUpdated?.();

      onSuccess?.(false);
    } catch (err: any) {
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoadingExito(false);
    }
  };

  return (
    <div className="space-y-4 mb-4">
      {/* COMENTARIOS DE ACTIVIDAD */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-green-900 uppercase tracking-wide">Comentarios de Actividad *</h3>

        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Describe lo que sucedió, observaciones, etc..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-green-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-slate-600">{notes.length}/500 caracteres</p>
          <p className={`text-[10px] font-bold ${notes.trim().length >= 10 ? 'text-green-600' : 'text-rose-600'}`}>
            {notes.trim().length >= 10 ? 'Listo' : 'Minimo 10 caracteres'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <div className="flex gap-2 w-full">
        {/* ELIMINAR - 33% (Izquierda) */}
        <button
          onClick={handleDeleteClick}
          disabled={!hasNotes}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            !hasNotes
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={!hasNotes ? 'Requiere comentario (mínimo 10 caracteres)' : ''}
        >
          <Trash2 size={18} />
          <span>Eliminar</span>
        </button>

        {/* REAGENDAR - 33% (Centro) */}
        <button
          onClick={handleReagendar}
          disabled={!hasNotes || isLoadingReagendar || isLoadingExito}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            !hasNotes
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title={!hasNotes ? 'Requiere comentario de actividad' : ''}
        >
          {isLoadingReagendar ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
          <span>Reagendar</span>
        </button>

        {/* ÉXITO - 33% (Derecha) */}
        <button
          onClick={handleExito}
          disabled={!hasNotes || isLoadingReagendar || isLoadingExito}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            !hasNotes
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title={!hasNotes ? 'Requiere comentario de actividad' : ''}
        >
          {isLoadingExito ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
          <span>Éxito</span>
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteAction
          leadId={leadId}
          stageTitle={stageTitle}
          stageNumber={stageNumber}
          stageClave={stageClave}
          notes={notes}
          currentAttempts={0}
          minAttempts={0}
          maxAttempts={maxAttempts}
          onSuccess={() => {
            setShowDeleteConfirm(false);
            onSuccess?.(true);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
