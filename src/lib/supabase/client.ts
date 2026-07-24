import { createBrowserClient } from '@supabase/ssr';

// Cliente para componentes de cliente ('use client'). Usa la anon key y
// respeta Row Level Security. La sesión se guarda en cookies (no localStorage)
// para que el middleware pueda leerla en el servidor.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
