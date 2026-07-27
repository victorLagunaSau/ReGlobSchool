'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Search, MapPin, Phone, Globe, Mail, PlusCircle, Loader2, Map } from 'lucide-react';
import FormRegistrarLead, { type LeadInitialData } from '../components/FormRegistrarLead';
import MapZoneSelector from '../components/MapZoneSelector';
import ZoneSelector from '../components/ZoneSelector';
import ConfirmLocationModal from '../components/ConfirmLocationModal';
import { matchAddressToLocation } from '../../../../../lib/leads/address-matcher';
import type { Country, StateRow } from '../page';

interface ZoneWithStatus {
  id: string;
  country_id: string;
  state_id: string;
  city: string;
  assigned_to: string | null;
  cve_municipio?: number;
  cvegeo?: string;
  isLibre: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
  emailStatus: 'idle' | 'loading' | 'found' | 'not_found';
  email: string | null;
  isApt: boolean; // Tiene al menos teléfono o email
}

// Convención usada en todo el panel (MapView/StateMapView/dashboard/maps):
// assigned_to vacío o "libre" (sin distinguir mayúsculas) = zona sin ocupar.
function isZoneLibre(assignedTo: string | null): boolean {
  const val = (assignedTo || '').trim().toLowerCase();
  return val === '' || val === 'libre';
}

