'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Loader2, X, Building2, MapPinned, Search, ClipboardCheck, CheckSquare, Square, Copy } from 'lucide-react';
import StateMapView from '../../../../../components/ui/StateMapView';
import { PRODUCTS } from '../page';
import type { Country, StateRow, ZoneRow, Distribution, UneType } from '../page';

interface FormRegistrarUneProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  states: StateRow[];
  distributions: Distribution[];
  uneTypes: UneType[];
  onCreated: () => void;
}

const STEP_LABELS = ['Datos Generales', 'Zonas', 'Revisión'];
const TOTAL_STEPS = STEP_LABELS.length;

export default function FormRegistrarUne({
  isOpen,
  onClose,
  countries,
  states,
  distributions,
  uneTypes,
  onCreated,
}: FormRegistrarUneProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Paso 1
  const [distributionId, setDistributionId] = useState('');
  const [uneTypeId, setUneTypeId] = useState('');
  const [productoClave, setProductoClave] = useState<string>(PRODUCTS[0].clave);

  // Paso 2 (mapa por estado, acumulado entre varios estados)
  const [mapCountryId, setMapCountryId] = useState('MX');
  const [mapStateId, setMapStateId] = useState('');
  const [zoneSearch, setZoneSearch] = useState('');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [hoveredZone, setHoveredZone] = useState<any | null>(null);

  // Cache acumulado de zonas ya consultadas (por id), se va llenando estado
  // por estado según se navega — nunca se trae el catálogo nacional completo.
  const [zonesCache, setZonesCache] = useState<Record<string, ZoneRow>>({});
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const fetchRequestRef = useRef(0);

  // Paso 3 (revisión por zona + valores financieros compartidos)
  const [zoneProjections, setZoneProjections] = useState<Record<string, { schools: string; licenses: string }>>({});
  const [agreedDeparturePrice, setAgreedDeparturePrice] = useState('');
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState('');
  const [realSellingPrice, setRealSellingPrice] = useState('');

  const selectedDistribution = distributions.find((d) => d.id === distributionId);

  const filteredMapStates = states.filter((s) => s.country_id === mapCountryId);
  const selectedMapState = states.find((s) => s.id === mapStateId);
  const mapGeoUrl = selectedMapState
    ? `/data/maps/${mapCountryId}/${String(selectedMapState.cve_estado).padStart(2, '0')}.geojson`
    : null;

  // Trae las zonas del estado seleccionado únicamente (no el catálogo nacional),
  // y las va acumulando en zonesCache para no perder lo ya elegido en otros estados.
  useEffect(() => {
    if (!mapStateId) return;
    const requestId = ++fetchRequestRef.current;
    setIsLoadingZones(true);

    supabase
      .from('zones')
      .select('id, country_id, state_id, cve_municipio, cvegeo, city, schools_potential, assigned_to')
      .eq('state_id', mapStateId)
      .order('city')
      .then(({ data, error }) => {
        if (requestId !== fetchRequestRef.current) return; // llegó tarde, ya cambiamos de estado
        if (!error && data) {
          setZonesCache((prev) => {
            const next = { ...prev };
            data.forEach((z) => { next[z.id] = z; });
            return next;
          });
        }
        setIsLoadingZones(false);
      });
  }, [mapStateId]);

  const stateZones = useMemo(
    () =>
      Object.values(zonesCache)
        .filter((z) => z.state_id === mapStateId)
        .sort((a, b) => a.city.localeCompare(b.city)),
    [zonesCache, mapStateId]
  );

  const adaptedZonesForMap = useMemo(
    () =>
      stateZones.map((z) => ({
        id: z.id,
        CveMunicipio: z.cve_municipio,
        CVEGEO: z.cvegeo,
        Ciudad: z.city,
        city: z.city,
        assignedTo: z.assigned_to,
      })),
    [stateZones]
  );

  const filteredStateZones = useMemo(() => {
    const term = zoneSearch.trim().toLowerCase();
    return !term ? stateZones : stateZones.filter((z) => z.city.toLowerCase().includes(term));
  }, [stateZones, zoneSearch]);

  const selectedZoneIdsSet = useMemo(() => new Set(selectedZoneIds), [selectedZoneIds]);

  const selectedZonesData = useMemo(
    () => selectedZoneIds.map((id) => zonesCache[id]).filter((z): z is ZoneRow => Boolean(z)),
    [selectedZoneIds, zonesCache]
  );

  // País/Estado de la UNE se derivan de las zonas seleccionadas, no se eligen a mano.
  const derivedLocation = useMemo(() => {
    const stateIds = Array.from(new Set(selectedZonesData.map((z) => z.state_id)));
    const countryIds = Array.from(new Set(selectedZonesData.map((z) => z.country_id)));
    return {
      countryId: countryIds[0] || null,
      stateId: stateIds[0] || null,
      stateNames: stateIds.map((id) => states.find((s) => s.id === id)?.name || id),
      countryNames: countryIds.map((id) => countries.find((c) => c.id === id)?.name || id),
    };
  }, [selectedZonesData, states, countries]);

  const censusSchoolsSum = useMemo(
    () => selectedZonesData.reduce((acc, z) => acc + (z.schools_potential || 0), 0),
    [selectedZonesData]
  );

  const totalProjectedSchools = useMemo(
    () => selectedZoneIds.reduce((acc, id) => acc + (Number(zoneProjections[id]?.schools) || 0), 0),
    [selectedZoneIds, zoneProjections]
  );

  const totalProjectedLicenses = useMemo(
    () => selectedZoneIds.reduce((acc, id) => acc + (Number(zoneProjections[id]?.licenses) || 0), 0),
    [selectedZoneIds, zoneProjections]
  );

  const gananciaPorLicencia = useMemo(() => {
    const real = Number(realSellingPrice);
    const salida = Number(agreedDeparturePrice);
    if (!realSellingPrice || !agreedDeparturePrice || isNaN(real) || isNaN(salida)) return null;
    return real - salida;
  }, [realSellingPrice, agreedDeparturePrice]);

  const gananciaTotal = useMemo(() => {
    if (gananciaPorLicencia == null) return null;
    return gananciaPorLicencia * totalProjectedLicenses;
  }, [gananciaPorLicencia, totalProjectedLicenses]);

  // Comisión del Socio Comercial: el margen completo entre precio de salida
  // y precio real de venta, expresado como % del precio real. No se captura,
  // se calcula solo.
  const comisionPorcentaje = useMemo(() => {
    const real = Number(realSellingPrice);
    if (gananciaPorLicencia == null || !real) return null;
    return (gananciaPorLicencia / real) * 100;
  }, [gananciaPorLicencia, realSellingPrice]);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentStep(1);
    setDistributionId('');
    setUneTypeId('');
    setProductoClave(PRODUCTS[0].clave);
    setMapStateId('');
    setZoneSearch('');
    setSelectedZoneIds([]);
    setHoveredZone(null);
    setZonesCache({});
    setZoneProjections({});
    setAgreedDeparturePrice('');
    setSuggestedSellingPrice('');
    setRealSellingPrice('');
  };

  const toggleZone = (zoneId: string) => {
    setSelectedZoneIds((prev) => (prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]));
  };

  const handleMapZoneClick = (zoneInfo: any) => {
    if (!zoneInfo?.id) return; // municipio sin registro en el catálogo de zonas, no seleccionable
    toggleZone(zoneInfo.id);
  };

  const handleSelectAllInState = () => {
    setSelectedZoneIds((prev) => {
      const toAdd = filteredStateZones.map((z) => z.id).filter((id) => !prev.includes(id));
      return [...prev, ...toAdd];
    });
  };

  const handleClearAllInState = () => {
    const idsToRemove = new Set(filteredStateZones.map((z) => z.id));
    setSelectedZoneIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const updateZoneProjection = (zoneId: string, field: 'schools' | 'licenses', value: string) => {
    setZoneProjections((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], [field]: value } }));
  };

  const handleCopyFirstToAll = () => {
    if (selectedZonesData.length === 0) return;
    const first = zoneProjections[selectedZonesData[0].id] || { schools: '', licenses: '' };
    setZoneProjections((prev) => {
      const next = { ...prev };
      selectedZonesData.forEach((z) => {
        next[z.id] = { schools: first.schools, licenses: first.licenses };
      });
      return next;
    });
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!distributionId) return alert('Selecciona la Distribución.');
      if (!uneTypeId) return alert('Selecciona el Tipo de UNE.');
    }
    if (currentStep === 2 && selectedZoneIds.length === 0) {
      return alert('Selecciona al menos 1 zona en el mapa.');
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    const producto = PRODUCTS.find((p) => p.clave === productoClave) || PRODUCTS[0];
    setIsSaving(true);
    let createdUneId: string | null = null;

    try {
      const { data: uneData, error: uneError } = await supabase
        .from('unes')
        .insert({
          distribution_id: distributionId,
          une_type_id: uneTypeId,
          producto_clave: producto.clave,
          producto_nombre: producto.nombre,
          country_id: derivedLocation.countryId,
          state_id: derivedLocation.stateId,
          agreed_departure_price: agreedDeparturePrice ? Number(agreedDeparturePrice) : null,
          suggested_selling_price: suggestedSellingPrice ? Number(suggestedSellingPrice) : null,
          real_selling_price: realSellingPrice ? Number(realSellingPrice) : null,
          partner_commission: comisionPorcentaje != null ? Number(comisionPorcentaje.toFixed(2)) : null,
        })
        .select('id')
        .single();

      if (uneError) throw uneError;
      createdUneId = uneData.id;

      const { error: zonesError } = await supabase.from('une_zones').insert(
        selectedZoneIds.map((zoneId) => ({
          une_id: createdUneId,
          zone_id: zoneId,
          projected_schools: Number(zoneProjections[zoneId]?.schools) || 0,
          projected_licenses: Number(zoneProjections[zoneId]?.licenses) || 0,
        }))
      );
      if (zonesError) throw zonesError;

      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error al guardar la UNE:', error);
      if (createdUneId) {
        await supabase.from('unes').delete().eq('id', createdUneId);
      }
      alert('Ocurrió un error al guardar la UNE. Revisa la consola para más detalle.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-3xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-950 tracking-tight">Nueva UNE</h2>
            <p className="text-[11px] text-slate-400">Unidad de Negocio Educativo — oportunidad comercial de venta de licencias.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* INDICADOR DE PASOS */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isDone = step < currentStep;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isDone ? '✓' : step}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide hidden sm:inline ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {step < TOTAL_STEPS && <div className={`flex-1 h-0.5 rounded ${isDone ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="space-y-5">

          {/* PASO 1: DATOS GENERALES Y DISTRIBUCIÓN */}
          {currentStep === 1 && (
            <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-3 animate-fade-in-up">
              <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                <Building2 size={13} className="text-slate-400" />
                <label className="block text-[11px] font-black uppercase tracking-wider">Datos Generales y Distribución</label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Distribución *</label>
                <select value={distributionId} onChange={(e) => setDistributionId(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  <option value="">Selecciona...</option>
                  {distributions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {selectedDistribution && (
                  <p className="text-[10px] text-blue-600 font-semibold mt-1">
                    {selectedDistribution.address && <>{selectedDistribution.address}</>}
                    {selectedDistribution.phone && <> · {selectedDistribution.phone}</>}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Tipo de UNE *</label>
                  <select value={uneTypeId} onChange={(e) => setUneTypeId(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                    <option value="">Selecciona...</option>
                    {uneTypes.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Producto *</label>
                  <select value={productoClave} onChange={(e) => setProductoClave(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                    {PRODUCTS.map((p) => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: ZONAS GEOGRÁFICAS (MAPA INTERACTIVO POR ESTADO) */}
          {currentStep === 2 && (
            <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-3 animate-fade-in-up">
              <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                <MapPinned size={13} className="text-slate-400" />
                <label className="block text-[11px] font-black uppercase tracking-wider">Zonas Geográficas</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">País</label>
                  <select
                    value={mapCountryId}
                    onChange={(e) => { setMapCountryId(e.target.value); setMapStateId(''); }}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
                  >
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Estado *</label>
                  <select
                    value={mapStateId}
                    onChange={(e) => { setMapStateId(e.target.value); setZoneSearch(''); }}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
                  >
                    <option value="">Selecciona un estado para ver su mapa...</option>
                    {filteredMapStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {!mapStateId ? (
                <div className="text-[11px] text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-lg">
                  Elige un estado para ver su mapa y seleccionar municipios.
                </div>
              ) : !mapGeoUrl ? (
                <div className="text-[11px] text-rose-500 text-center py-8 border border-dashed border-rose-200 rounded-lg">
                  Este estado no tiene clave INEGI (cve_estado) configurada, no se puede cargar su mapa.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-3">
                    <div>
                      <StateMapView
                        geoUrl={mapGeoUrl}
                        zonesData={adaptedZonesForMap}
                        selectedZoneIds={selectedZoneIdsSet}
                        onZoneHover={(zoneInfo) => setHoveredZone(zoneInfo)}
                        onZoneClick={handleMapZoneClick}
                      />
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e2e8f0] inline-block" /> Libre</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block" /> Ya asignada</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb] inline-block" /> Seleccionada</span>
                      </div>
                      {hoveredZone && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {hoveredZone.Ciudad || hoveredZone.city} — {hoveredZone.assignedTo && String(hoveredZone.assignedTo).toLowerCase() !== 'libre' ? `${hoveredZone.assignedTo} UNE(s)` : 'sin UNE'}
                        </p>
                      )}
                    </div>

                    {/* Lista compañera: útil para municipios muy pequeños difíciles de tocar en el mapa */}
                    <div className="flex flex-col min-h-0">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2 text-slate-400" size={12} />
                        <input
                          type="text"
                          placeholder="Buscar por ciudad..."
                          value={zoneSearch}
                          onChange={(e) => setZoneSearch(e.target.value)}
                          className="w-full pl-7 border border-slate-200 rounded-lg p-1.5 text-[11px] focus:outline-blue-600"
                        />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <button type="button" onClick={handleSelectAllInState} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800">
                          <CheckSquare size={12} /> Seleccionar todo
                        </button>
                        <button type="button" onClick={handleClearAllInState} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-rose-600">
                          <Square size={12} /> Limpiar todo
                        </button>
                      </div>
                      <div className="flex-1 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                        {isLoadingZones ? (
                          <div className="p-3 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" /> Cargando zonas...
                          </div>
                        ) : filteredStateZones.length === 0 ? (
                          <div className="p-3 text-[10px] text-slate-400 text-center">No hay zonas que coincidan.</div>
                        ) : (
                          filteredStateZones.map((z) => (
                            <label key={z.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-slate-50 cursor-pointer">
                              <input type="checkbox" checked={selectedZoneIdsSet.has(z.id)} onChange={() => toggleZone(z.id)} className="accent-blue-600" />
                              <span className="font-semibold text-slate-700 truncate flex-1">{z.city}</span>
                              {z.assigned_to && String(z.assigned_to).toLowerCase() !== 'libre' && (
                                <span className="text-[9px] font-bold text-amber-600">{z.assigned_to}</span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="text-[10px] text-slate-400 italic">Tus zonas seleccionadas se conservan aunque cambies de país o estado — así puedes ir agregando estado por estado.</div>

              {/* Resumen acumulado entre todos los estados */}
              <div className="border-t border-slate-200 pt-2">
                <p className="text-[11px] font-bold text-slate-600 mb-1.5">
                  Zonas seleccionadas: <span className="text-blue-700">{selectedZoneIds.length}</span>
                  {derivedLocation.stateNames.length > 0 && <> — {derivedLocation.stateNames.join(', ')}</>}
                </p>
                {selectedZonesData.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedZonesData.map((z) => (
                      <span key={z.id} className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-1 rounded-full">
                        {z.city}
                        <button type="button" onClick={() => toggleZone(z.id)} className="hover:text-rose-600">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 3: REVISIÓN POR ZONA Y PROYECCIÓN FINANCIERA */}
          {currentStep === 3 && (
            <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ClipboardCheck size={13} className="text-slate-400" />
                  <label className="block text-[11px] font-black uppercase tracking-wider">Revisión de Zonas y Proyección Financiera</label>
                </div>
                <button
                  type="button"
                  onClick={handleCopyFirstToAll}
                  disabled={selectedZonesData.length < 2}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:hover:text-blue-600"
                  title="Copia Colegios/Licencias de la primera zona a todas las demás"
                >
                  <Copy size={12} /> Copiar a todos
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_100px] gap-2 px-3 py-1.5 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Zona</span>
                  <span className="text-center">Colegios</span>
                  <span className="text-center">Licencias</span>
                </div>
                {selectedZonesData.map((z) => (
                  <div key={z.id} className="grid grid-cols-[1fr_100px_100px] gap-2 px-3 py-2 items-center">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{z.city}</div>
                      <div className="text-[9px] text-slate-400">Censo: {(z.schools_potential || 0).toLocaleString()} esc.</div>
                    </div>
                    <input
                      type="number"
                      placeholder="0"
                      value={zoneProjections[z.id]?.schools || ''}
                      onChange={(e) => updateZoneProjection(z.id, 'schools', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-center focus:outline-blue-600"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={zoneProjections[z.id]?.licenses || ''}
                      onChange={(e) => updateZoneProjection(z.id, 'licenses', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-center focus:outline-blue-600"
                    />
                  </div>
                ))}
              </div>

              <div className="text-[11px] font-bold text-slate-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 flex flex-wrap gap-x-4">
                <span>Total Colegios: <span className="text-blue-700">{totalProjectedSchools.toLocaleString()}</span></span>
                <span>Total Licencias: <span className="text-blue-700">{totalProjectedLicenses.toLocaleString()}</span></span>
                <span className="text-slate-400 font-medium">Censo referencia: {censusSchoolsSum.toLocaleString()} esc.</span>
              </div>

              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1">Valores compartidos para todas las zonas de esta UNE</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Precio de Salida Pactado</label>
                  <input type="number" step="0.01" placeholder="0.00" value={agreedDeparturePrice} onChange={(e) => setAgreedDeparturePrice(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-blue-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Precio Sugerido de Venta</label>
                  <input type="number" step="0.01" placeholder="0.00" value={suggestedSellingPrice} onChange={(e) => setSuggestedSellingPrice(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-blue-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Precio Real de Venta</label>
                  <input type="number" step="0.01" placeholder="0.00" value={realSellingPrice} onChange={(e) => setRealSellingPrice(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-blue-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-900 text-white rounded-lg px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Ganancia por Licencia</p>
                  <p className="text-sm font-black">{gananciaPorLicencia != null ? `$${gananciaPorLicencia.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</p>
                </div>
                <div className="bg-slate-900 text-white rounded-lg px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Comisión del Socio (margen)</p>
                  <p className="text-sm font-black">{comisionPorcentaje != null ? `${comisionPorcentaje.toLocaleString(undefined, { maximumFractionDigits: 2 })}%` : '—'}</p>
                </div>
                <div className="bg-blue-600 text-white rounded-lg px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">Ganancia Total Proyectada</p>
                  <p className="text-sm font-black">{gananciaTotal != null ? `$${gananciaTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* --- BOTONES DE NAVEGACIÓN --- */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            {currentStep === 1 ? (
              <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            ) : (
              <button type="button" onClick={() => setCurrentStep((p) => p - 1)} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Atrás</button>
            )}

            {currentStep < TOTAL_STEPS ? (
              <button type="button" onClick={handleNext} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700">
                Siguiente
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar UNE'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
