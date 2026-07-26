import { supabase } from './supabase/client';

// Secuencia de prospección: Contacto inicial -> hasta 3 intentos de
// seguimiento (reprogramados cada 3 días si rechaza o no responde) -> Demo
// si acepta en cualquier punto -> Descartado si los 3 intentos fallan.

export type TaskResult = 'aceptado' | 'rechazado' | 'sin_respuesta';
export type TaskResolution = 'exito' | 'posponer' | 'regresar' | 'reintentar' | 'descartar';

export interface ResolvableTask {
  id: string;
  lead_id: string;
  task_type: 'contacto_inicial' | 'seguimiento' | 'demo';
  channel: 'telefono' | 'email' | 'ambos' | null;
  attempt_number: number;
}

export interface AcceptedExtra {
  scheduledFor: string; // ISO datetime de la demo
  modality: 'virtual' | 'presencial';
}

const FOLLOWUP_INTERVAL_DAYS = 3;
const MAX_FOLLOWUP_ATTEMPTS = 3;

export async function resolveTaskResult(task: ResolvableTask, result: TaskResult, extra?: AcceptedExtra): Promise<void> {
  const { error: updateError } = await supabase
    .from('lead_tasks')
    .update({ status: 'completado', completed_at: new Date().toISOString(), result })
    .eq('id', task.id);
  if (updateError) throw updateError;

  // Las demos no disparan la secuencia de reintentos: son el destino final,
  // solo se marcan como completadas.
  if (task.task_type === 'demo') return;

  if (result === 'aceptado') {
    if (!extra) throw new Error('Falta fecha/hora y modalidad para agendar la demo.');

    const { error: insertError } = await supabase.from('lead_tasks').insert({
      lead_id: task.lead_id,
      task_type: 'demo',
      description: 'Demostración de producto',
      scheduled_for: extra.scheduledFor,
      modality: extra.modality,
      status: 'pendiente',
    });
    if (insertError) throw insertError;

    await supabase
      .from('leads')
      .update({ status: 'negociacion' })
      .eq('id', task.lead_id)
      .in('status', ['prospecto', 'llamada']);
    return;
  }

  // rechazado | sin_respuesta
  const isFirstTouch = task.task_type === 'contacto_inicial';

  if (isFirstTouch || task.attempt_number < MAX_FOLLOWUP_ATTEMPTS) {
    const nextAttempt = isFirstTouch ? 1 : task.attempt_number + 1;
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + FOLLOWUP_INTERVAL_DAYS);

    const { error: insertError } = await supabase.from('lead_tasks').insert({
      lead_id: task.lead_id,
      task_type: 'seguimiento',
      channel: task.channel || 'ambos',
      attempt_number: nextAttempt,
      description: `Seguimiento intento ${nextAttempt}`,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pendiente',
    });
    if (insertError) throw insertError;
  } else {
    const { error: discardError } = await supabase.from('leads').update({ status: 'descartado' }).eq('id', task.lead_id);
    if (discardError) throw discardError;
  }
}

export async function resolveTaskWithPipeline(
  task: ResolvableTask,
  resolution: TaskResolution,
  nextStageId?: string,
  note?: string,
  reason?: string
): Promise<void> {
  if (!note || note.trim().length < 10) {
    throw new Error('Note is required and must be at least 10 characters');
  }

  const now = new Date().toISOString();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) throw new Error('User not authenticated');

  try {
    // 1. Update task status
    const { error: updateError } = await supabase
      .from('lead_tasks')
      .update({
        status: 'completado',
        completed_at: now,
        outcome: note.trim(),
      })
      .eq('id', task.id);

    if (updateError) throw updateError;

    // 2. Log interaction
    const { error: interactionError } = await supabase
      .from('lead_interactions')
      .insert({
        lead_id: task.lead_id,
        interaction_type: 'task_outcome',
        actor_id: userId,
        action_label: resolution.charAt(0).toUpperCase() + resolution.slice(1),
        message: note.trim(),
        metadata: {
          task_id: task.id,
          task_type: task.task_type,
          resolution,
          reason,
          nextStageId,
        },
      });

    if (interactionError) throw interactionError;

    // 3. Handle resolution logic
    if (resolution === 'exito') {
      if (!nextStageId) throw new Error('nextStageId required for exito');

      // Update lead status to new stage
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: nextStageId })
        .eq('id', task.lead_id);

      if (leadError) throw leadError;

      // Create follow-up task based on stage
      const { error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: task.lead_id,
          task_type: 'seguimiento',
          status: 'pendiente',
          description: 'Seguimiento de avance',
          scheduled_for: new Date().toISOString(),
        });

      if (taskError) throw taskError;
    } else if (resolution === 'posponer') {
      if (!nextStageId) throw new Error('nextStageId (scheduledDate) required for posponer');

      // Create new task for future date
      const { error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: task.lead_id,
          task_type: task.task_type,
          channel: task.channel || 'ambos',
          status: 'pendiente',
          scheduled_for: nextStageId,
          description: `Reprogramado - ${reason || 'Motivo no especificado'}`,
        });

      if (taskError) throw taskError;
    } else if (resolution === 'reintentar') {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + FOLLOWUP_INTERVAL_DAYS);

      // Create new task in 3 days
      const { error: taskError } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: task.lead_id,
          task_type: task.task_type,
          channel: task.channel || 'ambos',
          attempt_number: (task.attempt_number || 0) + 1,
          status: 'pendiente',
          scheduled_for: scheduledDate.toISOString(),
          description: `Reintento - ${reason || 'Motivo no especificado'}`,
        });

      if (taskError) throw taskError;
    } else if (resolution === 'regresar') {
      // Move lead back to previous stage
      // This is simplified - in production, you'd need to find the previous stage
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'llamada' }) // Simplified: hardcoded previous stage
        .eq('id', task.lead_id);

      if (leadError) throw leadError;
    } else if (resolution === 'descartar') {
      // Move lead to descartado and archive
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'descartado' })
        .eq('id', task.lead_id);

      if (leadError) throw leadError;

      // Close all pending tasks for this lead
      const { error: tasksError } = await supabase
        .from('lead_tasks')
        .update({ status: 'completado', completed_at: now })
        .eq('lead_id', task.lead_id)
        .eq('status', 'pendiente');

      if (tasksError && tasksError.code !== 'PGRST116') throw tasksError;
    }
  } catch (error) {
    console.error('Error in resolveTaskWithPipeline:', error);
    throw error;
  }
}
