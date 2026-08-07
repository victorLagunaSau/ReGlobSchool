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

    // 8. Delete from original tables (order matters: FK dependencies)

    // Delete document submissions first
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
    const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
    return { success: false, error: errorMsg };
  }
}
