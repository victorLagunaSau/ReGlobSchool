'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { X, MapPin, ChevronLeft } from 'lucide-react';
import StateMapView from '../../../../../components/ui/StateMapView';
import MapView from '../../../../../components/ui/MapView';
import type { Country, StateRow } from '../page';

interface Zone {
  id: string;
  country_id: string;
  state_id: string;
  city: string;
  assigned_to: string | null;
  CveMunicipio?: number;
  CVEGEO?: string;
  cve_municipio?: number;
  cvegeo?: string;
  assignedTo?: string;
}

interface MapZoneSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  states: StateRow[];
  zones: Zone[];
  onZonesSelected: (zoneIds: Set<string>, stateId?: string) => void;
}

function isZoneLibre(assignedTo: string | null | undefined): boolean {
  const val = (assignedTo || '').trim().toLowerCase();
  return val === '' || val === 'libre';
}

export default function MapZoneSelector({
  isOpen,
  onClose,
  countries,
  states,
  zones,
  onZonesSelected,
}: MapZoneSelectorProps) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);

  // Calcular ocupación por estado
  const stateOccupancy = useMemo(() => {
    const map: Record<string, { total: number; occupied: number; inegi: number | string; name: string }> = {};
    zones.forEach((z) => {
      if (!map[z.state_id]) {
        const stateInfo = states.find((s) => s.id === z.state_id);
        map[z.state_id] = {
          total: 0,
          occupied: 0,
          inegi: String((stateInfo?.cve_estado || '')).padStart(2, '0'),
          name: stateInfo?.name || z.state_id,
        };
      }
      map[z.state_id].total++;
      if (!isZoneLibre(z.assigned_to)) map[z.state_id].occupied++;
    });
    console.log('Estado Occupancy Calculated:', map);
    return map;
  }, [zones, states]);

  // Datos para el mapa nacional (INEGI code -> occupancy %)
  const nationalMapData = useMemo(() => {
    const mapData = Object.entries(stateOccupancy).map(([stateId, data]) => ({
      inegi: data.inegi,
      tieneOcupacion: data.occupied > 0,
      porcentajePresencia: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
      stateId,
      nombre: data.name,
    }));
    console.log('National Map Data:', mapData.slice(0, 5));
    return mapData;
  }, [stateOccupancy]);

  // Estados disponibles del país seleccionado
  const availableStates = useMemo(() => {
    return states
      .filter((s) => s.country_id === selectedCountry)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [states, selectedCountry]);

  // Zonas del estado seleccionado con info para el mapa
  const zonesForMap = useMemo(() => {
    return zones
      .filter((z) => z.state_id === selectedState)
      .map((z) => ({
        ...z,
        Ciudad: z.city,
        CveMunicipio: z.CveMunicipio || z.cve_municipio || 0,
        CVEGEO: z.CVEGEO || z.cvegeo || '',
      }));
  }, [zones, selectedState]);

  const stateRow = states.find((s) => s.id === selectedState);

  const handleCountrySelect = (countryId: string) => {
    setSelectedCountry(countryId);
    setSelectedState('');
    setSelectedZoneIds(new Set());
    setHoveredStateName(null);
  };

  const handleStateSelect = (stateId: string) => {
    setSelectedState(stateId);
    setSelectedZoneIds(new Set());
  };

  const handleMapStateHover = (stateInfo: any | null) => {
    if (!stateInfo) {
      setHoveredStateName(null);
      return;
    }
    if (stateInfo.nombre) {
      setHoveredStateName(stateInfo.nombre);
    } else if (stateInfo.geoName) {
      setHoveredStateName(stateInfo.geoName);
    }
  };

  const handleMapStateClick = (stateInfo: any) => {
    let targetState: StateRow | undefined;

    if (stateInfo.stateId) {
      targetState = states.find((s) => s.id === stateInfo.stateId);
    } else if (stateInfo.inegi) {
      const inegiNum = Number(stateInfo.inegi);
      targetState = states.find((s) => s.country_id === selectedCountry && s.cve_estado === inegiNum);
    }

    if (targetState) {
      handleStateSelect(targetState.id);
    }
  };

  const handleZoneClick = useCallback((zone: any) => {
    if (zone.id && isZoneLibre(zone.assigned_to)) {
      setSelectedZoneIds((prev) => {
        const next = new Set(prev);
        if (next.has(zone.id)) next.delete(zone.id);
        else next.add(zone.id);
        return next;
      });
    } else if (zone.CVEGEO) {
      const matchedZone = zonesForMap.find((z) => String(z.CVEGEO) === String(zone.CVEGEO));
      if (matchedZone && isZoneLibre(matchedZone.assigned_to)) {
        setSelectedZoneIds((prev) => {
          const next = new Set(prev);
          if (next.has(matchedZone.id)) next.delete(matchedZone.id);
          else next.add(matchedZone.id);
          return next;
        });
      }
    }
  }, [zonesForMap]);

  const handleConfirm = () => {
    if (selectedZoneIds.size > 0) {
      onZonesSelected(selectedZoneIds, selectedState);
      onClose();
      setSelectedCountry('');
      setSelectedState('');
      setSelectedZoneIds(new Set());
    }
  };

  const handleBack = () => {
    if (selectedState) {
      setSelectedState('');
      setSelectedZoneIds(new Set());
    } else if (selectedCountry) {
      setSelectedCountry('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-950">Agregar desde el mapa</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Seleccionar País */}
          {!selectedCountry && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Selecciona un país</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {countries.map((country) => (
                  <button
                    key={country.id}
                    onClick={() => handleCountrySelect(country.id)}
                    className={`p-3 border rounded-lg transition text-sm font-medium ${
                      selectedCountry === country.id
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-slate-900'
                    }`}
                  >
                    {country.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mapa Nacional para Seleccionar Estado */}
          {selectedCountry && !selectedState && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedCountry('')}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ChevronLeft size={14} /> Cambiar país
              </button>

              <div className="border border-blue-100 bg-blue-50/50 p-3 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-slate-900">Buscaremos en zonas de:</p>
                <p className="text-xs text-slate-600">Selecciona un estado del mapa haciendo clic para ver y elegir sus zonas disponibles</p>
                <div className="flex gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-300 rounded" />
                    <span className="text-slate-600">Ausencia</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    <span className="text-slate-600">Zona ocupada</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <MapView
                  geoUrl={selectedCountry === 'MX' ? '/data/maps/MX/MX.geojson' : ''}
                  data={nationalMapData}
                  onStateClick={handleMapStateClick}
                  onStateHover={handleMapStateHover}
                  overlay={
                    <p className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                      {hoveredStateName ? `Estado: ${hoveredStateName}` : 'Selecciona un estado haciendo clic en el mapa'}
                    </p>
                  }
                />
                <p className="text-xs text-slate-500 mt-2">
                  Azul oscuro = Mayor ocupación | Azul claro = Menor ocupación | Gris = Sin ocupación
                </p>
              </div>
            </div>
          )}

          {/* Mapa del Estado */}
          {selectedState && stateRow && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ChevronLeft size={14} /> Atrás
              </button>

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">{stateRow.name}</p>
                <p className="text-xs text-slate-600 mb-4">
                  Azul = Ocupado | Gris = Disponible (clickeable)
                </p>

                {/* Mapa */}
                <StateMapView
                  geoUrl={`/data/maps/MX/${stateRow.cve_estado.toString().padStart(2, '0')}.geojson`}
                  zonesData={zonesForMap}
                  onZoneClick={handleZoneClick}
                  selectedZoneIds={selectedZoneIds}
                />
              </div>

              {/* Leyenda de Colores */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded" />
                  <span className="text-slate-600">Ocupada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded" />
                  <span className="text-slate-600">Seleccionada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 rounded" />
                  <span className="text-slate-600">Disponible</span>
                </div>
              </div>

              {/* Zonas Seleccionadas */}
              {selectedZoneIds.size > 0 && (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/40">
                  <p className="text-xs font-bold text-blue-900 mb-2">
                    {selectedZoneIds.size} zona{selectedZoneIds.size !== 1 ? 's' : ''} seleccionada{selectedZoneIds.size !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {zonesForMap
                      .filter((z) => selectedZoneIds.has(z.id))
                      .sort((a, b) => {
                        const aOcupada = !isZoneLibre(a.assigned_to);
                        const bOcupada = !isZoneLibre(b.assigned_to);
                        if (aOcupada === bOcupada) return a.city.localeCompare(b.city);
                        return aOcupada ? 1 : -1;
                      })
                      .map((z) => (
                        <span
                          key={z.id}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg"
                        >
                          {z.city}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Cancelar
          </button>
          {selectedState && selectedZoneIds.size > 0 && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Agregar zonas a búsqueda
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
