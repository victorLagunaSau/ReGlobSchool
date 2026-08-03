/**
 * Calendly Webhook Handler
 * POST /api/calendly/webhook
 * Recibe eventos cuando se agenda/cancela una reunión
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('📨 Webhook received from Calendly:', payload.event);

    if (payload.event === 'invitee.created') {
      const { scheduled_event, invitee, event_type } = payload.payload;

      console.log('📅 Meeting scheduled:', {
        event_type: event_type.name,
        start_time: scheduled_event.start_time,
        invitee_email: invitee.email,
      });

      // Crear cliente Supabase con SERVICE ROLE (privilegios elevados)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      // Buscar el registro por email sintético (formato: {lead_id}@calendarregglobschool.com)
      // Esto asegura que encontremos EXACTAMENTE el registro correcto sin conflictos
      const { data: meetings, error: meetingError } = await supabase
        .from('lead_meetings')
        .select('id')
        .eq('invitee_email', invitee.email);

      if (meetingError) {
        console.error('❌ Error searching meeting:', meetingError.message);
        return NextResponse.json(
          { error: 'Failed to search meeting', details: meetingError.message },
          { status: 500 }
        );
      }

      const meeting = meetings && meetings.length > 0 ? meetings[0] : null;

      if (meeting) {
        // ENCONTRADO - ACTUALIZAR registro con datos reales del webhook
        console.log('🔄 Updating meeting record:', meeting.id);
        const { error: updateError } = await supabase
          .from('lead_meetings')
          .update({
            event_type: event_type.name,
            start_time: scheduled_event.start_time,
            end_time: scheduled_event.end_time,
            invitee_name: invitee.name,
            calendly_uri: scheduled_event.uri,
          })
          .eq('id', meeting.id);

        if (updateError) {
          console.error('❌ Error updating meeting:', updateError);
          return NextResponse.json(
            { error: 'Failed to update meeting', details: updateError.message },
            { status: 500 }
          );
        }

        console.log('✅ Meeting updated successfully:', meeting.id);
      } else {
        // NO ENCONTRADO - ignorar webhook (no es un registro creado en nuestra app)
        console.warn('⚠️ Meeting not found with invitee_email:', invitee.email);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ success: true });
    }

    if (payload.event === 'invitee.canceled') {
      const { scheduled_event, invitee } = payload.payload;

      console.log('❌ Meeting canceled:', {
        start_time: scheduled_event.start_time,
        invitee_email: invitee.email,
      });

      // Aquí podrías actualizar el estado de la reunión o eliminarla
      // Por ahora, solo loguear

      return NextResponse.json({ success: true });
    }

    // Otros eventos - ignorar pero confirmar recepción
    console.log('ℹ️ Ignoring event:', payload.event);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔥 Webhook error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
