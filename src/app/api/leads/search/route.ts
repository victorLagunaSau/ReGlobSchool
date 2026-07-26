import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuthorizedUser } from '../../../../lib/supabase/route-handler-auth';

// Proxy autenticado a Google Places API (Text Search, la versión nueva).
// La API key NUNCA llega al navegador: este endpoint solo la usa del lado
// del servidor. No escribe nada en Supabase — es puramente una búsqueda en
// vivo, los resultados son efímeros hasta que el usuario decida convertir
// alguno en Lead desde el panel.
//
// Acepta varias ciudades (zonas) a la vez: se dispara una consulta a Google
// por cada una en paralelo y se combinan los resultados, deduplicados por
// place id (una misma cadena puede aparecer en dos zonas colindantes).

interface SearchRequestBody {
  query: string;
  cities: string[];
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

async function searchCity(query: string, city: string, stateName: string, apiKey: string) {
  const textQuery = `${query} en ${city}, ${stateName}, México`;

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
    console.error(`Error de Google Places API para "${city}":`, errorBody);
    return [];
  }

  const data: { places?: GooglePlace[] } = await googleRes.json();
  return data.places || [];
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await requireAuthorizedUser(cookieStore);
  if (auth.error) return auth.error;

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

  const { query, cities, stateName } = body;
  if (!query?.trim() || !Array.isArray(cities) || cities.length === 0 || !stateName?.trim()) {
    return NextResponse.json({ error: 'Faltan query, cities o stateName.' }, { status: 400 });
  }

  const perCityResults = await Promise.all(
    cities.map((city) => searchCity(query.trim(), city.trim(), stateName.trim(), apiKey))
  );

  const seen = new Set<string>();
  const merged: GooglePlace[] = [];
  for (const places of perCityResults) {
    for (const place of places) {
      const key = place.id || `${place.displayName?.text}-${place.formattedAddress}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(place);
    }
  }

  const results = merged
    .map((place) => ({
      id: place.id || crypto.randomUUID(),
      name: place.displayName?.text || 'Sin nombre',
      address: place.formattedAddress || null,
      phone: place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      types: place.types || [],
    }))
    // Priorizar resultados con website
    .sort((a, b) => {
      if (a.website && !b.website) return -1;
      if (!a.website && b.website) return 1;
      return 0;
    });

  return NextResponse.json({ results });
}
