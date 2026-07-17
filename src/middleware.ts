import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Buscamos la cookie de nuestra simulación
  const hasSession = request.cookies.has('regoschol_session');
  const isLoginPage = request.nextUrl.pathname === '/login';

  // 1. Si NO tiene sesión y no está en el login, lo frenamos en el servidor
  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si SÍ tiene sesión e intenta ir al login, lo regresamos al panel
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si todo está en orden, lo dejamos pasar
  return NextResponse.next();
}

// Ojo: Esto le dice a Next.js que vigile TODO, excepto imágenes, estilos y favicons
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};