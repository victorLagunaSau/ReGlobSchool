/**
 * GET /api/auth/google/callback
 * Recibe authorization code de Google y lo intercambia por access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

export async function GET(req: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const baseUrl = new URL(appUrl);

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    // Verificar CSRF state
    const cookieState = req.cookies.get('google_oauth_state')?.value;
    if (!state || !cookieState || state !== cookieState) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('CSRF validation failed'), baseUrl)
      );
    }

    if (error) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent(error), baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('No authorization code'), baseUrl)
      );
    }

    // Intercambiar código por token
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('Server configuration error'), baseUrl)
      );
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('Token exchange failed'), baseUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('No access token received'), baseUrl)
      );
    }

    // Obtener info del usuario (email, nombre)
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.text();
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('Failed to get user info'), baseUrl)
      );
    }

    const userInfo = await userInfoResponse.json();

    // Obtener userId de la cookie (lo guardó el authorize endpoint)
    const userId = req.cookies.get('google_oauth_user_id')?.value;

    if (!userId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('Session expired. Please try again.'), baseUrl)
      );
    }

    // Guardar en BD
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=' + encodeURIComponent('Server configuration error'), baseUrl)
      );
    }

    const encryptedToken = encryptToken(accessToken, encryptionKey);
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken, encryptionKey) : null;

    // Obtener token de Supabase de la cookie para autenticarse
    const supabaseToken = req.cookies.get('google_oauth_token')?.value;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            authorization: supabaseToken ? `Bearer ${supabaseToken}` : '',
          }
        }
      }
    );

    // Verificar si existe la integración
    const { data: existing, error: existingError } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .single();

    if (existing) {
      // Actualizar
      const { error: updateError } = await supabase
        .from('user_integrations')
        .update({
          account_email: userInfo.email,
          tokens: {
            access_token: encryptedToken,
            refresh_token: encryptedRefreshToken,
          },
          config: {
            oauth: true,
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.redirect(
          new URL('/dashboard/settings?google_error=' + encodeURIComponent('Database update failed'), baseUrl)
        );
      }
    } else {
      // Crear nueva
      const { error: insertError } = await supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          provider: 'google_calendar',
          account_email: userInfo.email,
          tokens: {
            access_token: encryptedToken,
            refresh_token: encryptedRefreshToken,
          },
          config: {
            oauth: true,
          },
          is_active: true,
        });

      if (insertError) {
        return NextResponse.redirect(
          new URL('/dashboard/settings?google_error=' + encodeURIComponent('Database insert failed'), baseUrl)
        );
      }
    }

    // Limpiar cookies de state, userId y token
    const response = NextResponse.redirect(new URL('/dashboard/settings?google_success=true', baseUrl));
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_oauth_user_id');
    response.cookies.delete('google_oauth_token');

    return response;
  } catch (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL('/dashboard/settings?google_error=' + encodeURIComponent('Server error'), new URL(appUrl))
    );
  }
}
