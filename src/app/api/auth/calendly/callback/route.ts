/**
 * Calendly OAuth - Step 2: Exchange authorization code for access token
 * GET /api/auth/calendly/callback?code=...&state=...
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error from Calendly:', error, searchParams.get('error_description'));
    redirect('/dashboard/settings?calendly_error=' + error);
  }

  if (!code) {
    console.error('No authorization code received');
    redirect('/dashboard/settings?calendly_error=no_code');
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/calendly/callback`;
  const clientId = process.env.CALENDLY_OAUTH_CLIENT_ID;
  const clientSecret = process.env.CALENDLY_OAUTH_CLIENT_SECRET;

  console.log('OAuth callback received:', {
    code: code.substring(0, 10) + '...',
    redirectUri,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
  });

  if (!clientId || !clientSecret) {
    console.error('Missing OAuth credentials in env vars');
    redirect('/dashboard/settings?calendly_error=missing_credentials');
  }

  try {
    // Intercambiar código por token
    const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    console.log('Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', tokenResponse.status, errorData);
      redirect('/dashboard/settings?calendly_error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Token received successfully');

    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      redirect('/dashboard/settings?calendly_error=no_access_token');
    }

    // Obtener información del usuario (para email)
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let userEmail = 'unknown@calendly.com';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userEmail = userData.resource?.email || userData.resource?.name || userEmail;
      console.log('User email:', userEmail);
    }

    // Guardar token en una cookie temporal
    const cookieStore = await cookies();
    cookieStore.set('calendly_oauth_token', accessToken, {
      maxAge: 300, // 5 minutos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // También guardar el email
    cookieStore.set('calendly_user_email', userEmail, {
      maxAge: 300,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    console.log('OAuth flow completed successfully, redirecting to settings');
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw NEXT_REDIRECT to allow Next.js to handle it
    }
    console.error('OAuth callback error:', error instanceof Error ? error.message : String(error));
    redirect('/dashboard/settings?calendly_error=server_error');
  }

  // Redirigir al final (fuera del try-catch para evitar capturar NEXT_REDIRECT)
  redirect('/dashboard/settings?calendly_success=true');
}
