'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Zone {
  id: string;
  city: string;
}

interface ZoneSelectorProps {
  libres: Zone[];
  ocupadas: Zone[];
  selectedZoneIds: Set<string>;
  onSelectionChange: (zoneIds: Set<string>) => void;
  disabled?: boolean;
}

export default function ZoneSelector({
  libres,
  ocupadas,
  selectedZoneIds,
  onSelectionChange,
  disabled = false,
}: ZoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleZone = (zoneId: string) => {
    const newSelection = new Set(selectedZoneIds);
    if (newSelection.has(zoneId)) {
      newSelection.delete(zoneId);
    } else {
      newSelection.add(zoneId);
    }
    onSelectionChange(newSelection);
  };

  const selectedCount = selectedZoneIds.size;
  const displayText = selectedCount === 0
    ? 'Selecciona zonas...'
    : `${selectedCount} zona${selectedCount !== 1 ? 's' : ''} seleccionada${selectedCount !== 1 ? 's' : ''}`;

  const totalZones = libres.length + ocupadas.length;

  // Mostrar zonas libres y ocupadas
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="appearance-none bg-transparent text-sm font-medium text-slate-900 border-b-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-none pb-1 cursor-pointer pr-4 min-w-[140px] flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-slate-700 text-sm">{displayText}</span>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
          {libres.length === 0 && ocupadas.length === 0 ? (
            <div className="p-3 text-[11px] text-slate-400 text-center">
              Sin zonas disponibles
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {/* Zonas Libres */}
              {libres.map((zone) => (
                <label
                  key={zone.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedZoneIds.has(zone.id)}
                    onChange={() => handleToggleZone(zone.id)}
                    className="rounded accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 flex-1">{zone.city}</span>
                  {selectedZoneIds.has(zone.id) && (
                    <span className="text-[10px] text-blue-600 font-semibold">✓</span>
                  )}
                </label>
              ))}

              {/* Separador */}
              {libres.length > 0 && ocupadas.length > 0 && (
                <div className="border-t-2 border-slate-200 my-1" />
              )}

              {/* Zonas Ocupadas */}
              {ocupadas.map((zone) => (
                <label
                  key={zone.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-b-0 bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedZoneIds.has(zone.id)}
                    onChange={() => handleToggleZone(zone.id)}
                    className="rounded accent-slate-400 cursor-pointer opacity-60"
                  />
                  <span className="text-xs text-slate-500 flex-1 opacity-60">{zone.city}</span>
                  {selectedZoneIds.has(zone.id) && (
                    <span className="text-[10px] text-slate-400 font-semibold">✓</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
