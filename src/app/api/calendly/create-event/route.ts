/**
 * POST /api/calendly/create-event
 * 1. Crea evento en Calendly usando API
 * 2. Guarda datos en lead_meetings con calendly_uri
 * 3. Guarda comentario en lead_attempt_notes
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper: decrypt token (matches middleware.ts encryption)
function decryptToken(encryptedToken: string, encryptionKey: string): string {
  const [iv, authTag, encryptedData] = encryptedToken.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf-8');
}

// Helper: create event in Calendly
async function createCalendlyEvent(
  calendlyUrl: string,
  accessToken: string,
  eventName: string,
  eventEmail: string,
  eventPhone: string,
  startTime: string,
  endTime: string
) {
  console.log('📅 Creating Calendly event...');

  try {
    // Get current user ID from Calendly API
    const meResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meResponse.ok) {
      throw new Error(`Calendly API error: ${meResponse.status}`);
    }

    const meData = await meResponse.json();
    const userId = meData.resource.uri;
    console.log('✅ Got Calendly user ID');

    // Create the scheduled event
    const createResponse = await fetch('https://api.calendly.com/scheduled_events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: calendlyUrl,
        invitees: [
          {
            name: eventName,
            email: eventEmail,
            phone_number: eventPhone,
          }
        ],
        start_time: startTime,
        end_time: endTime,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('❌ Calendly creation error:', errorData);
      throw new Error(`Failed to create Calendly event: ${errorData.message || 'Unknown error'}`);
    }

    const eventData = await createResponse.json();
    const eventUri = eventData.resource.uri;
    console.log('✅ Calendly event created:', eventUri);

    return eventUri;
  } catch (err) {
    console.error('❌ Calendly error:', err);
    throw err;
  }
}

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

    // Get Calendly token from user_integrations
    let calendlyUri: string | null = null;
    let calendlyError: string | null = null;

    try {
      const { data: integration, error: integError } = await supabase
        .from('user_integrations')
        .select('tokens, config')
        .eq('user_id', userId)
        .eq('provider', 'calendly')
        .eq('is_active', true)
        .single();

      if (integError || !integration) {
        console.warn('⚠️ Calendly integration not found or inactive');
        calendlyError = 'Calendly not configured';
      } else {
        const encryptedToken = integration.tokens?.access_token;
        const calendlyUrl = integration.config?.calendly_url;

        if (!encryptedToken || !calendlyUrl) {
          console.warn('⚠️ Missing Calendly token or URL');
          calendlyError = 'Calendly token or URL missing';
        } else {
          try {
            // Decrypt token
            const encryptionKey = process.env.ENCRYPTION_KEY;
            if (!encryptionKey) {
              throw new Error('ENCRYPTION_KEY not configured');
            }
            const accessToken = decryptToken(encryptedToken, encryptionKey);

            // Create event in Calendly
            calendlyUri = await createCalendlyEvent(
              calendlyUrl,
              accessToken,
              inviteeName,
              inviteeEmail,
              inviteePhone,
              startTime,
              endTime
            );

            console.log('✅ Calendly event created:', calendlyUri);
          } catch (err) {
            console.warn('⚠️ Calendly creation failed:', err instanceof Error ? err.message : 'Unknown');
            calendlyError = err instanceof Error ? err.message : 'Failed to create Calendly event';
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Error getting Calendly config:', err);
      calendlyError = 'Could not access Calendly config';
    }

    // GUARDAR EN BD: lead_meetings
    // INSERT directo para permitir MÚLTIPLES reuniones por lead+stage
    console.log('📝 Guardando en lead_meetings...');
    const { data: meetingData, error: meetingErr } = await supabase
      .from('lead_meetings')
      .insert({
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
        calendly_uri: calendlyUri,
      })
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
        stage_clave: stageClave,
        stage_titulo: stageTitulo,
        attempt_number: 1,
        note_type: 'success',
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
      message: 'Reunión guardada en BD' + (calendlyUri ? ' y en Calendly' : ''),
      calendlyUri,
      calendlyError,
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
