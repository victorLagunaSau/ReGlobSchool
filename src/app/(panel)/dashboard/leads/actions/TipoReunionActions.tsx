'use client';

import React, { useState } from 'react';
import { Trash2, RotateCcw, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/src/lib/supabase/client';
import DeleteAction from './DeleteAction';

interface TipoReunionActionsProps {
  leadId: string;
  notes: string;
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
  currentAttempts?: number;
  minAttempts?: number;
  maxAttempts?: number;
}

export default function TipoReunionActions({
  leadId,
  notes,
  stageTitle = 'Reunión de Demostración',
  stageNumber = '3',
  stageClave = '103',
  failStage,
  successStage,
  onSuccess,
  currentAttempts = 0,
  minAttempts = 0,
  maxAttempts = 0,
}: TipoReunionActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingReagendar, setIsLoadingReagendar] = useState(false);
  const [isLoadingExito, setIsLoadingExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNotes = notes.trim().length >= 10;
  const canDelete = currentAttempts >= minAttempts && minAttempts > 0;

  const handleDeleteClick = () => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }
    if (!canDelete) {
      alert(`Requiere ${minAttempts} intentos mínimos`);
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
      const now = new Date();
      const autoCompletedNotes = `${notes}\n\n${stageTitle} (Etapa ${stageNumber})\nReagendar → ${failStage.titulo}\nFecha: ${now.toLocaleDateString('es-ES')}`;

      // 1. Guardar nota
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'retry',
          note_text: autoCompletedNotes,
        });

      if (noteError) throw noteError;

      // 2. Cambiar el lead a la etapa de falla
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: failStage.clave,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 3. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_regress',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Reagendar a ${failStage.titulo}`,
          message: `Lead regresó de ${stageTitle} a ${failStage.titulo}`,
          metadata: {
            from_stage: stageClave,
            to_stage: failStage.clave,
          },
        });

      if (interactionError) throw interactionError;

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
      const now = new Date();
      const autoCompletedNotes = `${notes}\n\n${stageTitle} (Etapa ${stageNumber})\nAvanzar a: ${successStage.titulo}\nFecha: ${now.toLocaleDateString('es-ES')}`;

      // 1. Guardar nota
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: autoCompletedNotes,
        });

      if (noteError) throw noteError;

      // 2. Cambiar lead a siguiente etapa
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: successStage.clave,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 3. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_advance',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Avance a ${successStage.titulo}`,
          message: `Lead avanzó de ${stageTitle} a ${successStage.titulo}`,
          metadata: {
            from_stage: stageClave,
            to_stage: successStage.clave,
          },
        });

      if (interactionError) throw interactionError;

      onSuccess?.(false);
    } catch (err: any) {
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoadingExito(false);
    }
  };

  return (
    <div className="space-y-3 mb-4">
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
          disabled={(!canDelete || !hasNotes)}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            ((!canDelete || !hasNotes))
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={!canDelete ? `Requiere ${minAttempts} intentos mínimos` : !hasNotes ? 'Requiere comentario (mínimo 10 caracteres)' : ''}
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
          currentAttempts={currentAttempts}
          minAttempts={minAttempts}
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
