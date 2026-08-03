/**
 * POST /api/calendly/webhook
 * Recibe eventos de Calendly cuando se agenda una reunión
 * Guarda calendly_uri en lead_meetings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📬 Webhook received:', body.event);

    const event = body.event;
    if (event !== 'invitee.created') {
      console.warn('⏭️ Ignoring event:', event);
      return NextResponse.json({ success: true, ignored: true });
    }

    const payload = body.payload;
    if (!payload) {
      console.error('❌ No payload in webhook');
      return NextResponse.json({ error: 'No payload' }, { status: 400 });
    }

    const inviteeEmail = payload.invitee?.email;
    const inviteeName = payload.invitee?.name;
    const inviteePhone = payload.invitee?.phone_number;
    const startTime = payload.event?.start_time;
    const eventUri = payload.event?.uri;

    if (!inviteeEmail || !startTime || !eventUri) {
      console.error('❌ Missing required fields in webhook');
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    console.log('📅 Event details:', {
      email: inviteeEmail,
      name: inviteeName,
      startTime,
      eventUri,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Buscar lead_meetings con status='agendada' y email coincidente
    console.log('🔍 Searching for matching meeting with email:', inviteeEmail);
    const { data: meetings, error: searchError } = await supabase
      .from('lead_meetings')
      .select('id, lead_id, stage_id, invitee_email, start_time')
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'agendada');

    if (searchError) {
      console.error('❌ Search error:', searchError);
      throw searchError;
    }

    if (!meetings || meetings.length === 0) {
      console.warn('⚠️ No matching meeting found for email:', inviteeEmail);
      return NextResponse.json({ success: true, message: 'No matching meeting found' });
    }

    // Si hay múltiples coincidencias, usar la más cercana en fecha
    let targetMeeting = meetings[0];
    if (meetings.length > 1) {
      const startDate = new Date(startTime);
      targetMeeting = meetings.reduce((closest, current) => {
        const currentDiff = Math.abs(
          new Date(current.start_time).getTime() - startDate.getTime()
        );
        const closestDiff = Math.abs(
          new Date(closest.start_time).getTime() - startDate.getTime()
        );
        return currentDiff < closestDiff ? current : closest;
      });
    }

    console.log('✅ Found matching meeting:', targetMeeting.id);

    // Actualizar lead_meetings con calendly_uri
    const { error: updateError } = await supabase
      .from('lead_meetings')
      .update({
        calendly_uri: eventUri,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetMeeting.id);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log('✅ Meeting updated with calendly_uri');

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      meetingId: targetMeeting.id,
      calendlyUri: eventUri,
    });
  } catch (error) {
    console.error('🔥 Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
