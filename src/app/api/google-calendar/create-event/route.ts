/**
 * POST /api/google-calendar/create-event
 * 1. Crea evento en Google Calendar del usuario
 * 2. Guarda datos en lead_meetings
 * 3. Guarda comentario en lead_attempt_notes
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

function encryptToken(token: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );
  let encrypted = cipher.update(token, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function refreshGoogleToken(
  refreshToken: string,
  supabase: any,
  userId: string,
  encryptionKey: string
): Promise<string> {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to refresh token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;

    if (!newAccessToken) {
      throw new Error('No access token in refresh response');
    }

    const encryptedNewToken = encryptToken(newAccessToken, encryptionKey);

    await supabase
      .from('user_integrations')
      .update({
        tokens: {
          access_token: encryptedNewToken,
          refresh_token: encryptToken(refreshToken, encryptionKey),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google_calendar');

    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { leadId, stageId, startTime, inviteeName, inviteeEmail, inviteePhone, stageTitulo } = body;

    if (!leadId || !stageId || !startTime || !inviteeName || !inviteeEmail) {
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
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

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
    } catch (e) {
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, business_name')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: `Lead not found: ${leadId}` },
        { status: 404 }
      );
    }

    // Get stage info (numero y clave)
    const { data: stageData, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('orden, clave')
      .eq('id', stageId)
      .single();

    if (stageError || !stageData) {
      // Stage not found, continue with null values
    }

    const stageNumero = stageData?.orden || null;
    const stageClave = stageData?.clave || null;

    // Convert CDMX local time to UTC for storage
    // startTime comes as "2026-08-04T16:00:00" (CDMX local, no timezone)
    // CDMX is UTC-6, so we need to ADD 6 hours to convert to UTC
    const convertCDMXtoUTC = (localTimeStr: string): string => {
      const [datePart, timePart] = localTimeStr.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      // Create date in UTC with the CDMX local time, then add 6 hours
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours + 6, minutes, seconds));
      return utcDate.toISOString();
    };

    const startTimeUTC = convertCDMXtoUTC(startTime);

    // Calculate end time (30 minutes after start)
    const startDate = new Date(startTimeUTC);
    startDate.setMinutes(startDate.getMinutes() + 30);
    const endTime = startDate.toISOString();

    // Get Google Calendar token and create event
    let googleEventId: string | null = null;
    let googleEventLink: string | null = null;
    let googleError: string | null = null;

    try {
      const { data: integration, error: integError } = await supabase
        .from('user_integrations')
        .select('tokens')
        .eq('user_id', userId)
        .eq('provider', 'google_calendar')
        .eq('is_active', true)
        .single();

      if (integError || !integration) {
        googleError = 'Google Calendar not configured';
      } else {
        const encryptedToken = integration.tokens?.access_token;
        const encryptedRefreshToken = integration.tokens?.refresh_token;
        if (!encryptedToken) {
          googleError = 'Google Calendar token missing';
        } else {
          const encryptionKey = process.env.ENCRYPTION_KEY;
          if (!encryptionKey) {
            googleError = 'Server configuration error';
          } else {
            let accessToken = decryptToken(encryptedToken, encryptionKey);

            const formatDateTimeLocal = (dateStr: string) => {
              return dateStr;
            };

            const startDateTime = formatDateTimeLocal(startTime);
            const endDateTime = formatDateTimeLocal(endTime);

            const eventPayload = {
              summary: `Reunión: ${inviteeName}`,
              description: `Cliente: ${inviteeName}\nEmail: ${inviteeEmail}\nTeléfono: ${inviteePhone}\nEtapa: ${stageTitulo}`,
              start: {
                dateTime: formatDateTimeLocal(startDateTime),
                timeZone: 'America/Mexico_City',
              },
              end: {
                dateTime: formatDateTimeLocal(endDateTime),
                timeZone: 'America/Mexico_City',
              },
              attendees: [
                {
                  email: inviteeEmail,
                  displayName: inviteeName,
                },
              ],
              reminders: {
                useDefault: true,
              },
            };

            const payloadJson = JSON.stringify(eventPayload);

            let createEventResponse = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: payloadJson,
              }
            );

            if (createEventResponse.status === 401 && encryptedRefreshToken) {
              const refreshToken = decryptToken(encryptedRefreshToken, encryptionKey);
              try {
                accessToken = await refreshGoogleToken(refreshToken, supabase, userId, encryptionKey);
                createEventResponse = await fetch(
                  'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: payloadJson,
                  }
                );
              } catch (refreshError) {
                googleError = 'Google Calendar session expired. Please reconnect your account.';
              }
            }

            if (!createEventResponse.ok && !googleError) {
              const errorData = await createEventResponse.text();
              googleError = `Google Calendar error: ${createEventResponse.status}`;
            } else if (createEventResponse.ok) {
              const eventData = await createEventResponse.json();
              googleEventId = eventData.id;
              googleEventLink = eventData.htmlLink;
            }
          }
        }
      }
    } catch (err) {
      googleError = 'Error creating Google Calendar event';
    }

    // GUARDAR EN BD: lead_meetings (usar timestamps UTC)
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
        start_time: startTimeUTC,
        end_time: endTime,
        status: 'agendada',
        calendly_uri: googleEventId, // Usar el mismo campo para Google Calendar event ID
      })
      .select('id')
      .single();

    if (meetingErr) {
      return NextResponse.json(
        { error: `Failed to save meeting: ${meetingErr.message}` },
        { status: 500 }
      );
    }

    const meetingId = meetingData.id;

    // GUARDAR COMENTARIO: formato "Reunión agendada - Etapa 3 - Nombre (email, phone) - timestamp"
    const noteText = `Reunión agendada - Etapa ${stageNumero} - ${inviteeName} (${inviteeEmail}, ${inviteePhone}) - ${startTime}`;

    await supabase
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

    return NextResponse.json({
      success: true,
      meetingId,
      message: 'Reunión guardada en BD y Google Calendar',
      googleEventId,
      googleEventLink,
      googleError,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Server error',
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}
