'use client';

import React, { useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import RetryAction from './RetryAction';
import ContinueAction from './ContinueAction';
import DeleteAction from './DeleteAction';

interface Etapa2ActionsProps {
  leadId: string;
  notes: string;
  minAttempts?: number;
  maxAttempts?: number;
  currentAttempts?: number;
  stageTitle?: string;
  stageNumber?: string;
  stageClave?: string;
  nextStageClave?: string;
  nextStageTitle?: string;
  onSuccess?: (shouldClose?: boolean) => void;
}

export default function Etapa2Actions({
  leadId,
  notes,
  minAttempts = 0,
  maxAttempts = 0,
  currentAttempts = 0,
  stageTitle = 'Etapa 2 - Contacto Inicial',
  stageNumber = '2',
  stageClave = '102',
  nextStageClave = '103',
  nextStageTitle = 'Reunión de Demostración',
  onSuccess,
}: Etapa2ActionsProps) {
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
    <div className="space-y-3 mb-4">
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
        />
      )}
    </div>
  );
}
