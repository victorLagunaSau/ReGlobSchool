interface StateRow {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  city: string;
  state_id: string;
}

export interface AddressMatch {
  stateId: string | null;
  stateName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  isExactMatch: boolean;
}

/**
 * Busca exactamente estado y zona en una dirección.
 * Sin tolerancia: solo coincidencia exacta (mayúsculas insensible, límites de palabra).
 * Prioriza estados más específicos (por longitud de nombre) para evitar falsos positivos.
 */
export function matchAddressToLocation(
  address: string,
  states: StateRow[],
  zones: Zone[]
): AddressMatch {
  const result: AddressMatch = {
    stateId: null,
    stateName: null,
    zoneId: null,
    zoneName: null,
    isExactMatch: false,
  };

  if (!address || !address.trim()) return result;

  // Normalizar dirección para búsqueda (minúsculas, trim)
  const normalizedAddress = address.toLowerCase().trim();

  // Helper: buscar palabra completa en texto
  const hasWholeWord = (text: string, word: string): boolean => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  };

  // Mapa de abreviaturas de estados (comunes en direcciones mexicanas)
  const stateAbbreviations: Record<string, string> = {
    'tamps': 'Tamaulipas',
    'tam': 'Tamaulipas',
    'chh': 'Chihuahua',
    'chi': 'Chihuahua',
    'son': 'Sonora',
    'bcs': 'Baja California Sur',
    'gto': 'Guanajuato',
    'jal': 'Jalisco',
    'mex': 'México',
    'cdmx': 'Ciudad de México',
    'ver': 'Veracruz de Ignacio de la Llave',
    'pue': 'Puebla',
    'mor': 'Morelos',
  };

  // Buscar primero por abreviaturas (son más precisas)
  for (const [abbr, stateName] of Object.entries(stateAbbreviations)) {
    if (hasWholeWord(normalizedAddress, abbr)) {
      const foundState = states.find((s) => s.name === stateName);
      if (foundState) {
        result.stateId = foundState.id;
        result.stateName = foundState.name;
        break;
      }
    }
  }

  // Si no encontró por abreviatura, buscar por nombre completo
  // Ordenar por longitud del nombre (más largo primero) para evitar coincidencias parciales
  if (!result.stateId) {
    const sortedStates = [...states].sort((a, b) => b.name.length - a.name.length);

    for (const state of sortedStates) {
      if (hasWholeWord(normalizedAddress, state.name.toLowerCase())) {
        // Evitar "México" (país) si ya encontramos "Tamps" u otra abreviatura
        // Por seguridad, excluir "México" si hay abreviaturas detectadas previamente
        result.stateId = state.id;
        result.stateName = state.name;
        break;
      }
    }
  }

  // Buscar zona: solo en zonas del estado encontrado
  if (result.stateId) {
    const zonesInState = zones.filter((z) => z.state_id === result.stateId);
    // Ordenar por longitud del nombre (más largo primero)
    const sortedZones = [...zonesInState].sort((a, b) => b.city.length - a.city.length);

    for (const zone of sortedZones) {
      if (hasWholeWord(normalizedAddress, zone.city.toLowerCase())) {
        result.zoneId = zone.id;
        result.zoneName = zone.city;
        result.isExactMatch = true; // Encontramos ambos
        break;
      }
    }
  }

  return result;
}
