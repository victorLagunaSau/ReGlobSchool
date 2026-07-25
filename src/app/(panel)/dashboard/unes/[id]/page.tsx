'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';
import StateMapView from '../../../../../components/ui/StateMapView';
import { ArrowLeft, Building2, MapPinned, ListPlus, Trash2, Check, X, Loader2, Search } from 'lucide-react';
import type { Country, StateRow, ZoneRow } from '../page';

interface UneDetail {
  id: string;
  distribution_name: string;
  distribution_address: string | null;
  distribution_phone: string | null;
  commercial_partner_name: string | null;
  une_type_titulo: string;
  producto_nombre: string;
  agreed_departure_price: number | null;
  suggested_selling_price: number | null;
  real_selling_price: number | null;
}

interface UneZoneRow {
  zone_id: string;
  schools: string;
  licenses: string;
  zone: ZoneRow;
}

export default function UneDetailPage() {
  const params = useParams<{ id: string }>();
  const uneId = params.id;

  const [loading, setLoading] = useState(true);
  const [une, setUne] = useState<UneDetail | null>(null);
  const [uneZones, setUneZones] = useState<UneZoneRow[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [pendingDeleteZoneId, setPendingDeleteZoneId] = useState<string | null>(null);

  // Compartido por los dos selectores de estado (Ver Mapas / Agregar Zonas):
  // cache acumulado de zonas por id, se llena bajo demanda por estado.
  const [zonesCache, setZonesCache] = useState<Record<string, ZoneRow>>({});

  // "Ver Mapas": solo estados donde esta UNE ya tiene zonas.
  const [mapCountryId, setMapCountryId] = useState('MX');
  const [mapStateId, setMapStateId] = useState('');
  const [isLoadingMapZones, setIsLoadingMapZones] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<any | null>(null);
  const mapFetchRef = useRef(0);

  // "Agregar Zonas": todos los estados, solo lista (sin mapa).
  const [addCountryId, setAddCountryId] = useState('MX');
  const [addStateId, setAddStateId] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [isLoadingAddZones, setIsLoadingAddZones] = useState(false);
  const addFetchRef = useRef(0);

  const fetchUne = useCallback(async () => {
    const [uneRes, catalogRes] = await Promise.all([
      supabase
        .from('unes')
        .select(
          '*, distributions(name, address, phone, commercial_partners(company_name)), une_types(titulo), une_zones(zone_id, projected_schools, projected_licenses, zones(id, country_id, state_id, cve_municipio, cvegeo, city, schools_potential, assigned_to))'
        )
        .eq('id', uneId)
        .single(),
      Promise.all([
        supabase.from('countries').select('id, name').order('name'),
        supabase.from('states').select('id, country_id, cve_estado, name').order('name'),
      ]),
    ]);

    const { data, error } = uneRes;
    const [countriesRes, statesRes] = catalogRes;
    if (countriesRes.data) setCountries(countriesRes.data);
    if (statesRes.data) setStates(statesRes.data);

    if (error || !data) {
      setLoading(false);
      return;
    }

    setUne({
      id: data.id,
      distribution_name: data.distributions?.name || '—',
      distribution_address: data.distributions?.address || null,
      distribution_phone: data.distributions?.phone || null,
      commercial_partner_name: data.distributions?.commercial_partners?.company_name || null,
      une_type_titulo: data.une_types?.titulo || '—',
      producto_nombre: data.producto_nombre,
      agreed_departure_price: data.agreed_departure_price,
      suggested_selling_price: data.suggested_selling_price,
      real_selling_price: data.real_selling_price,
    });

    const rows: UneZoneRow[] = (data.une_zones || [])
      .filter((z: any) => z.zones)
      .map((z: any) => ({
        zone_id: z.zone_id,
        schools: String(z.projected_schools ?? 0),
        licenses: String(z.projected_licenses ?? 0),
        zone: z.zones,
      }))
      .sort((a: UneZoneRow, b: UneZoneRow) => a.zone.city.localeCompare(b.zone.city));
    setUneZones(rows);

    setLoading(false);
  }, [uneId]);

  useEffect(() => {
    fetchUne();
  }, [fetchUne]);

  // Trae y cachea las zonas de un estado bajo demanda (nunca el catálogo nacional).
  const loadZonesForState = useCallback(
    async (stateId: string, requestRef: React.MutableRefObject<number>, setIsLoading: (v: boolean) => void) => {
      const requestId = ++requestRef.current;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('zones')
        .select('id, country_id, state_id, cve_municipio, cvegeo, city, schools_potential, assigned_to')
        .eq('state_id', stateId)
        .order('city');
      if (requestId !== requestRef.current) return;
      if (!error && data) {
        setZonesCache((prev) => {
          const next = { ...prev };
          data.forEach((z) => { next[z.id] = z; });
          return next;
        });
      }
      setIsLoading(false);
    },
    []
  );

  useEffect(() => {
    if (mapStateId) loadZonesForState(mapStateId, mapFetchRef, setIsLoadingMapZones);
  }, [mapStateId, loadZonesForState]);

  useEffect(() => {
    if (addStateId) loadZonesForState(addStateId, addFetchRef, setIsLoadingAddZones);
  }, [addStateId, loadZonesForState]);

  // Estados/países donde esta UNE ya tiene zonas (para "Ver Mapas").
  const usedStateIds = useMemo(() => new Set(uneZones.map((z) => z.zone.state_id)), [uneZones]);
  const usedCountryIds = useMemo(() => new Set(uneZones.map((z) => z.zone.country_id)), [uneZones]);

  const mapCountryOptions = usedCountryIds.size > 0 ? countries.filter((c) => usedCountryIds.has(c.id)) : countries;
  const mapStateOptions = states.filter((s) => s.country_id === mapCountryId && usedStateIds.has(s.id));
  const selectedMapState = states.find((s) => s.id === mapStateId);
  const mapGeoUrl = selectedMapState
    ? `/data/maps/${mapCountryId}/${String(selectedMapState.cve_estado).padStart(2, '0')}.geojson`
    : null;

  const mapStateZones = useMemo(
    () => Object.values(zonesCache).filter((z) => z.state_id === mapStateId).sort((a, b) => a.city.localeCompare(b.city)),
    [zonesCache, mapStateId]
  );

  const adaptedZonesForMap = useMemo(
    () =>
      mapStateZones.map((z) => ({
        id: z.id,
        CveMunicipio: z.cve_municipio,
        CVEGEO: z.cvegeo,
        Ciudad: z.city,
        city: z.city,
        assignedTo: z.assigned_to,
      })),
    [mapStateZones]
  );

  const addStateOptions = states.filter((s) => s.country_id === addCountryId);
  const addStateZones = useMemo(
    () => Object.values(zonesCache).filter((z) => z.state_id === addStateId).sort((a, b) => a.city.localeCompare(b.city)),
    [zonesCache, addStateId]
  );
  const selectedZoneIdsSet = useMemo(() => new Set(uneZones.map((z) => z.zone_id)), [uneZones]);

  // Solo zonas que todavía NO están en esta UNE — si quitas una desde la
  // lista de la izquierda, reaparece aquí automáticamente.
  const filteredAddStateZones = useMemo(() => {
    const term = addSearch.trim().toLowerCase();
    return addStateZones.filter((z) => !selectedZoneIdsSet.has(z.id) && (!term || z.city.toLowerCase().includes(term)));
  }, [addStateZones, addSearch, selectedZoneIdsSet]);

  const totals = useMemo(() => {
    return uneZones.reduce(
      (acc, z) => ({
        schools: acc.schools + (Number(z.schools) || 0),
        licenses: acc.licenses + (Number(z.licenses) || 0),
        censo: acc.censo + (z.zone.schools_potential || 0),
      }),
      { schools: 0, licenses: 0, censo: 0 }
    );
  }, [uneZones]);

  const gananciaPorLicencia = useMemo(() => {
    if (!une || une.real_selling_price == null || une.agreed_departure_price == null) return null;
    return une.real_selling_price - une.agreed_departure_price;
  }, [une]);

  const comisionPorcentaje = useMemo(() => {
    if (gananciaPorLicencia == null || !une?.real_selling_price) return null;
    return (gananciaPorLicencia / une.real_selling_price) * 100;
  }, [gananciaPorLicencia, une]);

  const gananciaTotal = useMemo(() => {
    if (gananciaPorLicencia == null) return null;
    return gananciaPorLicencia * totals.licenses;
  }, [gananciaPorLicencia, totals.licenses]);

  const updateZoneField = (zoneId: string, field: 'schools' | 'licenses', value: string) => {
    setUneZones((prev) => prev.map((z) => (z.zone_id === zoneId ? { ...z, [field]: value } : z)));
  };

  const saveZoneField = async (zoneId: string) => {
    const row = uneZones.find((z) => z.zone_id === zoneId);
    if (!row) return;
    await supabase
      .from('une_zones')
      .update({
        projected_schools: Number(row.schools) || 0,
        projected_licenses: Number(row.licenses) || 0,
      })
      .eq('une_id', uneId)
      .eq('zone_id', zoneId);
  };

  // Sin window.confirm: no funciona de forma confiable dentro del navegador
  // embebido de la app. El botón de la lista pide confirmación en línea
  // (✓/✕); el clic en el mapa quita directo, igual que ya se elige/deselecciona.
  const handleRemoveZone = async (zoneId: string) => {
    const { error } = await supabase.from('une_zones').delete().eq('une_id', uneId).eq('zone_id', zoneId);
    if (error) {
      console.error('Error al quitar zona:', error);
      return;
    }
    setUneZones((prev) => prev.filter((z) => z.zone_id !== zoneId));
    setPendingDeleteZoneId(null);
  };

  const handleAddZone = async (zone: ZoneRow) => {
    const { error } = await supabase.from('une_zones').insert({
      une_id: uneId,
      zone_id: zone.id,
      projected_schools: 0,
      projected_licenses: 0,
    });
    if (error) {
      console.error('Error al agregar zona:', error);
      return;
    }
    setUneZones((prev) => [...prev, { zone_id: zone.id, schools: '0', licenses: '0', zone }].sort((a, b) => a.zone.city.localeCompare(b.zone.city)));
  };

  const handleToggleZone = (zone: ZoneRow) => {
    if (selectedZoneIdsSet.has(zone.id)) {
      handleRemoveZone(zone.id);
    } else {
      handleAddZone(zone);
    }
  };

  const handleMapZoneClick = (zoneInfo: any) => {
    if (!zoneInfo?.id) return;
    const zone = zonesCache[zoneInfo.id];
    if (zone) handleToggleZone(zone);
    else if (selectedZoneIdsSet.has(zoneInfo.id)) handleRemoveZone(zoneInfo.id);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando UNE...</div>;
  }

  if (!une) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        No se encontró esta UNE.
        <div className="mt-3">
          <Link href="/dashboard/unes" className="text-blue-600 hover:underline text-sm font-semibold">Volver al listado</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/unes" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 w-fit">
        <ArrowLeft size={14} /> Volver al listado de UNEs
      </Link>

      {/* DATOS GENERALES (solo lectura) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-700 mb-3">
          <Building2 size={14} className="text-slate-400" />
          <h1 className="text-lg font-black text-slate-950">{une.distribution_name}</h1>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 mb-4">
          {une.distribution_address && <span>{une.distribution_address}</span>}
          {une.distribution_phone && <span>{une.distribution_phone}</span>}
          {une.commercial_partner_name && <span>Socio: {une.commercial_partner_name}</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Tipo de UNE</p>
            <p className="text-sm font-bold text-slate-800">{une.une_type_titulo}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Producto</p>
            <p className="text-sm font-bold text-slate-800">{une.producto_nombre}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Total Colegios</p>
            <p className="text-sm font-bold text-slate-800">{totals.schools.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Total Licencias</p>
            <p className="text-sm font-bold text-slate-800">{totals.licenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Precio Salida</p>
            <p className="text-sm font-bold text-slate-800">{une.agreed_departure_price != null ? `$${une.agreed_departure_price.toLocaleString()}` : '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Precio Sugerido</p>
            <p className="text-sm font-bold text-slate-800">{une.suggested_selling_price != null ? `$${une.suggested_selling_price.toLocaleString()}` : '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Precio Real</p>
            <p className="text-sm font-bold text-slate-800">{une.real_selling_price != null ? `$${une.real_selling_price.toLocaleString()}` : '—'}</p>
          </div>
          <div className="bg-slate-900 text-white rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Ganancia/Licencia</p>
            <p className="text-sm font-black">{gananciaPorLicencia != null ? `$${gananciaPorLicencia.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</p>
          </div>
          <div className="bg-slate-900 text-white rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Comisión Socio</p>
            <p className="text-sm font-black">{comisionPorcentaje != null ? `${comisionPorcentaje.toLocaleString(undefined, { maximumFractionDigits: 2 })}%` : '—'}</p>
          </div>
          <div className="bg-blue-600 text-white rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-blue-200">Ganancia Total</p>
            <p className="text-sm font-black">{gananciaTotal != null ? `$${gananciaTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</p>
          </div>
        </div>
      </div>

      {/* ZONAS: LISTA (60%) + VER MAPAS / AGREGAR ZONAS (resto) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* LISTA DE ZONAS */}
        <div className="w-full lg:w-[60%] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Zonas de esta UNE ({uneZones.length})</h2>
          </div>
          {uneZones.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">Sin zonas todavía — agrégalas desde "Agregar Zonas".</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_90px_90px_50px] gap-2 px-4 py-1.5 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                <span>Zona</span>
                <span className="text-center">Colegios</span>
                <span className="text-center">Licencias</span>
                <span />
              </div>
              {uneZones.map((z) => (
                <div key={z.zone_id} className="grid grid-cols-[1fr_90px_90px_50px] gap-2 px-4 py-2 items-center">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{z.zone.city}</div>
                    <div className="text-[9px] text-slate-400">Censo: {(z.zone.schools_potential || 0).toLocaleString()} esc.</div>
                  </div>
                  <input
                    type="number"
                    value={z.schools}
                    onChange={(e) => updateZoneField(z.zone_id, 'schools', e.target.value)}
                    onBlur={() => saveZoneField(z.zone_id)}
                    className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-center focus:outline-blue-600"
                  />
                  <input
                    type="number"
                    value={z.licenses}
                    onChange={(e) => updateZoneField(z.zone_id, 'licenses', e.target.value)}
                    onBlur={() => saveZoneField(z.zone_id)}
                    className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-center focus:outline-blue-600"
                  />
                  {pendingDeleteZoneId === z.zone_id ? (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleRemoveZone(z.zone_id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-md" title="Confirmar">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setPendingDeleteZoneId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancelar">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingDeleteZoneId(z.zone_id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md justify-self-center"
                      title="Quitar zona"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full lg:w-[38%] space-y-4">
          {/* VER MAPAS: solo estados donde esta UNE ya tiene zonas */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPinned size={14} className="text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-wider">Ver Mapas</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={mapCountryId}
                onChange={(e) => { setMapCountryId(e.target.value); setMapStateId(''); }}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
              >
                {mapCountryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={mapStateId}
                onChange={(e) => setMapStateId(e.target.value)}
                disabled={mapStateOptions.length === 0}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600 disabled:opacity-50"
              >
                <option value="">Selecciona...</option>
                {mapStateOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {!mapStateId ? (
              <div className="text-[11px] text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-lg">
                {mapStateOptions.length === 0 ? 'Agrega zonas primero para poder verlas en el mapa.' : 'Elige un estado para ver su mapa.'}
              </div>
            ) : isLoadingMapZones && mapStateZones.length === 0 ? (
              <div className="text-[11px] text-slate-400 text-center py-8 flex items-center justify-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Cargando...
              </div>
            ) : !mapGeoUrl ? (
              <div className="text-[11px] text-rose-500 text-center py-8 border border-dashed border-rose-200 rounded-lg">
                Este estado no tiene clave INEGI configurada.
              </div>
            ) : (
              <>
                <StateMapView
                  geoUrl={mapGeoUrl}
                  zonesData={adaptedZonesForMap}
                  selectedZoneIds={selectedZoneIdsSet}
                  onZoneHover={(zoneInfo) => setHoveredZone(zoneInfo)}
                  onZoneClick={handleMapZoneClick}
                />
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e2e8f0] inline-block" /> Libre</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block" /> Otra UNE</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb] inline-block" /> Esta UNE</span>
                </div>
                {hoveredZone && (
                  <p className="text-[10px] text-slate-400">
                    {hoveredZone.Ciudad || hoveredZone.city} — clic para {selectedZoneIdsSet.has(hoveredZone.id) ? 'quitar' : 'agregar'}
                  </p>
                )}
              </>
            )}
          </div>

          {/* AGREGAR ZONAS: todos los estados, solo lista */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-700">
              <ListPlus size={14} className="text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-wider">Agregar Zonas</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={addCountryId}
                onChange={(e) => { setAddCountryId(e.target.value); setAddStateId(''); setAddSearch(''); }}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
              >
                {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={addStateId}
                onChange={(e) => { setAddStateId(e.target.value); setAddSearch(''); }}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
              >
                <option value="">Selecciona...</option>
                {addStateOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {!addStateId ? (
              <div className="text-[11px] text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-lg">
                Elige un estado para ver su lista de zonas.
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Buscar por ciudad..."
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    className="w-full pl-7 border border-slate-200 rounded-lg p-1.5 text-[11px] focus:outline-blue-600"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {isLoadingAddZones && addStateZones.length === 0 ? (
                    <div className="p-3 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> Cargando zonas...
                    </div>
                  ) : filteredAddStateZones.length === 0 ? (
                    <div className="p-3 text-[10px] text-slate-400 text-center">No hay zonas que coincidan.</div>
                  ) : (
                    filteredAddStateZones.map((z) => (
                      <label key={z.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selectedZoneIdsSet.has(z.id)} onChange={() => handleToggleZone(z)} className="accent-blue-600" />
                        <span className="font-semibold text-slate-700 truncate flex-1">{z.city}</span>
                        {z.assigned_to && String(z.assigned_to).toLowerCase() !== 'libre' && !selectedZoneIdsSet.has(z.id) && (
                          <span className="text-[9px] font-bold text-amber-600">{z.assigned_to}</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
