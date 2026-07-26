'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';
import { Phone, Mail, Users, Video, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import TaskActions from '../leads/components/TaskActions';
import type { ResolvableTask } from '../../../../lib/task-automation';

interface TaskWithLead {
  id: string;
  lead_id: string;
  task_type: 'contacto_inicial' | 'seguimiento' | 'demo';
  channel: 'telefono' | 'email' | 'ambos' | null;
  attempt_number: number;
  scheduled_for: string | null;
  description: string | null;
  modality: 'virtual' | 'presencial' | null;
  lead_business_name: string;
}

const CHANNEL_ICONS = { telefono: Phone, email: Mail, ambos: Users } as const;

function dateOnly(iso: string) {
  return iso.slice(0, 10);
}

function taskLabel(task: TaskWithLead) {
  if (task.task_type === 'demo') return 'Demostración de Producto';
  if (task.task_type === 'contacto_inicial') return 'Contacto Inicial';
  return `Seguimiento — Intento ${task.attempt_number}`;
}

export default function MisTareasPage() {
  const [tasks, setTasks] = useState<TaskWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDoneId, setMarkingDoneId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_tasks')
      .select('id, lead_id, task_type, channel, attempt_number, scheduled_for, description, modality, leads(business_name)')
      .eq('status', 'pendiente')
      .order('scheduled_for', { ascending: true, nullsFirst: true });

    if (!error && data) {
      setTasks(
        data.map((t: any) => ({
          id: t.id,
          lead_id: t.lead_id,
          task_type: t.task_type,
          channel: t.channel,
          attempt_number: t.attempt_number,
          scheduled_for: t.scheduled_for,
          description: t.description,
          modality: t.modality,
          lead_business_name: t.leads?.business_name || '—',
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const { overdue, dueToday, upcoming } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      overdue: tasks.filter((t) => t.scheduled_for && dateOnly(t.scheduled_for) < todayStr),
      dueToday: tasks.filter((t) => !t.scheduled_for || dateOnly(t.scheduled_for) === todayStr),
      upcoming: tasks.filter((t) => t.scheduled_for && dateOnly(t.scheduled_for) > todayStr),
    };
  }, [tasks]);

  const handleMarkDemoDone = async (taskId: string) => {
    setMarkingDoneId(taskId);
    const { error } = await supabase
      .from('lead_tasks')
      .update({ status: 'completado', completed_at: new Date().toISOString() })
      .eq('id', taskId);
    if (!error) fetchTasks();
    setMarkingDoneId(null);
  };

  const renderTask = (task: TaskWithLead) => {
    const ChannelIcon = task.channel ? CHANNEL_ICONS[task.channel] : null;

    return (
      <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/dashboard/leads/${task.lead_id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 hover:underline">
              {task.lead_business_name}
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
              {task.task_type === 'demo' ? <Video size={12} className="text-slate-400" /> : ChannelIcon && <ChannelIcon size={12} className="text-slate-400" />}
              {taskLabel(task)}
            </div>
          </div>
          {task.scheduled_for && (
            <div className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
              <Clock size={10} />
              {new Date(task.scheduled_for).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {task.task_type === 'demo' ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 capitalize">{task.modality || 'Sin modalidad'}</span>
            <button
              onClick={() => handleMarkDemoDone(task.id)}
              disabled={markingDoneId === task.id}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {markingDoneId === task.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Marcar como realizada
            </button>
          </div>
        ) : (
          <TaskActions
            task={{ id: task.id, lead_id: task.lead_id, task_type: task.task_type, channel: task.channel, attempt_number: task.attempt_number } as ResolvableTask}
            onResolved={fetchTasks}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando tus tareas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">Mis Tareas</h1>
        <p className="text-xs text-slate-500">Tu prospección diaria — resuelve cada tarea y el sistema programa el siguiente paso.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          No tienes tareas pendientes. Crea un lead nuevo para empezar.
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-rose-600">Vencidas ({overdue.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{overdue.map(renderTask)}</div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Hoy ({dueToday.length})</h2>
            {dueToday.length === 0 ? (
              <p className="text-[11px] text-slate-400">Sin tareas para hoy.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{dueToday.map(renderTask)}</div>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Próximas ({upcoming.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{upcoming.map(renderTask)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
