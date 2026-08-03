/**
 * Guardar token OAuth de Calendly en user_integrations
 * POST /api/auth/calendly/save-token
 * Usa createServerClient para leer el user del contexto de Supabase
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('calendly_oauth_token')?.value;
    const userEmail = cookieStore.get('calendly_user_email')?.value;

    console.log('save-token: Checking for Calendly access token:', !!accessToken);

    if (!accessToken) {
      console.error('save-token: No Calendly access token in cookies');
      return NextResponse.json(
        { error: 'No Calendly access token found in cookies' },
        { status: 400 }
      );
    }

    // Crear Supabase client con cookies del usuario
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Obtener usuario autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error('save-token: Auth error or no user:', userError?.message);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log('save-token: Saving for user:', userId);

    // Guardar o actualizar integración
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'calendly',
          account_email: userEmail || 'unknown@calendly.com',
          config: { oauth: true },
          tokens: { access_token: accessToken },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('save-token: Upsert error:', upsertError);
      return NextResponse.json(
        { error: `Failed to save integration: ${upsertError.message}` },
        { status: 500 }
      );
    }

    console.log('save-token: Successfully saved integration');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('save-token error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
