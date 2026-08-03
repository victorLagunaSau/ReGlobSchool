/**
 * POST /api/calendly/create-event
 * Creates event and saves to BD
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📅 Request body:', JSON.stringify(body));

    const { leadId, stageId, startTime, inviteeName, inviteeEmail, inviteePhone } = body;

    if (!leadId || !stageId || !startTime || !inviteeName || !inviteeEmail) {
      console.error('❌ Missing fields:', { leadId, stageId, startTime, inviteeName, inviteeEmail });
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missing: {
            leadId: !leadId,
            stageId: !stageId,
            startTime: !startTime,
            inviteeName: !inviteeName,
            inviteeEmail: !inviteeEmail,
          }
        },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization header');
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token received:', token.substring(0, 20) + '...');

    // Decode JWT to extract userId
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      userId = decoded.sub;
      if (!userId) {
        throw new Error('No user ID in token');
      }
      console.log('✅ User authenticated:', userId);
    } catch (e) {
      console.error('❌ Token decode error:', e instanceof Error ? e.message : 'Unknown');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            authorization: authHeader,
          }
        }
      }
    );

    // Verify user exists in Supabase
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, authorized')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ User not found in DB:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User found in DB:', user.full_name);

    // Validate lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, business_name')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ Lead not found:', leadId, leadError);
      return NextResponse.json(
        { error: `Lead not found: ${leadId}` },
        { status: 404 }
      );
    }

    console.log('✅ Lead found:', lead.business_name);

    // Calculate end time (30 minutes after start)
    const startDate = new Date(startTime);
    startDate.setMinutes(startDate.getMinutes() + 30);
    const endTime = startDate.toISOString().replace('Z', '');
    console.log('📅 Start time:', startTime, '| End time:', endTime);

    let eventUri = `https://calendly.com/meeting/${leadId}/${Date.now()}`;

    // STEP 1: Save to BD first
    // Intenta actualizar reunión existente para este lead+stage
    const { data: updateData, error: updateErr } = await supabase
      .from('lead_meetings')
      .update({
        event_type: 'Meeting',
        start_time: startTime,
        end_time: endTime,
        invitee_name: inviteeName,
        invitee_email: inviteeEmail,
        invitee_phone: inviteePhone,
        calendly_uri: eventUri,
        status: 'agendada',
      })
      .eq('lead_id', leadId)
      .eq('stage_id', stageId)
      .select('id')
      .single();

    let meetingId: string;

    if (updateErr?.code === 'PGRST116') {
      console.log('📝 No meeting found, inserting...');
      const { data: insertData, error: insertErr } = await supabase
        .from('lead_meetings')
        .insert({
          lead_id: leadId,
          stage_id: stageId,
          user_id: userId,
          event_type: 'Meeting',
          start_time: startTime,
          end_time: endTime,
          invitee_name: inviteeName,
          invitee_email: inviteeEmail,
          invitee_phone: inviteePhone,
          calendly_uri: eventUri,
          status: 'agendada',
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('❌ Insert error:', insertErr);
        return NextResponse.json(
          { error: `Failed to insert meeting: ${insertErr.message}` },
          { status: 500 }
        );
      }
      meetingId = insertData!.id;
      console.log('✅ Meeting inserted:', meetingId);
    } else if (updateErr) {
      console.error('❌ Update error:', updateErr);
      return NextResponse.json(
        { error: `Failed to save meeting: ${updateErr.message}` },
        { status: 500 }
      );
    } else {
      meetingId = updateData!.id;
      console.log('✅ Meeting updated:', meetingId);
    }

    // Save attempt note
    const { error: noteErr } = await supabase
      .from('lead_attempt_notes')
      .insert({
        lead_id: leadId,
        stage_clave: '103',
        stage_titulo: 'Reunión de Demostración',
        attempt_number: 1,
        note_type: 'success',
        note_text: `Reunión agendada - ${inviteeName} (${inviteeEmail}, ${inviteePhone}) - ${startTime}`,
      });

    if (noteErr) {
      console.warn('⚠️ Note insert warning:', noteErr);
    } else {
      console.log('✅ Note saved');
    }

    // STEP 2: Try to create event in real Calendly (optional, doesn't block if fails)
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token, integration_type')
      .eq('user_id', userId)
      .eq('integration_type', 'calendly')
      .single();

    if (integration?.access_token) {
      console.log('✅ Calendly integration found, attempting real event creation');

      try {
        const calendlyToken = integration.access_token;

        // Get user's calendar
        const userRes = await fetch('https://api.calendly.com/users/me', {
          headers: { 'Authorization': `Bearer ${calendlyToken}` }
        });

        if (!userRes.ok) throw new Error('Failed to get Calendly user');

        const userData = await userRes.json();
        const calendlyUserId = userData.resource.uri.split('/').pop();

        // Get first event type
        const eventTypesRes = await fetch(`https://api.calendly.com/users/${calendlyUserId}/event_types`, {
          headers: { 'Authorization': `Bearer ${calendlyToken}` }
        });

        if (!eventTypesRes.ok) throw new Error('Failed to get event types');

        const eventTypesData = await eventTypesRes.json();
        if (eventTypesData.collection && eventTypesData.collection.length > 0) {
          const eventTypeUri = eventTypesData.collection[0].uri;

          // Create scheduled event in Calendly
          const eventRes = await fetch('https://api.calendly.com/scheduled_events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${calendlyToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_type: eventTypeUri,
              invitees: [{ name: inviteeName, email: inviteeEmail, phone_number: inviteePhone }],
              start_time: startTime,
              end_time: endTime,
              notes: `Cliente: ${inviteeName}\nTeléfono: ${inviteePhone}`
            })
          });

          if (eventRes.ok) {
            const eventData = await eventRes.json();
            eventUri = eventData.resource.calendar_event_uri;
            console.log('✅ Event created in Calendly:', eventUri);

            // Update meeting with real Calendly URI
            await supabase
              .from('lead_meetings')
              .update({ calendly_uri: eventUri })
              .eq('id', meetingId);
          } else {
            const errData = await eventRes.json();
            console.warn('⚠️ Calendly event creation failed:', errData);
          }
        }
      } catch (calendlyErr) {
        console.warn('⚠️ Calendly API error:', calendlyErr instanceof Error ? calendlyErr.message : 'Unknown');
      }
    } else {
      console.warn('⚠️ No Calendly integration found');
    }

    return NextResponse.json({
      success: true,
      eventUri,
      meetingId,
      message: 'Reunión agendada correctamente',
    });
  } catch (error) {
    console.error('🔥 Catch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Server error',
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}
