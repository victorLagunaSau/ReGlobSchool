/**
 * GET /api/auth/google/authorize
 * Redirige a Google OAuth para obtener authorization code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId) {
      return NextResponse.json(
        { error: 'Google OAuth Client ID not configured' },
        { status: 500 }
      );
    }

    // Obtener userId del usuario actual - obtener del query parameter o header
    let token = req.nextUrl.searchParams.get('token');
    let userId: string | null = null;

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userId = decoded.sub || null;
        } catch (e) {
          // Could not decode auth token
        }
      }
    }

    if (!userId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(new URL('/dashboard/settings?google_error=' + encodeURIComponent('Not authenticated'), appUrl));
    }

    // Generar state para CSRF protection (incluye userId)
    const state = crypto.randomBytes(32).toString('hex');

    // Guardar state + userId en cookie (el callback lo verificará)
    const response = NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          state,
        }).toString()
    );

    // Guardar state en cookie segura
    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutos
    });

    // Guardar userId y token en cookies para el callback
    response.cookies.set('google_oauth_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutos
    });

    // Guardar token de Supabase para que el callback pueda autenticarse
    if (token) {
      response.cookies.set('google_oauth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutos
      });
    }

    return response;
  } catch (error) {
    console.error('🔥 Google authorize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
