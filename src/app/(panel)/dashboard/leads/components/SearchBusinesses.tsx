'use client';

import React, { useState } from 'react';
import { X, Loader2, Search, MapPin, Phone, Globe, PlusCircle } from 'lucide-react';
import type { Country, StateRow, ZoneRow } from '../page';
import FormRegistrarLead, { type LeadInitialData } from './FormRegistrarLead';

interface SearchResult {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
}

interface SearchBusinessesProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  states: StateRow[];
  zones: ZoneRow[];
  onCreated: () => void;
}

export default function SearchBusinesses({ isOpen, onClose, countries, states, zones, onCreated }: SearchBusinessesProps) {
  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [selectedState, setSelectedState] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [convertingResult, setConvertingResult] = useState<SearchResult | null>(null);

  if (!isOpen) return null;

  const filteredStates = states.filter((s) => s.country_id === selectedCountry);
  const filteredZones = zones.filter((z) => z.state_id === selectedState);
  const zone = zones.find((z) => z.id === selectedZone);
  const stateRow = states.find((s) => s.id === selectedState);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !zone || !stateRow) {
      return alert('Escribe un giro y selecciona estado + zona para buscar.');
    }

    setIsSearching(true);
    setSearchError(null);
    setResults(null);

    try {
      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), city: zone.city, stateName: stateRow.name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar negocios.');

      setResults(data.results || []);
    } catch (error) {
      console.error('Error al buscar negocios:', error);
      setSearchError(error instanceof Error ? error.message : 'Error al buscar negocios.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults(null);
    setSearchError(null);
    onClose();
  };

  const initialDataForResult = (result: SearchResult): LeadInitialData => ({
    business_name: result.name,
    business_type: query.trim(),
    phone: result.phone || '',
    address: result.address || '',
    country_id: selectedCountry,
    state_id: selectedState,
    zone_id: selectedZone,
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-black text-slate-950 tracking-tight">Buscar Negocios</h2>
              <p className="text-[11px] text-slate-400">Búsqueda en vivo vía Google Maps. Nada se guarda hasta que conviertas un resultado en Lead.</p>
            </div>
            <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Giro o Nombre</label>
              <input
                type="text"
                placeholder="Ej. Librerías, papelerías, escuelas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">País</label>
                <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedZone(''); }} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
                <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedZone(''); }} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  <option value="">Selecciona...</option>
                  {filteredStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Zona</label>
                <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} disabled={!selectedState} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600 disabled:opacity-50">
                  <option value="">Selecciona...</option>
                  {filteredZones.map((z) => <option key={z.id} value={z.id}>{z.city}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isSearching} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Buscar
              </button>
            </div>
          </form>

          {searchError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700">{searchError}</div>
          )}

          {results && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">{results.length} resultados encontrados</p>
              {results.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">Sin resultados para esta búsqueda.</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result) => (
                    <div key={result.id} className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{result.name}</div>
                        {result.address && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" /> {result.address}
                          </div>
                        )}
                        {result.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-slate-400 shrink-0" /> {result.phone}
                          </div>
                        )}
                        {result.website && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Globe size={11} className="text-slate-400 shrink-0" /> {result.website}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setConvertingResult(result)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800"
                      >
                        <PlusCircle size={12} className="text-blue-400" /> Convertir a Lead
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FormRegistrarLead
        isOpen={convertingResult !== null}
        onClose={() => setConvertingResult(null)}
        countries={countries}
        states={states}
        zones={zones}
        initialData={convertingResult ? initialDataForResult(convertingResult) : undefined}
        source="google_maps"
        onCreated={() => {
          onCreated();
          setConvertingResult(null);
        }}
      />
    </>
  );
}
