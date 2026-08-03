import { supabase } from '../../../../../lib/supabase/client';

interface AdvanceStageParams {
  leadId: string;
  currentStageClave: string;
  currentStageTitle: string;
  currentStageNumber: string;
  nextStageClave: string;
  nextStageTitle: string;
  notes: string;
}

interface BackStageParams {
  leadId: string;
  previousStageClave: string;
  currentStageTitle: string;
  currentStageNumber: string;
  notes: string;
}

export async function handleAdvanceStage({
  leadId,
  currentStageClave,
  currentStageTitle,
  currentStageNumber,
  nextStageClave,
  nextStageTitle,
  notes,
}: AdvanceStageParams): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const autoCompletedNotes = `${notes}\n\n${currentStageTitle} (Etapa ${currentStageNumber})\nAvanzar a: ${nextStageTitle}\nFecha: ${now.toLocaleDateString('es-ES')}`;

    // 1. Save note to audit trail
    const { error: noteError } = await supabase.from('lead_attempt_notes').insert({
      lead_id: leadId,
      stage_clave: currentStageClave,
      stage_titulo: currentStageTitle,
      attempt_number: 1,
      note_type: 'success',
      note_text: autoCompletedNotes,
    });

    if (noteError) throw noteError;

    // 2. Update lead status to next stage (resets attempt counter via trigger)
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: nextStageClave,
        current_stage_attempts: 0,
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    // 3. Record interaction for analytics
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.data.user?.id;

    if (userId) {
      await supabase.from('lead_interactions').insert({
        lead_id: leadId,
        interaction_type: 'stage_advance',
        actor_id: userId,
        action_label: `Avance a ${nextStageTitle}`,
        message: `Lead avanzó de ${currentStageTitle} a ${nextStageTitle}`,
        metadata: {
          from_stage: currentStageClave,
          to_stage: nextStageClave,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error advancing stage:', err);
    const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
    return { success: false, error: errorMsg };
  }
}

export async function handleBackStage({
  leadId,
  previousStageClave,
  currentStageTitle,
  currentStageNumber,
  notes,
}: BackStageParams): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const autoCompletedNotes = `${notes}\n\n${currentStageTitle} (Etapa ${currentStageNumber})\nRegresar a etapa anterior\nFecha: ${now.toLocaleDateString('es-ES')}`;

    // 1. Save note to audit trail
    const { error: noteError } = await supabase.from('lead_attempt_notes').insert({
      lead_id: leadId,
      stage_clave: currentStageTitle,
      stage_titulo: currentStageTitle,
      attempt_number: 1,
      note_type: 'back',
      note_text: autoCompletedNotes,
    });

    if (noteError) throw noteError;

    // 2. Update lead status to previous stage
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: previousStageClave,
        current_stage_attempts: 0,
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    // 3. Record interaction for analytics
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.data.user?.id;

    if (userId) {
      await supabase.from('lead_interactions').insert({
        lead_id: leadId,
        interaction_type: 'stage_back',
        actor_id: userId,
        action_label: 'Regreso a etapa anterior',
        message: `Lead regresó a etapa anterior desde ${currentStageTitle}`,
        metadata: {
          from_stage: currentStageTitle,
          to_stage: previousStageClave,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error going back stage:', err);
    const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
    return { success: false, error: errorMsg };
  }
}
