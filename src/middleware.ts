import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('regoschol_session');
  const { pathname } = request.nextUrl;

  // Definimos qué rutas son públicas (Landing y Login)
  const isRootPage = pathname === '/';
  const isLoginPage = pathname === '/login';

  // 1. Si NO tiene sesión y está intentando entrar al panel administrativo (/dashboard)
  if (!hasSession && pathname.startsWith('/dashboard')) {
    // Lo mandamos a la Landing pública en lugar del Login directo
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Si SÍ tiene sesión e intenta ir a la Landing o al Login
  if (hasSession && (isRootPage || isLoginPage)) {
    // Lo redirigimos directo a su espacio de trabajo
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Protege el dashboard y las páginas base, ignorando assets estáticos
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*'
  ],
};