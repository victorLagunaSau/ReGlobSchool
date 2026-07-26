'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Phone, Mail, Users, Video, Plus, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import TaskActions from './TaskActions';
import type { ResolvableTask } from '../../../../../lib/task-automation';

export interface LeadTaskRow {
  id: string;
  task_type: 'contacto_inicial' | 'seguimiento' | 'demo';
  channel: 'telefono' | 'email' | 'ambos' | null;
  attempt_number: number;
  modality: 'virtual' | 'presencial' | null;
  description: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  status: 'pendiente' | 'completado' | 'postergado';
  result: 'aceptado' | 'rechazado' | 'sin_respuesta' | null;
  outcome: string | null;
  created_at: string;
}

interface LeadTaskListProps {
  leadId: string;
  tasks: LeadTaskRow[];
  onRefresh: () => void;
}

const CHANNEL_ICONS = { telefono: Phone, email: Mail, ambos: Users } as const;

const RESULT_LABELS: Record<string, string> = {
  aceptado: 'Aceptó',
  rechazado: 'Rechazó',
  sin_respuesta: 'Sin respuesta',
};

function taskLabel(task: LeadTaskRow) {
  if (task.task_type === 'demo') return 'Demostración de Producto';
  if (task.task_type === 'contacto_inicial') return 'Contacto Inicial';
  return `Seguimiento — Intento ${task.attempt_number}`;
}

export default function LeadTaskList({ leadId, tasks, onRefresh }: LeadTaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [taskType, setTaskType] = useState<'contacto_inicial' | 'seguimiento' | 'demo'>('contacto_inicial');
  const [description, setDescription] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [markingDoneId, setMarkingDoneId] = useState<string | null>(null);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('lead_tasks').insert({
        lead_id: leadId,
        task_type: taskType,
        channel: taskType === 'demo' ? null : 'ambos',
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

  const handleMarkDemoDone = async (taskId: string) => {
    setMarkingDoneId(taskId);
    const { error } = await supabase
      .from('lead_tasks')
      .update({ status: 'completado', completed_at: new Date().toISOString() })
      .eq('id', taskId);
    if (!error) onRefresh();
    setMarkingDoneId(null);
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
            <select value={taskType} onChange={(e) => setTaskType(e.target.value as 'contacto_inicial' | 'seguimiento' | 'demo')} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
              <option value="contacto_inicial">Contacto Inicial</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="demo">Demostración</option>
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
            placeholder="Descripción (opcional)"
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
            const Icon = task.task_type === 'demo' ? Video : task.channel ? CHANNEL_ICONS[task.channel] : Users;

            return (
              <div key={task.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 mt-0.5">
                      <Icon size={13} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{taskLabel(task)}</div>
                      {task.description && <div className="text-[11px] text-slate-500">{task.description}</div>}
                      {task.task_type === 'demo' && task.modality && (
                        <div className="text-[10px] text-slate-500 capitalize">{task.modality}</div>
                      )}
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
                      task.status === 'completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {task.status === 'completado' ? (task.result ? RESULT_LABELS[task.result] : 'Completado') : 'Pendiente'}
                  </span>
                </div>

                {task.status === 'pendiente' && (
                  <div className="pl-8">
                    {task.task_type === 'demo' ? (
                      <button
                        onClick={() => handleMarkDemoDone(task.id)}
                        disabled={markingDoneId === task.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {markingDoneId === task.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Marcar como realizada
                      </button>
                    ) : (
                      <TaskActions
                        task={{ id: task.id, lead_id: leadId, task_type: task.task_type, channel: task.channel, attempt_number: task.attempt_number } as ResolvableTask}
                        onResolved={onRefresh}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
