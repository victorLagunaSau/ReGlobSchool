/**
 * GET /api/calendly/availability
 * Retorna horarios disponibles REALES desde Calendly API
 * Query params: ?days=14 (default)
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

    // Obtener integración de Calendly
    const { data: integration, error: integError } = await supabase
      .from('user_integrations')
      .select('tokens, config')
      .eq('user_id', userId)
      .eq('provider', 'calendly')
      .eq('is_active', true)
      .single();

    if (integError || !integration) {
      console.warn('⚠️ Calendly integration not found');
      return NextResponse.json({ error: 'Calendly not configured' }, { status: 400 });
    }

    const encryptedToken = integration.tokens?.access_token;
    if (!encryptedToken) {
      return NextResponse.json({ error: 'Calendly token missing' }, { status: 400 });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const accessToken = decryptToken(encryptedToken, encryptionKey);

    // 1. Obtener user_id de Calendly
    const meResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meResponse.ok) {
      throw new Error('Failed to get Calendly user');
    }

    const meData = await meResponse.json();
    const calendlyUserId = meData.resource.uri; // ej: https://api.calendly.com/users/123abc

    console.log('✅ Got Calendly user:', calendlyUserId);

    // 2. Obtener event_types del usuario
    const eventTypesResponse = await fetch(`https://api.calendly.com/users/${calendlyUserId}/event_types`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!eventTypesResponse.ok) {
      const errorText = await eventTypesResponse.text();
      console.error('Calendly event_types error:', {
        status: eventTypesResponse.status,
        statusText: eventTypesResponse.statusText,
        body: errorText,
      });
      throw new Error(`Calendly API error (${eventTypesResponse.status}): ${errorText}`);
    }

    const eventTypesData = await eventTypesResponse.json();
    const eventTypes = eventTypesData.collection || [];

    if (eventTypes.length === 0) {
      console.warn('⚠️ No event types found');
      return NextResponse.json({ error: 'No event types configured in Calendly' }, { status: 400 });
    }

    // Usar el primer event type activo
    const eventType = eventTypes.find((et: any) => et.active !== false);
    if (!eventType) {
      return NextResponse.json({ error: 'No active event types' }, { status: 400 });
    }

    console.log('✅ Using event type:', eventType.uri);

    // 3. Obtener available_times para los próximos N días
    const days = parseInt(req.nextUrl.searchParams.get('days') || '14');
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const params = new URLSearchParams({
      ascending: 'true',
      sort: 'start_time',
      max_results: '100',
    });

    const availableTimesResponse = await fetch(
      `https://api.calendly.com/event_types/${eventType.uri.split('/').pop()}/available_times?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!availableTimesResponse.ok) {
      const errorText = await availableTimesResponse.text();
      console.error('❌ Available times error:', availableTimesResponse.status, errorText);
      throw new Error('Failed to get available times');
    }

    const availableTimesData = await availableTimesResponse.json();
    const availableTimes = availableTimesData.collection || [];

    // Agrupar por fecha
    const availability: Record<string, string[]> = {};
    availableTimes.forEach((slot: any) => {
      const dateTime = new Date(slot.start_time);
      const dateStr = dateTime.toISOString().split('T')[0];
      const timeStr = dateTime.toISOString().split('T')[1].substring(0, 5); // HH:MM

      if (!availability[dateStr]) {
        availability[dateStr] = [];
      }
      if (!availability[dateStr].includes(timeStr)) {
        availability[dateStr].push(timeStr);
      }
    });

    // Ordenar horas dentro de cada fecha
    Object.keys(availability).forEach((date) => {
      availability[date].sort();
    });

    console.log('✅ Availability loaded:', Object.keys(availability).length, 'dates');

    return NextResponse.json({
      success: true,
      availability,
      eventTypeUri: eventType.uri,
    });
  } catch (error) {
    console.error('🔥 Availability error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
