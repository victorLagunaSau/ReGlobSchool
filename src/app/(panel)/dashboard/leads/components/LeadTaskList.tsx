'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Phone, Mail, ListChecks, Plus, Check, Clock, X, Loader2 } from 'lucide-react';

export interface LeadTaskRow {
  id: string;
  task_type: 'llamada' | 'email' | 'seguimiento';
  description: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  status: 'pendiente' | 'completado' | 'postergado';
  outcome: string | null;
  created_at: string;
}

interface LeadTaskListProps {
  leadId: string;
  tasks: LeadTaskRow[];
  onRefresh: () => void;
}

const TASK_ICONS = {
  llamada: Phone,
  email: Mail,
  seguimiento: ListChecks,
};

const TASK_LABELS: Record<string, string> = {
  llamada: 'Llamada',
  email: 'Email',
  seguimiento: 'Seguimiento',
};

export default function LeadTaskList({ leadId, tasks, onRefresh }: LeadTaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [taskType, setTaskType] = useState<'llamada' | 'email' | 'seguimiento'>('llamada');
  const [description, setDescription] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [outcomeDraft, setOutcomeDraft] = useState('');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('lead_tasks').insert({
        lead_id: leadId,
        task_type: taskType,
        description: description.trim() || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
      if (error) throw error;
      setDescription('');
      setScheduledFor('');
      setIsAdding(false);
      onRefresh();
    } catch (error) {
      console.error('Error al crear tarea:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolve = async (taskId: string, status: 'completado' | 'postergado') => {
    const { error } = await supabase
      .from('lead_tasks')
      .update({
        status,
        completed_at: status === 'completado' ? new Date().toISOString() : null,
        outcome: outcomeDraft.trim() || null,
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error al actualizar tarea:', error);
      return;
    }
    setResolvingId(null);
    setOutcomeDraft('');
    onRefresh();
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Timeline de Tareas ({tasks.length})</h2>
        <button
          onClick={() => setIsAdding((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
        >
          <Plus size={13} /> Nueva Tarea
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTask} className="p-4 bg-slate-50/60 border-b border-slate-100 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={taskType} onChange={(e) => setTaskType(e.target.value as 'llamada' | 'email' | 'seguimiento')} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
              <option value="llamada">Llamada</option>
              <option value="email">Email</option>
              <option value="seguimiento">Seguimiento</option>
            </select>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
            />
          </div>
          <input
            type="text"
            placeholder="Descripción (ej. Llamada 2 de seguimiento)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 border rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-white">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-semibold hover:bg-blue-700 flex items-center gap-1.5">
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Crear Tarea'}
            </button>
          </div>
        </form>
      )}

      {sortedTasks.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">Sin tareas todavía — crea la primera desde &ldquo;Nueva Tarea&rdquo;.</div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {sortedTasks.map((task) => {
            const Icon = TASK_ICONS[task.task_type];
            const isResolving = resolvingId === task.id;

            return (
              <div key={task.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 mt-0.5">
                      <Icon size={13} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{TASK_LABELS[task.task_type]}</div>
                      {task.description && <div className="text-[11px] text-slate-500">{task.description}</div>}
                      {task.scheduled_for && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> Programada: {new Date(task.scheduled_for).toLocaleString('es-MX')}
                        </div>
                      )}
                      {task.outcome && <div className="text-[10px] text-slate-500 mt-1 italic">&ldquo;{task.outcome}&rdquo;</div>}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      task.status === 'completado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.status === 'postergado'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {task.status === 'completado' ? 'Completado' : task.status === 'postergado' ? 'Postergado' : 'Pendiente'}
                  </span>
                </div>

                {task.status === 'pendiente' && (
                  isResolving ? (
                    <div className="pl-8 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Nota de resultado (opcional)"
                        value={outcomeDraft}
                        onChange={(e) => setOutcomeDraft(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] focus:outline-blue-600"
                      />
                      <div className="flex gap-1.5">
                        <button onClick={() => handleResolve(task.id, 'completado')} className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-semibold hover:bg-emerald-700">
                          <Check size={11} /> Completado
                        </button>
                        <button onClick={() => handleResolve(task.id, 'postergado')} className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded-md text-[10px] font-semibold hover:bg-amber-600">
                          <Clock size={11} /> Postergar
                        </button>
                        <button onClick={() => { setResolvingId(null); setOutcomeDraft(''); }} className="px-2 py-1 text-slate-400 hover:bg-slate-100 rounded-md text-[10px]">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setResolvingId(task.id)} className="pl-8 text-[10px] font-bold text-blue-600 hover:text-blue-700">
                      Marcar resultado
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
