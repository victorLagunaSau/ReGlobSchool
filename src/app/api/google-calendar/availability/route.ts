/**
 * GET /api/google-calendar/availability
 * Retorna horarios disponibles REALES desde Google Calendar
 * Query params: ?days=30 (default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      userId = decoded.sub;
      if (!userId) throw new Error('No user ID in token');
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { authorization: authHeader } } }
    );

    // Obtener integración de Google Calendar
    const { data: integration, error: integError } = await supabase
      .from('user_integrations')
      .select('tokens, config')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .eq('is_active', true)
      .single();

    if (integError || !integration) {
      console.warn('⚠️ Google Calendar integration not found');
      return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 });
    }

    const encryptedToken = integration.tokens?.access_token;
    const encryptedRefreshToken = integration.tokens?.refresh_token;
    if (!encryptedToken) {
      return NextResponse.json({ error: 'Google Calendar token missing' }, { status: 400 });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let accessToken = decryptToken(encryptedToken, encryptionKey);

    // Calcular rango de fechas (próximos N días) en CDMX (UTC-6 o UTC-5 en horario de verano)
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    // Crear fecha en CDMX
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const nowInCDMX = new Date();
    const partsInitial = formatter.formatToParts(nowInCDMX);
    const year = parseInt(partsInitial.find(p => p.type === 'year')!.value);
    const month = parseInt(partsInitial.find(p => p.type === 'month')!.value) - 1;
    const day = parseInt(partsInitial.find(p => p.type === 'day')!.value);

    const startDate = new Date(year, month, day, 8, 0, 0, 0); // 8 AM CDMX

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(17, 0, 0, 0); // 5 PM CDMX

    let eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '100',
        }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (eventsResponse.status === 401 && encryptedRefreshToken) {
      const refreshToken = decryptToken(encryptedRefreshToken, encryptionKey);
      try {
        accessToken = await refreshGoogleToken(refreshToken, supabase, userId, encryptionKey);
        eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            new URLSearchParams({
              timeMin: startDate.toISOString(),
              timeMax: endDate.toISOString(),
              singleEvents: 'true',
              orderBy: 'startTime',
              maxResults: '100',
            }).toString(),
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Google Calendar session expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }

    if (!eventsResponse.ok) {
      throw new Error(`Google Calendar API error (${eventsResponse.status})`);
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.items || [];

    // Helper: Convertir tiempo a CDMX local
    const formatToCDMXLocal = (date: Date): { dateStr: string; timeStr: string } => {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = fmt.formatToParts(date);
      const year = parts.find(p => p.type === 'year')!.value;
      const month = parts.find(p => p.type === 'month')!.value;
      const day = parts.find(p => p.type === 'day')!.value;
      const hour = parts.find(p => p.type === 'hour')!.value;
      const minute = parts.find(p => p.type === 'minute')!.value;
      return {
        dateStr: `${year}-${month}-${day}`,
        timeStr: `${hour}:${minute}`
      };
    };

    // Crear set de horarios ocupados
    const occupiedSlots = new Set<string>();

    // 1. Agregar eventos de Google Calendar - CONVERTIR A CDMX LOCAL
    events.forEach((event: any) => {
      if (event.start?.dateTime && event.end?.dateTime) {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        let current = new Date(eventStart);
        while (current < eventEnd) {
          const { dateStr, timeStr } = formatToCDMXLocal(current);
          occupiedSlots.add(`${dateStr}T${timeStr}`);
          current.setMinutes(current.getMinutes() + 30);
        }
      }
    });

    // 2. Agregar reuniones agendadas en BD - CONVERTIR A CDMX LOCAL
    const { data: meetings, error: meetingsErr } = await supabase
      .from('lead_meetings')
      .select('start_time, end_time')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    if (!meetingsErr && meetings) {
      meetings.forEach((meeting: any) => {
        const meetStart = new Date(meeting.start_time);
        const meetEnd = new Date(meeting.end_time);

        let current = new Date(meetStart);
        while (current < meetEnd) {
          const { dateStr, timeStr } = formatToCDMXLocal(current);
          occupiedSlots.add(`${dateStr}T${timeStr}`);
          current.setMinutes(current.getMinutes() + 30);
        }
      });
    }

    // Generar disponibilidad: L-V, 9-17, cada 30 minutos en CDMX
    const availability: Record<string, string[]> = {};

    let current = new Date(startDate);
    while (current < endDate) {
      // Obtener día de la semana en CDMX
      const formatter2 = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const partsForDay = formatter2.formatToParts(current);
      const dayOfWeekStr = partsForDay.find(p => p.type === 'weekday')!.value;
      const hourStr = partsForDay.find(p => p.type === 'hour')!.value;
      const minuteStr = partsForDay.find(p => p.type === 'minute')!.value;
      const yearStr = partsForDay.find(p => p.type === 'year')!.value;
      const monthStr = partsForDay.find(p => p.type === 'month')!.value;
      const dayStr = partsForDay.find(p => p.type === 'day')!.value;

      const dayOfWeekMap: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
      const dayOfWeek = dayOfWeekMap[dayOfWeekStr] || 0;
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      // Lunes (1) a Viernes (5), 8 AM a 4:59 PM
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 17) {
        const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
        const timeStr = `${hourStr}:${minuteStr}`;
        const slotId = `${dateStr}T${timeStr}`;

        // Si no está ocupado, agregarlo a disponibilidad
        if (!occupiedSlots.has(slotId)) {
          if (!availability[dateStr]) {
            availability[dateStr] = [];
          }
          if (!availability[dateStr].includes(timeStr)) {
            availability[dateStr].push(timeStr);
          }
        }
      }

      current.setMinutes(current.getMinutes() + 30);
    }

    // Ordenar horas dentro de cada fecha
    Object.keys(availability).forEach((date) => {
      availability[date].sort();
    });

    return NextResponse.json({
      success: true,
      availability,
      eventsCount: events.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
