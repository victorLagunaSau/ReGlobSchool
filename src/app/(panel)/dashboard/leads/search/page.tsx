'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { ArrowLeft, Search, MapPin, Phone, Globe, Mail, PlusCircle, Loader2, Map } from 'lucide-react';
import FormRegistrarLead, { type LeadInitialData } from '../components/FormRegistrarLead';
import MapZoneSelector from '../components/MapZoneSelector';
import ZoneSelector from '../components/ZoneSelector';
import type { Country, StateRow } from '../page';

interface ZoneWithStatus {
  id: string;
  country_id: string;
  state_id: string;
  city: string;
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

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [convertingResultId, setConvertingResultId] = useState<string | null>(null);
  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [countriesRes, statesRes, zonesRes] = await Promise.all([
        supabase.from('countries').select('id, name').order('name'),
        supabase.from('states').select('id, country_id, cve_estado, name').order('name'),
        supabase.from('zones').select('id, country_id, state_id, city, assigned_to').order('city'),
      ]);

      if (countriesRes.data) setCountries(countriesRes.data);
      if (statesRes.data) setStates(statesRes.data);
      if (zonesRes.data) {
        setZones(
          zonesRes.data.map((z) => ({
            id: z.id,
            country_id: z.country_id,
            state_id: z.state_id,
            city: z.city,
            isLibre: isZoneLibre(z.assigned_to),
          }))
        );
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

  const libreZonesForState = useMemo(() => {
    const term = zoneSearch.trim().toLowerCase();
    return zones
      .filter((z) => z.state_id === selectedState && z.isLibre)
      .filter((z) => !term || z.city.toLowerCase().includes(term))
      .sort((a, b) => a.city.localeCompare(b.city));
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

  const handleMapZonesSelected = (selectedZones: Set<string>) => {
    setSelectedZoneIds((prev) => new Set([...prev, ...selectedZones]));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || selectedZoneIds.size === 0 || !stateRow) {
      return alert('Escribe un giro, selecciona un estado y al menos una zona libre para buscar.');
    }

    setIsSearching(true);
    setSearchError(null);
    setResults(null);

    try {
      const cities = Array.from(new Set(Array.from(selectedZoneIds).map((id) => zones.find((z) => z.id === id)?.city).filter(Boolean))) as string[];

      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), cities, stateName: stateRow.name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar negocios.');

      setResults(
        (data.results || []).map((r: Omit<SearchResult, 'emailStatus' | 'email'>) => ({
          ...r,
          emailStatus: 'idle' as const,
          email: null,
        }))
      );
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
    setConvertingResultId(result.id);
    if (result.website && result.emailStatus === 'idle') {
      fetchEmailForResult(result);
    }
  };

  const initialDataForResult = (result: SearchResult): LeadInitialData => ({
    business_name: result.name,
    business_type: query.trim(),
    phone: result.phone || '',
    email: result.email || '',
    address: result.address || '',
    website: result.website || '',
    country_id: selectedCountry,
    state_id: selectedState,
    zone_id: undefined,
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/leads" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 w-fit">
        <ArrowLeft size={14} /> Volver al listado de Leads
      </Link>

      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Buscar Negocios</h1>
          <p className="text-xs text-slate-500">Búsqueda en vivo vía Google Maps. Nada se guarda hasta que conviertas un resultado en Lead.</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Input de búsqueda con icono de mapa */}
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Ej. Librerías, papelerías, escuelas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-12 py-3 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-blue-600 focus:shadow-md transition-shadow"
              />
              <button
                type="button"
                onClick={() => setIsMapSelectorOpen(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition"
                title="Seleccionar zonas desde mapa"
              >
                <Map size={18} className="text-slate-400 hover:text-blue-600" />
              </button>
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>

          {/* Filtros: País, Estado, Zonas en una fila */}
          <div className="grid grid-cols-3 gap-3">
            {/* País */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">País *</label>
              <select
                value={selectedCountry}
                onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedZoneIds(new Set()); }}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white focus:outline-blue-600"
              >
                {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Estado *</label>
              <select
                value={selectedState}
                onChange={(e) => { setSelectedState(e.target.value); setSelectedZoneIds(new Set()); setZoneSearch(''); }}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white focus:outline-blue-600"
              >
                <option value="">Selecciona un estado...</option>
                {availableStates.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Zonas */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Zonas</label>
              <ZoneSelector
                zones={libreZonesForState}
                selectedZoneIds={selectedZoneIds}
                onSelectionChange={setSelectedZoneIds}
                disabled={!selectedState}
              />
            </div>
          </div>

          {/* Resumen de selecciones en azul */}
          {(selectedCountry || selectedState || selectedZoneIds.size > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex flex-wrap gap-1 items-center text-xs">
                <span className="font-semibold text-blue-900">
                  {countries.find(c => c.id === selectedCountry)?.name}
                </span>
                {selectedState && (
                  <>
                    <span className="text-blue-700">/</span>
                    <span className="font-semibold text-blue-900">
                      {states.find(s => s.id === selectedState)?.name}
                    </span>
                  </>
                )}
                {selectedZoneIds.size > 0 && (
                  <>
                    <span className="text-blue-700">/</span>
                    <div className="flex flex-wrap gap-1">
                      {libreZonesForState
                        .filter(z => selectedZoneIds.has(z.id))
                        .sort((a, b) => a.city.localeCompare(b.city))
                        .map((z) => (
                          <span key={z.id} className="text-blue-900">
                            {z.city}{selectedZoneIds.has(z.id) && libreZonesForState.filter(zz => selectedZoneIds.has(zz.id)).length > 1 && selectedZoneIds.has(z.id) && libreZonesForState.filter(zz => selectedZoneIds.has(zz.id)).indexOf(z) < libreZonesForState.filter(zz => selectedZoneIds.has(zz.id)).length - 1 ? ',' : ''}
                          </span>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button type="submit" disabled={isSearching} className="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 shadow-sm disabled:opacity-50">
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar Negocios
            </button>
          </div>
        </form>

        {searchError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 text-center">{searchError}</div>
        )}
      </div>

      {/* RESULTADOS: mucho espacio, tipo grid de tarjetas */}
      {results && (
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 text-center">{results.length} resultados encontrados</p>

          {results.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-2xl max-w-md mx-auto">
              Sin resultados para esta búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {results.map((result) => (
                <div key={result.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900 text-base">{result.name}</h3>
                    <button
                      onClick={() => handleConvertClick(result)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800"
                    >
                      <PlusCircle size={12} className="text-blue-400" /> Convertir a Lead
                    </button>
                  </div>

                  {result.address && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" /> {result.address}
                    </div>
                  )}
                  {result.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone size={13} className="text-slate-400 shrink-0" /> {result.phone}
                    </div>
                  )}
                  {result.website && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Globe size={13} className="text-slate-400 shrink-0" />
                      <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        {result.website}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs pt-1 border-t border-slate-50">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    {result.emailStatus === 'loading' ? (
                      <span className="text-slate-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Buscando correo...</span>
                    ) : result.emailStatus === 'found' && result.email ? (
                      <span className="text-slate-700 font-semibold">{result.email}</span>
                    ) : result.emailStatus === 'not_found' ? (
                      <span className="text-slate-400">Sin correo encontrado</span>
                    ) : result.website ? (
                      <button onClick={() => fetchEmailForResult(result)} className="text-blue-600 hover:underline font-semibold">Buscar correo</button>
                    ) : (
                      <span className="text-slate-300">Sin sitio web</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <FormRegistrarLead
        isOpen={convertingResultId !== null}
        onClose={() => setConvertingResultId(null)}
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
    </div>
  );
}
