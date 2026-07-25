import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Proxy autenticado a Google Places API (Text Search, la versión nueva).
// La API key NUNCA llega al navegador: este endpoint solo la usa del lado
// del servidor. No escribe nada en Supabase — es puramente una búsqueda en
// vivo, los resultados son efímeros hasta que el usuario decida convertir
// alguno en Lead desde el panel.

interface SearchRequestBody {
  query: string;
  city: string;
  stateName: string;
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No necesitamos escribir cookies en esta ruta: solo leemos la
          // sesión para validar acceso antes de consultar Google.
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('authorized')
    .eq('id', user.id)
    .single();

  if (!profile?.authorized) {
    return NextResponse.json({ error: 'Usuario no autorizado.' }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY no está configurada en el servidor.' }, { status: 500 });
  }

  let body: SearchRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { query, city, stateName } = body;
  if (!query?.trim() || !city?.trim() || !stateName?.trim()) {
    return NextResponse.json({ error: 'Faltan query, city o stateName.' }, { status: 400 });
  }

  const textQuery = `${query.trim()} en ${city.trim()}, ${stateName.trim()}, México`;

  const googleRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.location,places.types',
    },
    body: JSON.stringify({ textQuery, languageCode: 'es' }),
  });

  if (!googleRes.ok) {
    const errorBody = await googleRes.text();
    console.error('Error de Google Places API:', errorBody);
    return NextResponse.json({ error: 'Error al consultar Google Places API.' }, { status: 502 });
  }

  const data: { places?: GooglePlace[] } = await googleRes.json();

  const results = (data.places || []).map((place) => ({
    id: place.id || crypto.randomUUID(),
    name: place.displayName?.text || 'Sin nombre',
    address: place.formattedAddress || null,
    phone: place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    types: place.types || [],
  }));

  return NextResponse.json({ results });
}
