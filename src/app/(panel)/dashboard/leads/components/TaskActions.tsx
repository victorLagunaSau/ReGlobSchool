'use client';

import React, { useState } from 'react';
import { Check, X, HelpCircle, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { resolveTaskResult, resolveTaskWithPipeline, type ResolvableTask, type TaskResult } from '../../../../../lib/task-automation';
import ModalStageSelection from './ModalStageSelection';
import ModalOutcomeOptions from './ModalOutcomeOptions';
import ModalPostpone from './ModalPostpone';
import ModalDiscard from './ModalDiscard';
import ModalReason from './ModalReason';
import type { PipelineStage } from './ModalStageSelection';

interface TaskActionsProps {
  task: ResolvableTask;
  stages?: PipelineStage[];
  leadName?: string;
  onResolved: () => void;
}

const REGRESAR_REASONS = [
  { value: 'not_ready', label: 'Lead no está listo' },
  { value: 'need_more_info', label: 'Necesita más información' },
  { value: 'timing', label: 'Timing no es correcto' },
  { value: 'otros', label: 'Otros' },
];

export default function TaskActions({ task, stages = [], leadName = 'este lead', onResolved }: TaskActionsProps) {
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [showStageSelection, setShowStageSelection] = useState(false);
  const [showOutcomeOptions, setShowOutcomeOptions] = useState(false);
  const [showPostpone, setShowPostpone] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showRegresar, setShowRegresar] = useState(false);

  const [scheduledFor, setScheduledFor] = useState('');
  const [modality, setModality] = useState<'virtual' | 'presencial'>('virtual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find current stage
  const currentStage = stages.find(s => s.clave === task.task_type) || stages[0];

  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledFor) return alert('Elige fecha y hora para la demo.');

    setIsSubmitting(true);
    setError(null);
    try {
      await resolveTaskResult(task, 'aceptado', { scheduledFor: new Date(scheduledFor).toISOString(), modality });
      onResolved();
    } catch (err) {
      console.error('Error al agendar demo:', err);
      setError('No se pudo agendar la demo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExito = async (stageId: string, note: string) => {
    setIsSubmitting(true);
    try {
      await resolveTaskWithPipeline(task, 'exito', stageId, note);
      setShowStageSelection(false);
      onResolved();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al confirmar éxito');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePosponer = async (scheduledDate: string, reason: string, note: string) => {
    setIsSubmitting(true);
    try {
      await resolveTaskWithPipeline(task, 'posponer', scheduledDate, note, reason);
      setShowPostpone(false);
      onResolved();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al posponer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegresar = async (reason: string, note: string) => {
    setIsSubmitting(true);
    try {
      await resolveTaskWithPipeline(task, 'regresar', undefined, note, reason);
      setShowRegresar(false);
      onResolved();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al regresar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReintentar = async () => {
    setIsSubmitting(true);
    try {
      await resolveTaskWithPipeline(task, 'reintentar', undefined, 'Reintento automático en 3 días');
      setShowOutcomeOptions(false);
      onResolved();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al reintentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async (reason: string, note: string) => {
    setIsSubmitting(true);
    try {
      await resolveTaskWithPipeline(task, 'descartar', undefined, note, reason);
      setShowDiscard(false);
      onResolved();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al descartar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showAcceptForm) {
    return (
      <form onSubmit={handleConfirmAccept} className="space-y-2 bg-emerald-50/60 border border-emerald-100 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
          <Calendar size={13} />
          <span className="text-[11px] font-black uppercase tracking-wider">Agendar Demo</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="border border-slate-200 rounded-lg p-1.5 text-[11px] bg-white focus:outline-emerald-600"
          />
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as 'virtual' | 'presencial')}
            className="border border-slate-200 rounded-lg p-1.5 text-[11px] bg-white focus:outline-emerald-600"
          >
            <option value="virtual">Virtual</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>
        {error && <p className="text-[10px] text-rose-600">{error}</p>}
        <div className="flex gap-1.5">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700">
            {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Confirmar Demo
          </button>
          <button type="button" onClick={() => setShowAcceptForm(false)} disabled={isSubmitting} className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-semibold">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setShowAcceptForm(true)}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check size={11} /> Aceptó
        </button>
        <button
          onClick={() => setShowStageSelection(true)}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded-md text-[10px] font-bold hover:bg-green-700 disabled:opacity-50"
        >
          <Check size={11} /> Éxito
        </button>
        <button
          onClick={() => setShowOutcomeOptions(true)}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded-md text-[10px] font-bold hover:bg-amber-700 disabled:opacity-50"
        >
          <ChevronDown size={11} /> Sin Éxito
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-600">{error}</p>}

      {/* Modals */}
      <ModalStageSelection
        isOpen={showStageSelection}
        currentStage={currentStage}
        stages={stages}
        isLoading={isSubmitting}
        onClose={() => setShowStageSelection(false)}
        onConfirm={handleExito}
      />

      <ModalOutcomeOptions
        isOpen={showOutcomeOptions}
        onClose={() => setShowOutcomeOptions(false)}
        onPosponer={() => {
          setShowOutcomeOptions(false);
          setShowPostpone(true);
        }}
        onRegresar={() => {
          setShowOutcomeOptions(false);
          setShowRegresar(true);
        }}
        onReintentar={handleReintentar}
        onDescartar={() => {
          setShowOutcomeOptions(false);
          setShowDiscard(true);
        }}
      />

      <ModalPostpone
        isOpen={showPostpone}
        isLoading={isSubmitting}
        onClose={() => setShowPostpone(false)}
        onConfirm={handlePosponer}
      />

      <ModalReason
        isOpen={showRegresar}
        title="Regresar al Paso Anterior"
        description="¿Por qué regresas este lead?"
        reasons={REGRESAR_REASONS}
        isLoading={isSubmitting}
        onClose={() => setShowRegresar(false)}
        onConfirm={handleRegresar}
      />

      <ModalDiscard
        isOpen={showDiscard}
        leadName={leadName}
        isLoading={isSubmitting}
        onClose={() => setShowDiscard(false)}
        onConfirm={handleDiscard}
      />
    </div>
  );
}
