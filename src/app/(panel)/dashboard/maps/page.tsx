'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { ArrowLeft, AlertTriangle, ClipboardList, MapPin, X } from 'lucide-react';
import MapView from '../../../../components/ui/MapView';
import StateMapView from '../../../../components/ui/StateMapView';

// Supabase/PostgREST limita cada respuesta a 1000 filas por default. La
// tabla zones ya supera esa cifra a nivel nacional (2000+), así que hay que
// paginar con .range() para traerlas todas — de lo contrario este mapa
// nacional se queda corto de zonas para estados que caen fuera de las
// primeras 1000 filas.
async function fetchAllZones(): Promise<any[]> {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from('zones')
            .select('*')
            .range(from, from + pageSize - 1);

        if (error || !data) break;
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
    }

    return allRows;
}

export default function MapsPage() {
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedCountryId, setSelectedCountryId] = useState<string>("MX");
    const [selectedState, setSelectedState] = useState<any | null>(null);
    // Datos completos (no solo el nombre) del estado bajo el cursor, para la vista previa de totales
    const [hoveredStateData, setHoveredStateData] = useState<any | null>(null);

    // Estado para la zona seleccionada específicamente (mediante clic en el mapa estatal)
    const [selectedZone, setSelectedZone] = useState<any | null>(null);
    const [hoveredZone, setHoveredZone] = useState<any | null>(null);

    // Filtro del listado informativo de zonas: 'todas' | 'ocupadas' | 'libres'
    const [zoneFilter, setZoneFilter] = useState<'todas' | 'ocupadas' | 'libres'>('todas');

    // 1. Carga inicial desde Supabase
    useEffect(() => {
        async function fetchData() {
            try {
                const [countriesRes, statesRes, allZones] = await Promise.all([
                    supabase.from('countries').select('id, name'),
                    supabase.from('states').select('id, country_id, cve_estado, cod_estado, name'),
                    fetchAllZones(),
                ]);

                setCountries(countriesRes.data || []);
                setStates(statesRes.data || []);
                setZones(allZones);
            } catch (error) {
                console.error("Error cargando datos de Supabase:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // 2. Cruce de analíticas por estado. zones.state_id es una FK real a states.id,
    // así que ya no hace falta el cruce difuso (CVEGEO.startsWith, etc.) de la versión Firestore.
    const getStatesWithAnalytics = () => {
        return states.map(stateItem => {
            const inegiCode = String(stateItem.cve_estado || "").padStart(2, '0');
            const stateId = stateItem.id;

            const stateZones = zones.filter(z => z.state_id === stateId);

            const zonasOcupadasList = stateZones.filter(z => {
                const val = z.assigned_to;
                if (val === null || val === undefined) return false;
                const cleanVal = String(val).trim().toLowerCase();
                if (cleanVal === "" || cleanVal === "libre") return false;
                return true;
            });

            const totalZonas = stateZones.length;
            const zonasOcupadas = zonasOcupadasList.length;
            const porcentajePresencia = totalZonas > 0 ? (zonasOcupadas / totalZonas) * 100 : 0;
            const totalCenso = stateZones.reduce((acc, z) => acc + (Number(z.licenses_censo) || 0), 0);
            const totalSold = stateZones.reduce((acc, z) => acc + (Number(z.licenses_sold) || 0), 0);

            // Adaptamos cada zona a la forma que ya esperan MapView/StateMapView
            const rawZonesAdapted = stateZones.map(z => ({
                id: z.id,
                stateId: z.state_id,
                countryId: z.country_id,
                CveMunicipio: z.cve_municipio,
                CVEGEO: z.cvegeo,
                Ciudad: z.city,
                city: z.city,
                assignedTo: z.assigned_to,
                schoolsPotential: z.schools_potential,
                licensesCenso: z.licenses_censo,
                licensesSold: z.licenses_sold,
            }));

            return {
                id: stateItem.id,
                CodEstado: stateItem.cod_estado,
                inegi: inegiCode,
                nombre: stateItem.name,
                totalZonas,
                zonasOcupadas,
                zonasLibres: totalZonas - zonasOcupadas,
                porcentajePresencia: Number(porcentajePresencia.toFixed(1)),
                tieneOcupacion: porcentajePresencia > 0,
                sinAsignar: totalZonas === 0,
                licensesCenso: totalCenso,
                licensesSold: totalSold,
                rawZones: rawZonesAdapted
            };
        });
    };

    // 3. Manejadores de interacción en el mapa nacional
    const handleStateHover = (mapStateFeature: any) => {
        // mapStateFeature ya trae las analíticas (totalZonas, zonasOcupadas, etc.) cruzadas en MapView
        setHoveredStateData(mapStateFeature || null);
    };

    const handleStateClick = (mapStateFeature: any) => {
        if (!mapStateFeature) return;

        const featureInegi = mapStateFeature.inegi || mapStateFeature.properties?.CVE_ENT;
        const featureName = mapStateFeature.nombre || mapStateFeature.geoName || mapStateFeature.properties?.NOMGEO;

        const unifiedStates = getStatesWithAnalytics();
        const found = unifiedStates.find(s =>
            s.inegi === String(featureInegi).padStart(2, '0') ||
            s.nombre?.toLowerCase() === featureName?.toLowerCase()
        );

        if (found) {
            setSelectedState(found);
            setSelectedZone(null); // Reset zona seleccionada al cambiar de estado
            setHoveredZone(null);
            setZoneFilter('todas');
        } else {
            setSelectedState({
                nombre: featureName,
                inegi: String(featureInegi || "").padStart(2, '0'),
                sinAsignar: true,
                totalZonas: 0,
                zonasOcupadas: 0,
                zonasLibres: 0,
                porcentajePresencia: 0,
                rawZones: []
            });
            setSelectedZone(null);
            setZoneFilter('todas');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 font-medium">Sincronizando bases de datos y mapas...</div>;
    }

    const mapDataList = getStatesWithAnalytics();
    const selectedStateZones = selectedState ? selectedState.rawZones || [] : [];

    const isZoneOcupada = (z: any) => {
        const val = z.assignedTo;
        if (!val) return false;
        const cleanVal = String(val).trim().toLowerCase();
        return cleanVal !== "" && cleanVal !== "libre";
    };

    const visibleZones = selectedStateZones.filter((z: any) => {
        if (zoneFilter === 'ocupadas') return isZoneOcupada(z);
        if (zoneFilter === 'libres') return !isZoneOcupada(z);
        return true;
    });

    return (
        <div className="h-full flex flex-col gap-8 pb-10">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-950 tracking-tight">Mapa de Cobertura y Zonas</h1>
                    <p className="text-slate-500 mt-2">Visualiza el avance nacional y audita municipio por municipio.</p>
                </div>

                {selectedState && (
                    <button
                        onClick={() => {
                            setSelectedState(null);
                            setSelectedZone(null);
                            setHoveredZone(null);
                            setZoneFilter('todas');
                        }}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        Volver al Mapa Nacional
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full max-w-7xl">

                {/* Columna Izquierda: Contenedor del Mapa */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-start mb-4 gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {selectedState ? selectedState.nombre : "México - Vista General"}
                            </h2>

                            {selectedState ? (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                                    <span>Clave Estado: <strong className="text-slate-700">{selectedState.CodEstado || '—'}</strong></span>
                                    <span>Clave INEGI: <strong className="text-slate-700">{selectedState.inegi}</strong></span>
                                    <span>Zonas: <strong className="text-slate-700">{selectedState.totalZonas}</strong></span>
                                    <span>Ocupadas: <strong className="text-blue-600">{selectedState.zonasOcupadas}</strong></span>
                                    <span>Libres: <strong className="text-slate-700">{selectedState.zonasLibres}</strong></span>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 mt-1">
                                    {hoveredStateData ? `Explorando: ${hoveredStateData.nombre || hoveredStateData.geoName}` : "Pasa el cursor sobre un estado para un vistazo rápido, o haz clic para auditarlo."}
                                </p>
                            )}
                        </div>

                        {selectedState && !selectedState.sinAsignar && (
                            <div className="text-right shrink-0">
                                <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Índice de Presencia</span>
                                <span className="text-lg font-bold text-blue-600">{selectedState.porcentajePresencia}%</span>
                            </div>
                        )}
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-slate-100">
                        {!selectedState ? (
                            <MapView
                                geoUrl={`/data/maps/${selectedCountryId}/${selectedCountryId}.geojson`}
                                data={mapDataList}
                                onStateHover={handleStateHover}
                                onStateClick={handleStateClick}
                            />
                        ) : (
                            <StateMapView
                                geoUrl={`/data/maps/${selectedCountryId}/${selectedState.inegi}.geojson`}
                                zonesData={selectedStateZones}
                                onZoneHover={(zoneInfo) => setHoveredZone(zoneInfo)}
                                onZoneClick={(zoneInfo) => setSelectedZone(zoneInfo)}
                            />
                        )}
                    </div>

                    {selectedState && hoveredZone && (
                        <p className="text-xs text-slate-400 mt-2">
                            Municipio: <strong className="text-slate-600">{hoveredZone.Ciudad || hoveredZone.city}</strong> ({hoveredZone.assignedTo || 'Libre'})
                        </p>
                    )}
                </div>

                {/* Columna Derecha: Listado Informativo de Zonas y Detalle de la Zona Seleccionada */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex-1 flex flex-col min-h-0 gap-6">
                        {/* VISTA PREVIA AL HOVER: solo totales agregados, sin listas, mientras el cursor
                            está sobre un estado del mapa nacional (desaparece al quitar el cursor) */}
                        {!selectedState && (
                            hoveredStateData ? (
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <h3 className="text-base font-extrabold text-slate-900">
                                        {hoveredStateData.nombre || hoveredStateData.geoName}
                                    </h3>

                                    {hoveredStateData.sinAsignar ? (
                                        <p className="text-xs text-slate-500 mt-2">Sin zonas comerciales registradas en Supabase.</p>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                                            <div>
                                                <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Zonas</span>
                                                <span className="text-lg font-bold text-slate-900">{hoveredStateData.totalZonas}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Ocupadas</span>
                                                <span className="text-lg font-bold text-blue-600">{hoveredStateData.zonasOcupadas}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Libres</span>
                                                <span className="text-lg font-bold text-slate-700">{hoveredStateData.zonasLibres}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Índice</span>
                                                <span className="text-lg font-bold text-blue-600">{hoveredStateData.porcentajePresencia}%</span>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-[11px] text-slate-400 mt-3 italic">Haz clic para auditar sus municipios.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Pasa el cursor sobre cualquier estado del mapa nacional para ver un resumen rápido, o haz clic para auditar sus municipios.
                                    </p>
                                </div>
                            )
                        )}

                        {selectedState?.sinAsignar && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-amber-800 font-medium text-sm">Este estado no cuenta con zonas comerciales registradas en Supabase.</p>
                            </div>
                        )}

                        {/* LISTADO INFORMATIVO (solo lectura) DE ZONAS: útil para confirmar datos de la BD
                            cuando el municipio es demasiado pequeño para interactuar con el mapa */}
                        {selectedState && !selectedState.sinAsignar && (
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex-1 flex flex-col min-h-0">
                                <div className="mb-3">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <ClipboardList size={15} className="text-slate-500" />
                                        Zonas Registradas
                                        <span className="text-xs font-normal text-slate-500 ml-1">({visibleZones.length})</span>
                                    </h3>

                                    <div className="flex justify-center border border-slate-200 bg-white rounded-lg p-0.5 gap-0.5 mt-2 w-fit mx-auto">
                                        {(['todas', 'ocupadas', 'libres'] as const).map((filterOption) => (
                                            <button
                                                key={filterOption}
                                                onClick={() => setZoneFilter(filterOption)}
                                                className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                                                    zoneFilter === filterOption
                                                        ? 'bg-slate-900 text-white'
                                                        : 'text-slate-500 hover:bg-slate-100'
                                                }`}
                                            >
                                                {filterOption}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {visibleZones.length > 0 ? (
                                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {visibleZones.map((z: any, idx: number) => {
                                            const isOcupada = z.assignedTo && String(z.assignedTo).trim().toLowerCase() !== "" && String(z.assignedTo).trim().toLowerCase() !== "libre";
                                            // Resalte pasivo (no interactivo) cuando coincide con la zona elegida en el mapa.
                                            // Gris, nunca azul: el azul queda reservado para "Ocupado".
                                            const isMapSelected = selectedZone?.id === z.id;

                                            return (
                                                <div
                                                    key={idx + (z.id || '')}
                                                    className={`w-full text-left p-2.5 rounded-lg text-xs space-y-1 border ${
                                                        isMapSelected
                                                            ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-300'
                                                            : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex justify-between font-bold">
                                                        <span>{z.Ciudad || z.city || "Municipio sin nombre"}</span>
                                                        <span className="text-slate-400">INEGI: {z.CVEGEO || z.CveMunicipio}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">ID: {z.id}</span>
                                                        <span className={isOcupada ? 'text-blue-600 font-semibold' : 'text-slate-400'}>
                                                            {isOcupada ? `Ocupado (${z.assignedTo})` : "Libre"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic py-2">No hay zonas que coincidan con este filtro.</p>
                                )}
                            </div>
                        )}

                        {/* DESGLOSE COMPLETO DE LA ZONA SELECCIONADA (vía clic en el mapa) */}
                        {selectedZone && (
                            <div className="p-4 bg-blue-900 text-white rounded-xl shadow-md space-y-2 animate-fadeIn">
                                <h4 className="font-bold text-sm border-b border-blue-800 pb-1 flex justify-between items-center">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={14} />
                                        Detalle de Zona
                                    </span>
                                    <button onClick={() => setSelectedZone(null)} className="flex items-center gap-1 text-xs text-blue-300 hover:text-white">
                                        <X size={13} />
                                        Cerrar
                                    </button>
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="text-blue-300">Municipio:</span> {selectedZone.Ciudad || selectedZone.city}</div>
                                    <div><span className="text-blue-300">CVEGEO:</span> {selectedZone.CVEGEO}</div>
                                    <div><span className="text-blue-300">Asignado a:</span> <strong className="text-amber-300">{selectedZone.assignedTo || 'Libre'}</strong></div>
                                    <div><span className="text-blue-300">Lic. Censo:</span> {selectedZone.licensesCenso?.toLocaleString() || 0}</div>
                                    <div><span className="text-blue-300">Escuelas Potencial:</span> {selectedZone.schoolsPotential?.toLocaleString() || 0}</div>
                                    <div><span className="text-blue-300">Estado ID:</span> {selectedZone.stateId}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedState && !selectedState.sinAsignar && !selectedZone && (
                        <div className="mt-4 text-center">
                            <span className="text-xs text-slate-400">Haz clic en un municipio del mapa para ver su información ampliada.</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}