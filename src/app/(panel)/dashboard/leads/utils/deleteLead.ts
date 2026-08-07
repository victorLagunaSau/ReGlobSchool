import { supabase } from '../../../../../lib/supabase/client';

interface DeleteLeadParams {
  leadId: string;
  userId: string;
  stageClave: string;
  stageTitle: string;
  stageNumber: string;
  reason: string;
  autoCompletedNotes: string;
}

export async function deleteLeadArchive({
  leadId,
  userId,
  stageClave,
  stageTitle,
  stageNumber,
  reason,
  autoCompletedNotes,
}: DeleteLeadParams): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Archive lead to deleted_leads
    const { data: leadData, error: leadFetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadFetchError) throw leadFetchError;

    if (leadData) {
      const { error: deleteLeadError } = await supabase
        .from('deleted_leads')
        .insert({
          original_lead_id: leadData.id,
          business_name: leadData.business_name,
          business_type: leadData.business_type,
          phone: leadData.phone,
          email: leadData.email,
          address: leadData.address,
          website: leadData.website,
          country_id: leadData.country_id,
          status: leadData.status,
          source: leadData.source,
          deletion_reason: reason,
          deletion_note: autoCompletedNotes,
          deleted_by: userId,
          original_created_at: leadData.created_at,
          metadata: JSON.stringify(leadData),
        });

      if (deleteLeadError) throw deleteLeadError;
    }

    // 2. Archive contacts to deleted_lead_contacts
    const { data: contactsData, error: contactsFetchError } = await supabase
      .from('lead_contacts')
      .select('*')
      .eq('lead_id', leadId);

    if (contactsFetchError) throw contactsFetchError;

    if (contactsData && contactsData.length > 0) {
      const contactsToArchive = contactsData.map((contact: any) => ({
        original_contact_id: contact.id,
        lead_id: contact.lead_id,
        nombre: contact.nombre,
        cargo: contact.cargo,
        telefono: contact.telefono,
        email: contact.email,
        es_tomador_decision: contact.es_tomador_decision,
        created_by: contact.created_by,
      }));

      const { error: deleteContactsError } = await supabase
        .from('deleted_lead_contacts')
        .insert(contactsToArchive);

      if (deleteContactsError) throw deleteContactsError;
    }

    // 3. Archive notes to deleted_lead_attempt_notes
    const { data: notesData, error: notesFetchError } = await supabase
      .from('lead_attempt_notes')
      .select('*')
      .eq('lead_id', leadId);

    if (notesFetchError) throw notesFetchError;

    if (notesData && notesData.length > 0) {
      const notesToArchive = notesData.map((note: any) => ({
        original_note_id: note.id,
        lead_id: note.lead_id,
        stage_clave: note.stage_clave,
        stage_titulo: note.stage_titulo,
        attempt_number: note.attempt_number,
        note_type: note.note_type,
        note_text: note.note_text,
      }));

      const { error: deleteNotesError } = await supabase
        .from('deleted_lead_attempt_notes')
        .insert(notesToArchive);

      if (deleteNotesError) throw deleteNotesError;
    }

    // 4. Archive meetings to deleted_lead_meetings
    const { data: meetingsData, error: meetingsFetchError } = await supabase
      .from('lead_meetings')
      .select('*')
      .eq('lead_id', leadId);

    if (meetingsFetchError) throw meetingsFetchError;

    if (meetingsData && meetingsData.length > 0) {
      const meetingsToArchive = meetingsData.map((meeting: any) => ({
        original_meeting_id: meeting.id,
        lead_id: meeting.lead_id,
        status: meeting.status,
        invitee_name: meeting.invitee_name,
        invitee_email: meeting.invitee_email,
        invitee_phone: meeting.invitee_phone,
        invitee_timezone: meeting.invitee_timezone,
        event_type: meeting.event_type,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        calendly_uri: meeting.calendly_uri,
        zoom_uri: meeting.zoom_uri,
        deleted_by: userId,
        deletion_reason: reason,
        original_created_at: meeting.created_at,
        original_updated_at: meeting.updated_at,
        metadata: JSON.stringify(meeting),
      }));

      const { error: deleteMeetingsError } = await supabase
        .from('deleted_lead_meetings')
        .insert(meetingsToArchive);

      if (deleteMeetingsError) throw deleteMeetingsError;
    }

    // 5. Archive interactions to deleted_lead_interactions
    const { data: interactionsData, error: interactionsFetchError } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', leadId);

    if (interactionsFetchError) throw interactionsFetchError;

    if (interactionsData && interactionsData.length > 0) {
      const interactionsToArchive = interactionsData.map((interaction: any) => ({
        original_interaction_id: interaction.id,
        lead_id: interaction.lead_id,
        interaction_type: interaction.interaction_type,
        actor_id: interaction.actor_id,
        action_label: interaction.action_label,
        message: interaction.message,
        metadata: interaction.metadata,
        original_created_at: interaction.created_at,
        deleted_by: userId,
        deletion_reason: reason,
      }));

      const { error: deleteInteractionsError } = await supabase
        .from('deleted_lead_interactions')
        .insert(interactionsToArchive);

      if (deleteInteractionsError) throw deleteInteractionsError;
    }

    // 6. Archive documents to deleted_lead_documents
    const { data: documentsData, error: documentsFetchError } = await supabase
      .from('lead_documents')
      .select('*')
      .eq('lead_id', leadId);

    if (documentsFetchError) throw documentsFetchError;

    if (documentsData && documentsData.length > 0) {
      const documentsToArchive = documentsData.map((document: any) => ({
        original_document_id: document.id,
        lead_id: document.lead_id,
        nombre: document.nombre,
        entregado: document.entregado,
        aceptado_estado: document.aceptado_estado,
        original_created_at: document.created_at,
        deleted_by: userId,
        deletion_reason: reason,
      }));

      const { error: deleteDocumentsError } = await supabase
        .from('deleted_lead_documents')
        .insert(documentsToArchive);

      if (deleteDocumentsError) throw deleteDocumentsError;
    }

    // 7. Archive submissions to deleted_document_submissions
    const { data: submissionsData, error: submissionsFetchError } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('lead_id', leadId);

    if (submissionsFetchError) throw submissionsFetchError;

    if (submissionsData && submissionsData.length > 0) {
      const submissionsToArchive = submissionsData.map((submission: any) => ({
        original_submission_id: submission.id,
        lead_id: submission.lead_id,
        document_id: submission.document_id,
        status: submission.status,
        file_url: submission.file_url,
        file_path: submission.file_path,
        submitted_at: submission.submitted_at,
        accepted_at: submission.accepted_at,
        rejected_at: submission.rejected_at,
        resent_at: submission.resent_at,
        original_created_at: submission.created_at,
        deleted_by: userId,
        deletion_reason: reason,
      }));

      const { error: deleteSubmissionsError } = await supabase
        .from('deleted_document_submissions')
        .insert(submissionsToArchive);

      if (deleteSubmissionsError) throw deleteSubmissionsError;
    }

    // 8. Archive decision makers to deleted_lead_decision_makers
    const { data: decisionMakersData, error: decisionMakersFetchError } = await supabase
      .from('lead_decision_makers')
      .select('*')
      .eq('lead_id', leadId);

    if (decisionMakersFetchError) throw decisionMakersFetchError;

    if (decisionMakersData && decisionMakersData.length > 0) {
      const decisionMakersToArchive = decisionMakersData.map((dm: any) => ({
        original_decision_maker_id: dm.id,
        original_lead_id: leadId,
        lead_id: dm.lead_id,
        nombre: dm.nombre,
        cargo: dm.cargo,
        telefono: dm.telefono,
        email: dm.email,
        original_created_at: dm.created_at,
        original_updated_at: dm.updated_at,
        deleted_by: userId,
        deletion_reason: reason,
        metadata: JSON.stringify(dm),
      }));

      const { error: deleteDecisionMakersError } = await supabase
        .from('deleted_lead_decision_makers')
        .insert(decisionMakersToArchive);

      if (deleteDecisionMakersError) throw deleteDecisionMakersError;
    }

    // 9. Archive tasks to deleted_lead_tasks
    const { data: tasksData, error: tasksFetchError } = await supabase
      .from('lead_tasks')
      .select('*')
      .eq('lead_id', leadId);

    if (tasksFetchError) throw tasksFetchError;

    if (tasksData && tasksData.length > 0) {
      const tasksToArchive = tasksData.map((task: any) => ({
        original_task_id: task.id,
        original_lead_id: leadId,
        lead_id: task.lead_id,
        task_type: task.task_type,
        description: task.description,
        scheduled_for: task.scheduled_for,
        completed_at: task.completed_at,
        status: task.status,
        outcome: task.outcome,
        channel: task.channel,
        attempt_number: task.attempt_number,
        modality: task.modality,
        result: task.result,
        original_created_at: task.created_at,
        deleted_by: userId,
        deletion_reason: reason,
        metadata: JSON.stringify(task),
      }));

      const { error: deleteTasksError } = await supabase
        .from('deleted_lead_tasks')
        .insert(tasksToArchive);

      if (deleteTasksError) throw deleteTasksError;
    }

    // 10. Archive score progress to deleted_lead_score_progress
    const { data: scoreProgressData, error: scoreProgressFetchError } = await supabase
      .from('lead_score_progress')
      .select('*')
      .eq('lead_id', leadId);

    if (scoreProgressFetchError) throw scoreProgressFetchError;

    if (scoreProgressData && scoreProgressData.length > 0) {
      // Get step details for metadata
      const { data: stepsData } = await supabase
        .from('lead_score_steps')
        .select('*');

      const scoreProgressToArchive = scoreProgressData.map((sp: any) => {
        const step = stepsData?.find((s: any) => s.id === sp.step_id);
        return {
          original_lead_id: leadId,
          step_id: sp.step_id,
          step_label: step?.label,
          step_stage: step?.stage,
          step_weight: step?.weight,
          original_completed_at: sp.completed_at,
          deleted_by: userId,
          deletion_reason: reason,
          metadata: JSON.stringify(sp),
        };
      });

      const { error: deleteScoreProgressError } = await supabase
        .from('deleted_lead_score_progress')
        .insert(scoreProgressToArchive);

      if (deleteScoreProgressError) throw deleteScoreProgressError;
    }

    // 11. Archive imports to deleted_lead_imports
    const { data: importsData, error: importsFetchError } = await supabase
      .from('lead_imports')
      .select('*')
      .eq('lead_id', leadId);

    if (importsFetchError) throw importsFetchError;

    if (importsData && importsData.length > 0) {
      const importsToArchive = importsData.map((imp: any) => ({
        original_import_id: imp.id,
        original_lead_id: leadId,
        lead_id: imp.lead_id,
        upload_batch_id: imp.upload_batch_id,
        business_name: imp.business_name,
        business_type: imp.business_type,
        phone: imp.phone,
        email: imp.email,
        address: imp.address,
        municipality_code: imp.municipality_code,
        status: imp.status,
        error_message: imp.error_message,
        zone_id: imp.zone_id,
        owner_id: imp.owner_id,
        original_created_at: imp.created_at,
        deleted_by: userId,
        deletion_reason: reason,
        metadata: JSON.stringify(imp),
      }));

      const { error: deleteImportsError } = await supabase
        .from('deleted_lead_imports')
        .insert(importsToArchive);

      if (deleteImportsError) throw deleteImportsError;
    }

    // 12. Delete from original tables (order matters: FK dependencies)

    // Delete imports first (no FK dependencies)
    const { error: deleteImportsDbError } = await supabase
      .from('lead_imports')
      .delete()
      .eq('lead_id', leadId);

    if (deleteImportsDbError) throw deleteImportsDbError;

    // Delete score progress
    const { error: deleteScoreProgressDbError } = await supabase
      .from('lead_score_progress')
      .delete()
      .eq('lead_id', leadId);

    if (deleteScoreProgressDbError) throw deleteScoreProgressDbError;

    // Delete tasks
    const { error: deleteTasksDbError } = await supabase
      .from('lead_tasks')
      .delete()
      .eq('lead_id', leadId);

    if (deleteTasksDbError) throw deleteTasksDbError;

    // Delete decision makers
    const { error: deleteDecisionMakersDbError } = await supabase
      .from('lead_decision_makers')
      .delete()
      .eq('lead_id', leadId);

    if (deleteDecisionMakersDbError) throw deleteDecisionMakersDbError;

    // Delete document submissions (references lead_documents)
    const { error: deleteSubmissionsDbError } = await supabase
      .from('document_submissions')
      .delete()
      .eq('lead_id', leadId);

    if (deleteSubmissionsDbError) throw deleteSubmissionsDbError;

    // Delete documents
    const { error: deleteDocumentsDbError } = await supabase
      .from('lead_documents')
      .delete()
      .eq('lead_id', leadId);

    if (deleteDocumentsDbError) throw deleteDocumentsDbError;

    // Delete interactions
    const { error: deleteInteractionsDbError } = await supabase
      .from('lead_interactions')
      .delete()
      .eq('lead_id', leadId);

    if (deleteInteractionsDbError) throw deleteInteractionsDbError;

    // Delete contacts (they reference leads)
    const { error: deleteContactsDbError } = await supabase
      .from('lead_contacts')
      .delete()
      .eq('lead_id', leadId);

    if (deleteContactsDbError) throw deleteContactsDbError;

    // Delete notes
    const { error: deleteNotesDbError } = await supabase
      .from('lead_attempt_notes')
      .delete()
      .eq('lead_id', leadId);

    if (deleteNotesDbError) throw deleteNotesDbError;

    // Delete meetings
    const { error: deleteMeetingsDbError } = await supabase
      .from('lead_meetings')
      .delete()
      .eq('lead_id', leadId);

    if (deleteMeetingsDbError) throw deleteMeetingsDbError;

    // Delete lead (last, after all dependent data)
    const { error: deleteLeadDbError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (deleteLeadDbError) throw deleteLeadDbError;

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteLeadArchive:', err);
    let errorMsg = 'Unknown error occurred';

    if (err?.message) {
      errorMsg = err.message;
    } else if (err?.error_description) {
      errorMsg = err.error_description;
    } else if (err?.details) {
      errorMsg = err.details;
    } else if (err?.hint) {
      errorMsg = err.hint;
    } else if (typeof err === 'string') {
      errorMsg = err;
    } else {
      errorMsg = JSON.stringify(err);
    }

    console.error('Detailed error:', { err, errorMsg });
    return { success: false, error: errorMsg };
  }
}
