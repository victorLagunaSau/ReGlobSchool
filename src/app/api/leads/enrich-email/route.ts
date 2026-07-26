import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuthorizedUser } from '../../../../lib/supabase/route-handler-auth';

// Google Places no expone correo de contacto (solo teléfono/sitio web), así
// que lo obtenemos con un "best effort": bajamos el HTML del sitio del
// negocio y buscamos un mailto: o un patrón de correo visible. Se llama
// on-demand por resultado (no automático para los 20 resultados de golpe)
// para no gastar tiempo/ancho de banda en negocios que no interesan.

const MAILTO_RE = /href=["']mailto:([^"'?]+)/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IGNORED_DOMAINS = ['sentry.io', 'wixpress.com', 'schema.org', 'w3.org', 'example.com', 'godaddy.com'];
// Placeholders típicos de plantillas web (constructores de sitios que dejan
// un correo de ejemplo sin reemplazar) — no son el correo real del negocio.
const PLACEHOLDER_LOCAL_PARTS = ['ejemplo', 'example', 'test', 'tuemail', 'youremail', 'correo', 'email', 'info@example', 'nombre'];

function isPlaceholder(email: string): boolean {
  const localPart = email.split('@')[0]?.toLowerCase() || '';
  return PLACEHOLDER_LOCAL_PARTS.includes(localPart) || IGNORED_DOMAINS.some((domain) => email.toLowerCase().endsWith(domain));
}

function extractEmail(html: string): string | null {
  const mailtoMatch = html.match(MAILTO_RE);
  if (mailtoMatch) {
    const email = decodeURIComponent(mailtoMatch[1]).trim();
    if (!isPlaceholder(email)) return email;
  }

  const matches = html.match(EMAIL_RE) || [];
  const valid = matches.find((email) => !isPlaceholder(email));
  return valid || null;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await requireAuthorizedUser(cookieStore);
  if (auth.error) return auth.error;

  let body: { website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const website = body.website?.trim();
  if (!website) {
    return NextResponse.json({ error: 'Falta website.' }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(website);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocolo inválido');
  } catch {
    return NextResponse.json({ error: 'URL de sitio web inválida.' }, { status: 400 });
  }

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReGlobSchoolBot/1.0)' },
    });

    if (!res.ok) {
      return NextResponse.json({ email: null });
    }

    const html = await res.text();
    return NextResponse.json({ email: extractEmail(html) });
  } catch (error) {
    console.error('Error al rastrear sitio web para correo:', error);
    return NextResponse.json({ email: null });
  }
}
