/**
 * GET /api/calendly/availability
 * Retorna horarios disponibles (MVP: hardcodeado)
 * Solo días laborales (lunes-viernes), solo futuro
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const availability: Record<string, string[]> = {};

    // Get today's date in YYYY-MM-DD format (user's timezone)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayDate = new Date(todayStr + 'T00:00:00Z');

    // Generate next 30 days (skip weekends)
    for (let i = 1; i <= 30; i++) {
      const d = new Date(todayDate);
      d.setUTCDate(d.getUTCDate() + i);

      const dayOfWeek = d.getUTCDay();
      // Skip weekends: 0 = domingo, 6 = sábado
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(`⏭️ Skipping ${d.toISOString().split('T')[0]} (day ${dayOfWeek})`);
        continue;
      }

      const dateStr = d.toISOString().split('T')[0];
      const hours = [];

      // 9 AM - 6 PM, each 30 min
      for (let hour = 9; hour < 18; hour++) {
        for (let min of [0, 30]) {
          const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          hours.push(timeStr);
        }
      }

      if (hours.length > 0) {
        availability[dateStr] = hours;
        console.log(`✅ Added ${dateStr} (day ${dayOfWeek})`);
      }
    }

    console.log('📅 Availability:', Object.keys(availability).length, 'working days');

    return NextResponse.json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error('🔥 Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
