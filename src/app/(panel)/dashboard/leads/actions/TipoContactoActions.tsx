'use client';

import React, { useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import RetryAction from './RetryAction';
import ContinueAction from './ContinueAction';
import DeleteAction from './DeleteAction';

interface TipoContactoActionsProps {
  leadId: string;
  notes: string;
  onNotesChange?: (notes: string) => void;
  minAttempts?: number;
  maxAttempts?: number;
  currentAttempts?: number;
  stageTitle?: string;
  stageNumber?: string;
  stageClave?: string;
  nextStageClave?: string;
  nextStageTitle?: string;
  onSuccess?: (shouldClose?: boolean) => void;
  onCommentAdded?: () => void;
  onLeadUpdated?: () => void;
}

export default function TipoContactoActions({
  leadId,
  notes,
  onNotesChange,
  minAttempts = 0,
  maxAttempts = 0,
  currentAttempts = 0,
  stageTitle = 'Etapa 2 - Contacto Inicial',
  stageNumber = '2',
  stageClave = '102',
  nextStageClave = '103',
  nextStageTitle = 'Reunión de Demostración',
  onSuccess,
  onCommentAdded,
  onLeadUpdated,
}: TipoContactoActionsProps) {
  const [showRetryOptions, setShowRetryOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasNotes = notes.trim().length >= 10;
  const canDelete = currentAttempts >= minAttempts;
  const canRetry = true; // Reintentar siempre disponible
  const hasReachedMaxAttempts = currentAttempts >= maxAttempts;

  const handleDeleteClick = () => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }
    setShowDeleteConfirm(!showDeleteConfirm);
  };

  const handleRetryClick = () => {
    if (!hasNotes) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }
    setShowRetryOptions(!showRetryOptions);
  };

  return (
    <div className="space-y-4 mb-4">
      {/* Comentarios de Actividad */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-green-900 uppercase tracking-wide">Comentarios de Actividad *</h3>

        <textarea
          value={notes}
          onChange={(e) => onNotesChange?.(e.target.value)}
          placeholder="Describe lo que sucedió, observaciones, etc..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-green-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-slate-600">{notes.length}/500 caracteres</p>
          <p className={`text-[10px] font-bold ${notes.trim().length >= 10 ? 'text-green-600' : 'text-rose-600'}`}>
            {notes.trim().length >= 10 ? 'Listo' : 'Mínimo 10 caracteres'}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 w-full">
        {/* ELIMINAR - 33% */}
        <button
          onClick={handleDeleteClick}
          disabled={(!canDelete || !hasNotes) || showRetryOptions}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            ((!canDelete || !hasNotes) || showRetryOptions)
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={!canDelete ? `Requiere ${minAttempts} intentos mínimos` : !hasNotes ? 'Requiere comentario (mínimo 10 caracteres)' : showRetryOptions ? 'Cancela Reintentar primero' : ''}
        >
          <Trash2 size={18} />
          <span>Eliminar</span>
        </button>

        {/* REINTENTAR - 33% */}
        <button
          onClick={handleRetryClick}
          disabled={!hasNotes || showDeleteConfirm}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            (!hasNotes || showDeleteConfirm)
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
          title={showDeleteConfirm ? 'Cancela Eliminar primero' : hasReachedMaxAttempts ? `Has alcanzado el máximo de intentos (${maxAttempts})` : ''}
        >
          <RotateCcw size={18} />
          <span>Reintentar</span>
        </button>

        {/* CONTINUAR - 33% */}
        <ContinueAction
          leadId={leadId}
          stageTitle={stageTitle}
          stageNumber={stageNumber}
          stageClave={stageClave}
          nextStageClave={nextStageClave}
          nextStageTitle={nextStageTitle}
          notes={notes}
          onSuccess={(shouldClose) => {
            onSuccess?.(shouldClose);
          }}
          onCommentAdded={onCommentAdded}
          onLeadUpdated={onLeadUpdated}
          compact={true}
          currentAttempts={currentAttempts}
          minAttempts={minAttempts}
          maxAttempts={maxAttempts}
          isDisabled={showDeleteConfirm || showRetryOptions}
        />
      </div>

      {/* Retry Options */}
      {showRetryOptions && (
        <RetryAction
          leadId={leadId}
          stageTitle={stageTitle}
          stageNumber={stageNumber}
          stageClave={stageClave}
          notes={notes}
          currentAttempts={currentAttempts}
          minAttempts={minAttempts}
          maxAttempts={maxAttempts}
          onSuccess={() => {
            setShowRetryOptions(false);
            onSuccess?.(true);
          }}
          onCancel={() => {
            setShowRetryOptions(false);
          }}
          onCommentAdded={onCommentAdded}
          onLeadUpdated={onLeadUpdated}
        />
      )}

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
          onLeadUpdated={onLeadUpdated}
        />
      )}
    </div>
  );
}