export default function LeadsSearchPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [zones, setZones] = useState<ZoneWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [selectedState, setSelectedState] = useState('');
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());
  const [zoneSearch, setZoneSearch] = useState('');
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [convertingResultId, setConvertingResultId] = useState<string | null>(null);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingInitialData, setPendingInitialData] = useState<LeadInitialData | null>(null);
  const [isConfirmLocationOpen, setIsConfirmLocationOpen] = useState(false);
  const [confirmLocationData, setConfirmLocationData] = useState<{ result: SearchResult; match: any } | null>(null);

  useEffect(() => {
    (async () => {
      const fetchAllZones = async () => {
        const pageSize = 1000;
        let allZones: any[] = [];
        let offset = 0;
        let pageNumber = 0;

        try {
          while (true) {
            pageNumber++;
            console.log(`📄 Fetching page ${pageNumber}: offset=${offset}, limit=${pageSize}`);

            const { data, error, count } = await supabase
              .from('zones')
              .select('id, country_id, state_id, city, assigned_to, cve_municipio, cvegeo', { count: 'exact' })
              .range(offset, offset + pageSize - 1);

            if (error) {
              console.error(`❌ Error página ${pageNumber}:`, error);
              break;
            }

            if (!data || data.length === 0) {
              console.log(`✅ Fin de datos en página ${pageNumber}`);
              break;
            }

            console.log(`✓ Página ${pageNumber}: ${data.length} registros. Total: ${allZones.length + data.length}/${count}`);
            allZones = allZones.concat(data);

            // Si obtuvimos menos registros que el page size, llegamos al final
            if (data.length < pageSize) {
              console.log(`✅ Última página completada. Total de zonas: ${allZones.length}`);
              break;
            }

            offset += pageSize;
          }
        } catch (error) {
          console.error('❌ Error en fetchAllZones:', error);
        }

        console.log(`📊 Zonas totales cargadas: ${allZones.length}`);
        return allZones;
      };

      const [countriesRes, statesRes, zonesData] = await Promise.all([
        supabase.from('countries').select('id, name').order('name'),
        supabase.from('states').select('id, country_id, cve_estado, name').order('name'),
        fetchAllZones(),
      ]);

      if (countriesRes.data) setCountries(countriesRes.data);
      if (statesRes.data) setStates(statesRes.data);
      if (zonesData && zonesData.length > 0) {
        const mappedZones = zonesData.map((z) => ({
          id: z.id,
          country_id: z.country_id,
          state_id: z.state_id,
          city: z.city,
          assigned_to: z.assigned_to,
          cve_municipio: z.cve_municipio,
          cvegeo: z.cvegeo,
          isLibre: isZoneLibre(z.assigned_to),
        }));
        console.log('✅ Mapeadas', mappedZones.length, 'zonas');
        setZones(mappedZones);
      } else {
        console.log('⚠️ Sin datos de zonas');
      }
      setLoading(false);
    })();
  }, []);

  // Ocupación por estado: % de zonas YA asignadas. Igual fórmula que
  // dashboard/maps/page.tsx (porcentajePresencia), para mantener consistencia
  // con el resto del panel.
  const stateOccupancy = useMemo(() => {
    const map: Record<string, { total: number; occupied: number }> = {};
    zones.forEach((z) => {
      if (!map[z.state_id]) map[z.state_id] = { total: 0, occupied: 0 };
      map[z.state_id].total++;
      if (!z.isLibre) map[z.state_id].occupied++;
    });
    return map;
  }, [zones]);

  // Estados disponibles: excluye los 100% ocupados (sin zonas libres que
  // buscar), ordenados por menor ocupación primero — ahí es donde hay más
  // oportunidad de encontrar territorio sin cubrir.
  const availableStates = useMemo(() => {
    return states
      .filter((s) => s.country_id === selectedCountry)
      .map((s) => {
        const occ = stateOccupancy[s.id];
        const percent = occ && occ.total > 0 ? Math.round((occ.occupied / occ.total) * 100) : 0;
        return { ...s, occupancyPercent: percent };
      })
      .filter((s) => s.occupancyPercent < 100)
      .sort((a, b) => a.occupancyPercent - b.occupancyPercent);
  }, [states, selectedCountry, stateOccupancy]);

  const allZonesForState = useMemo(() => {
    const term = zoneSearch.trim().toLowerCase();
    const stateZones = zones.filter((z) => z.state_id === selectedState);
    const filtered = stateZones.filter((z) => !term || z.city.toLowerCase().includes(term));

    // Separar libres y ocupadas
    const libres = filtered.filter((z) => z.isLibre).sort((a, b) => a.city.localeCompare(b.city));
    const ocupadas = filtered.filter((z) => !z.isLibre).sort((a, b) => a.city.localeCompare(b.city));

    return { libres, ocupadas };
  }, [zones, selectedState, zoneSearch]);

  const stateRow = states.find((s) => s.id === selectedState);

  const toggleZone = (zoneId: string) => {
    setSelectedZoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const handleMapZonesSelected = (selectedZones: Set<string>, stateId?: string) => {
    setSelectedZoneIds((prev) => new Set([...prev, ...selectedZones]));
    if (stateId) {
      setSelectedState(stateId);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    // Validar búsqueda
    if (!query.trim()) {
      setNotification({ type: 'error', message: 'Por favor ingresa un giro o rubro de búsqueda' });
      return;
    }

    if (query.trim().length === 0 || /^\s+$/.test(query)) {
      setNotification({ type: 'error', message: 'El campo de búsqueda no puede contener solo espacios' });
      return;
    }

    // Validar país
    if (!selectedCountry) {
      setNotification({ type: 'error', message: 'Por favor selecciona un país' });
      return;
    }

    // Validar estado
    if (!selectedState) {
      setNotification({ type: 'error', message: 'Por favor selecciona un estado' });
      return;
    }

    // Validar zonas
    if (selectedZoneIds.size === 0) {
      setNotification({ type: 'error', message: 'Por favor selecciona al menos una zona' });
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults(null);
    setHasSearched(true);

    try {
      const cities = Array.from(new Set(Array.from(selectedZoneIds).map((id) => zones.find((z) => z.id === id)?.city).filter(Boolean))) as string[];

      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), cities, stateName: stateRow?.name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar negocios.');

      // Procesar resultados: agregar emailStatus e email iniciales
      const processedResults = (data.results || []).map((r: Omit<SearchResult, 'emailStatus' | 'email' | 'isApt'>) => ({
        ...r,
        emailStatus: 'idle' as const,
        email: null,
        isApt: !!(r.phone || r.website), // Apto si tiene teléfono o website
      }));

      setResults(processedResults);
    } catch (error) {
      console.error('Error al buscar negocios:', error);
      setSearchError(error instanceof Error ? error.message : 'Error al buscar negocios.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchEmailForResult = useCallback(async (result: SearchResult) => {
    if (!result.website || result.emailStatus === 'loading' || result.emailStatus === 'found') return;

    setResults((prev) => prev && prev.map((r) => (r.id === result.id ? { ...r, emailStatus: 'loading' } : r)));

    try {
      const res = await fetch('/api/leads/enrich-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: result.website }),
      });
      const data = await res.json();
      setResults((prev) => prev && prev.map((r) => (r.id === result.id ? { ...r, emailStatus: data.email ? 'found' : 'not_found', email: data.email || null } : r)));
    } catch (error) {
      console.error('Error al buscar correo:', error);
      setResults((prev) => prev && prev.map((r) => (r.id === result.id ? { ...r, emailStatus: 'not_found' } : r)));
    }
  }, []);

  const convertingResult = results?.find((r) => r.id === convertingResultId) || null;

  const handleConvertClick = (result: SearchResult) => {
    // Hacer matching de ubicación basado en la dirección
    const match = matchAddressToLocation(
      result.address || '',
      states,
      zones.map((z) => ({ id: z.id, city: z.city, state_id: z.state_id }))
    );

    // Si encontró exactamente estado Y zona, rellenar directamente
    if (match.stateId && match.zoneId && match.isExactMatch) {
      const initialData: LeadInitialData = {
        business_name: result.name,
        business_type: query.trim(),
        phone: result.phone || '',
        email: result.email || '',
        address: result.address || '',
        website: result.website || '',
        country_id: selectedCountry,
        state_id: match.stateId,
        zone_id: match.zoneId,
      };
      setPendingInitialData(initialData);
      setConvertingResultId(result.id);
      if (result.website && result.emailStatus === 'idle') {
        fetchEmailForResult(result);
      }
    } else {
      // Mostrar modal de confirmación si falta estado o zona
      setConfirmLocationData({ result, match });
      setIsConfirmLocationOpen(true);
    }
  };

  const handleConfirmLocation = (stateId: string, zoneId: string) => {
    if (!confirmLocationData) return;

    const { result } = confirmLocationData;
    const initialData: LeadInitialData = {
      business_name: result.name,
      business_type: query.trim(),
      phone: result.phone || '',
      email: result.email || '',
      address: result.address || '',
      website: result.website || '',
      country_id: selectedCountry,
      state_id: stateId,
      zone_id: zoneId || undefined,
    };

    setPendingInitialData(initialData);
    setConvertingResultId(result.id);
    setIsConfirmLocationOpen(false);
    setConfirmLocationData(null);

    if (result.website && result.emailStatus === 'idle') {
      fetchEmailForResult(result);
    }
  };

  const initialDataForResult = (result: SearchResult): LeadInitialData => {
    // Si hay datos precargados, usarlos (fueron confirmados/matched)
    if (pendingInitialData) {
      return pendingInitialData;
    }
    // Si no, devolver datos básicos sin estado/zona
    return {
      business_name: result.name,
      business_type: query.trim(),
      phone: result.phone || '',
      email: result.email || '',
      address: result.address || '',
      website: result.website || '',
      country_id: selectedCountry,
      state_id: undefined,
      zone_id: undefined,
    };
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando...</div>;
  }

  const countryName = countries.find((c) => c.id === selectedCountry)?.name || '';
  const stateName = states.find((s) => s.id === selectedState)?.name || '';
  const selectedCities = Array.from(selectedZoneIds).map((id) => zones.find((z) => z.id === id)?.city).filter(Boolean);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Notificación Popup */}
      {notification && (
        <div className={`fixed top-4 right-4 max-w-md rounded-lg shadow-lg p-4 z-50 animate-fade-in ${
          notification.type === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`text-lg ${notification.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {notification.type === 'error' ? '⚠️' : '✓'}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${notification.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className={`text-lg font-bold ${notification.type === 'error' ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'}`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Formulario centrado (antes de buscar) o compacto (después de buscar) */}
      {!hasSearched ? (
        // VISTA INICIAL: Centrada, grande
        <div className="flex-1 flex flex-col items-center justify-start pt-16 px-4">
          {/* Título y descripción */}
          <div className="text-center mb-12 max-w-2xl">
            <h1 className="text-4xl font-light text-slate-950 mb-2">Buscar Negocios</h1>
            <p className="text-sm text-slate-600">Búsqueda en vivo vía Google Maps • Selecciona país, estado y zonas</p>
          </div>

          {/* Formulario centrado */}
          <form onSubmit={handleSearch} className="w-full max-w-3xl space-y-3">
            {/* Input de búsqueda */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Ej. Librerías, papelerías, escuelas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 text-base border border-slate-300 rounded-full bg-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setIsMapSelectorOpen(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition"
                title="Seleccionar zonas desde mapa"
              >
                <Map size={18} className="text-slate-500 hover:text-blue-600" />
              </button>
            </div>

            {/* Filtros: País, Estado, Zonas en una fila */}
            <div className="flex gap-6 items-center justify-center flex-wrap">
              {/* País */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 min-w-fit">País:</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedZoneIds(new Set()); }}
                  className="appearance-none bg-transparent text-sm font-medium text-slate-900 border-b-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-none pb-1 cursor-pointer pr-4 min-w-[100px]"
                >
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 min-w-fit">Estado:</label>
                <select
                  value={selectedState}
                  onChange={(e) => { setSelectedState(e.target.value); setSelectedZoneIds(new Set()); setZoneSearch(''); }}
                  className="appearance-none bg-transparent text-sm font-medium text-slate-900 border-b-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-none pb-1 cursor-pointer pr-4 min-w-[130px]"
                >
                  <option value="">Selecciona...</option>
                  {availableStates.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Zonas */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 min-w-fit">Zonas:</label>
                <ZoneSelector
                  libres={allZonesForState.libres}
                  ocupadas={allZonesForState.ocupadas}
                  selectedZoneIds={selectedZoneIds}
                  onSelectionChange={setSelectedZoneIds}
                  disabled={!selectedState}
                />
              </div>
            </div>

            {/* Botón de búsqueda */}
            <div className="flex justify-center pt-4">
              <button type="submit" disabled={isSearching} className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-full text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isSearching ? <Loader2 size={16} className="animate-spin inline mr-2" /> : ''}
                Buscar
              </button>
            </div>
          </form>

          {searchError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 text-center mt-4">{searchError}</div>
          )}
        </div>
      ) : (
        // VISTA POST-BÚSQUEDA: Compacta arriba, resultados debajo
        <>
          {/* Barra de búsqueda compacta */}
          <div className="bg-white px-4 py-2 sticky top-16 z-10">
            <form onSubmit={handleSearch} className="flex gap-3 items-center">
              {/* Input pequeño */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Ej. Librerías, papelerías..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Filtros compactos */}
              <div className="flex gap-3 items-center">
                <select
                  value={selectedCountry}
                  onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedZoneIds(new Set()); }}
                  className="appearance-none bg-transparent text-xs font-medium text-slate-900 border-b-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-none pb-0.5 cursor-pointer pr-2 min-w-fit"
                >
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select
                  value={selectedState}
                  onChange={(e) => { setSelectedState(e.target.value); setSelectedZoneIds(new Set()); setZoneSearch(''); }}
                  className="appearance-none bg-transparent text-xs font-medium text-slate-900 border-b-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-none pb-0.5 cursor-pointer pr-2 min-w-fit"
                >
                  <option value="">Estado</option>
                  {availableStates.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <ZoneSelector
                  libres={allZonesForState.libres}
                  ocupadas={allZonesForState.ocupadas}
                  selectedZoneIds={selectedZoneIds}
                  onSelectionChange={setSelectedZoneIds}
                  disabled={!selectedState}
                />
              </div>

              {/* Botón buscar pequeño */}
              <button type="submit" disabled={isSearching} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isSearching ? <Loader2 size={14} className="animate-spin inline" /> : 'Buscar'}
              </button>
            </form>
          </div>

          {/* Breadcrumb/Ruta */}
          <div className="bg-white px-4 py-1">
            <p className="text-xs text-blue-600 font-medium">
              {countryName} {stateName && `/ ${stateName}`} {selectedCities.length > 0 && `/ ${selectedCities.join(', ')}`}
            </p>
          </div>

          {/* Resultados */}
          {results && (
            <div className="flex-1 px-0 py-0">
              <p className="text-xs font-bold text-slate-500 mb-0 px-4 py-2 border-b border-slate-100">{results.filter((r) => !convertedIds.has(r.id)).length} resultados encontrados</p>

              {results.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400 border border-dashed border-slate-200">
                  Sin resultados para esta búsqueda.
                </div>
              ) : (
                <div className="space-y-0">
                  {results
                    .filter((r) => !convertedIds.has(r.id))
                    .sort((a, b) => {
                      // Calcular isApt para ambos resultados
                      const aIsApt = !!(a.phone || a.email || a.website);
                      const bIsApt = !!(b.phone || b.email || b.website);
                      // Aptos primero, no aptos al final
                      if (aIsApt === bIsApt) return 0;
                      return aIsApt ? -1 : 1;
                    })
                    .map((result) => {
                      // Calcular isApt dinámicamente basado en datos actuales
                      const isApt = !!(result.phone || result.email || result.website);
                      return (
                    <div key={result.id} className={`border-b border-slate-100 rounded-none p-3 transition-all ${!isApt ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}>
                      {/* Título + dirección + badge */}
                      <div className="flex items-start gap-2 mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-950 text-base leading-tight">{result.name}</h3>
                            {!isApt && (
                              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">No apto</span>
                            )}
                          </div>
                          {result.address && (
                            <p className="text-xs text-slate-600 mt-0.5">{result.address}</p>
                          )}
                        </div>
                      </div>

                      {/* Contacto: Website, Teléfono, Email en una línea */}
                      <div className="flex items-center gap-3 text-sm mb-2 flex-wrap">
                        {result.website && (
                          <a href={result.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 italic font-medium">
                            <Globe size={14} />
                            {result.website.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        )}
                        {result.phone && (
                          <a href={`tel:${result.phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 italic font-medium">
                            <Phone size={14} />
                            {result.phone}
                          </a>
                        )}
                        {result.emailStatus === 'found' && result.email && (
                          <a href={`mailto:${result.email}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 italic font-medium truncate">
                            <Mail size={14} />
                            {result.email}
                          </a>
                        )}
                      </div>

                      {/* Botón Convertir */}
                      <button
                        onClick={() => {
                          if (!isApt) {
                            setNotification({
                              type: 'error',
                              message: 'Este resultado no tiene teléfono ni correo. Agrega al menos uno para convertirlo a LEAD.',
                            });
                            return;
                          }
                          handleConvertClick(result);
                          setConvertedIds((prev) => new Set([...prev, result.id]));
                        }}
                        disabled={!isApt}
                        className={`py-1 px-4 rounded-lg font-medium text-xs transition-colors max-w-sm ${
                          isApt
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isApt ? 'Convertir a LEAD' : 'Sin contacto'}
                      </button>
                    </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {searchError && (
            <div className="px-6 py-4 bg-rose-50 border-t border-rose-200">
              <p className="text-xs text-rose-700 text-center">{searchError}</p>
            </div>
          )}
        </>
      )}

      <FormRegistrarLead
        isOpen={convertingResultId !== null}
        onClose={() => {
          setConvertingResultId(null);
          setPendingInitialData(null);
        }}
        countries={countries}
        states={states}
        zones={zones.map((z) => ({ id: z.id, country_id: z.country_id, state_id: z.state_id, cve_municipio: 0, cvegeo: '', city: z.city }))}
        initialData={convertingResult ? initialDataForResult(convertingResult) : undefined}
        source="google_maps"
        onCreated={() => setConvertingResultId(null)}
      />

      <MapZoneSelector
        isOpen={isMapSelectorOpen}
        onClose={() => setIsMapSelectorOpen(false)}
        countries={countries}
        states={states}
        zones={zones}
        onZonesSelected={handleMapZonesSelected}
      />

      {confirmLocationData && (
        <ConfirmLocationModal
          isOpen={isConfirmLocationOpen}
          onConfirm={handleConfirmLocation}
          onCancel={() => {
            setIsConfirmLocationOpen(false);
            setConfirmLocationData(null);
          }}
          address={confirmLocationData.result.address || ''}
          foundStateName={confirmLocationData.match.stateName}
          foundZoneName={confirmLocationData.match.zoneName}
          countries={countries}
          states={states}
          zones={zones.map((z) => ({ id: z.id, city: z.city, state_id: z.state_id }))}
          defaultCountryId={selectedCountry}
        />
      )}
    </div>
  );
}
