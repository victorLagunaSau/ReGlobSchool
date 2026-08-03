/**
 * POST /api/calendly/create-event
 * Solo guarda datos de reunión en BD (lead_meetings + comentarios)
 * No crea eventos en Calendly ni Zoom (hacer después)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📅 Request body:', JSON.stringify(body));

    const { leadId, stageId, startTime, inviteeName, inviteeEmail, inviteePhone, stageTitulo } = body;

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

    // Get stage info (numero y clave)
    const { data: stageData, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('orden, clave')
      .eq('id', stageId)
      .single();

    if (stageError || !stageData) {
      console.error('⚠️ Stage not found:', stageId, stageError);
    }

    const stageNumero = stageData?.orden || null;
    const stageClave = stageData?.clave || null;
    console.log('📊 Stage info - Número:', stageNumero, '| Clave:', stageClave);

    // Calculate end time (30 minutes after start)
    const startDate = new Date(startTime);
    startDate.setMinutes(startDate.getMinutes() + 30);
    const endTime = startDate.toISOString();
    console.log('📅 Start time:', startTime, '| End time:', endTime);

    // GUARDAR EN BD: lead_meetings
    console.log('📝 Guardando en lead_meetings...');
    const { data: meetingData, error: meetingErr } = await supabase
      .from('lead_meetings')
      .upsert(
        {
          lead_id: leadId,
          stage_id: stageId,
          stage_numero: stageNumero,
          stage_clave: stageClave,
          user_id: userId,
          event_type: 'Meeting',
          invitee_name: inviteeName,
          invitee_email: inviteeEmail,
          invitee_phone: inviteePhone,
          start_time: startTime,
          end_time: endTime,
          status: 'agendada',
        },
        { onConflict: 'lead_id,stage_id' }
      )
      .select('id')
      .single();

    if (meetingErr) {
      console.error('❌ Meeting save error:', meetingErr);
      return NextResponse.json(
        { error: `Failed to save meeting: ${meetingErr.message}` },
        { status: 500 }
      );
    }

    const meetingId = meetingData.id;
    console.log('✅ Meeting saved:', meetingId);

    // GUARDAR COMENTARIO: formato "Reunión agendada - Etapa 3 - Nombre (email, phone) - timestamp"
    const noteText = `Reunión agendada - Etapa ${stageNumero} - ${inviteeName} (${inviteeEmail}, ${inviteePhone}) - ${startTime}`;

    const { error: noteErr } = await supabase
      .from('lead_attempt_notes')
      .insert({
        lead_id: leadId,
        stage_id: stageId,
        note_type: 'reunion_agendada',
        note_text: noteText,
      });

    if (noteErr) {
      console.warn('⚠️ Note save warning:', noteErr);
    } else {
      console.log('✅ Comment saved');
    }

    return NextResponse.json({
      success: true,
      meetingId,
      message: 'Reunión guardada en BD',
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
