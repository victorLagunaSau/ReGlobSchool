import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Definimos qué rutas son públicas (Landing y Login)
  const isRootPage = pathname === '/';
  const isLoginPage = pathname === '/login';

  // 1. Si NO tiene sesión y está intentando entrar al panel administrativo (/dashboard)
  if (!user && pathname.startsWith('/dashboard')) {
    // Lo mandamos a la Landing pública en lugar del Login directo
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Si SÍ tiene sesión e intenta ir a la Landing o al Login
  if (user && (isRootPage || isLoginPage)) {
    // Lo redirigimos directo a su espacio de trabajo
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Protege el dashboard y las páginas base, ignorando assets estáticos
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*'
  ],
};
