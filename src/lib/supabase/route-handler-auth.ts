import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { cookies } from 'next/headers';

interface AuthResult {
  user?: User;
  error?: NextResponse;
}

// Verifica sesión + autorización (profiles.authorized) desde las cookies de
// una request de Route Handler. Reutilizado por los endpoints de leads que
// hacen de proxy a APIs externas (Google Places, enriquecimiento de email)
// para que nadie fuera del panel pueda quemar cuota pegándole directo a la ruta.
export async function requireAuthorizedUser(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<AuthResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Solo leemos la sesión en estas rutas, no necesitamos escribir cookies.
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('authorized')
    .eq('id', user.id)
    .single();

  if (!profile?.authorized) {
    return { error: NextResponse.json({ error: 'Usuario no autorizado.' }, { status: 403 }) };
  }

  return { user };
}
