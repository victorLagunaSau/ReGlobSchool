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
        stage_id: meeting.stage_id,
        meeting_date: meeting.meeting_date,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        invitee_name: meeting.invitee_name,
        invitee_email: meeting.invitee_email,
        invitee_phone: meeting.invitee_phone,
        status: meeting.status,
        google_calendar_event_id: meeting.google_calendar_event_id,
        metadata: JSON.stringify(meeting),
      }));

      const { error: deleteMeetingsError } = await supabase
        .from('deleted_lead_meetings')
        .insert(meetingsToArchive);

      if (deleteMeetingsError) throw deleteMeetingsError;
    }

    // 5. Delete from original tables (order matters: FK dependencies)
    // Delete contacts first (they reference leads)
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

    // Delete lead (last, after dependent data)
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
