'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Zone {
  id: string;
  city: string;
}

interface ZoneSelectorProps {
  zones: Zone[];
  selectedZoneIds: Set<string>;
  onSelectionChange: (zoneIds: Set<string>) => void;
  disabled?: boolean;
}

export default function ZoneSelector({
  zones,
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

  const sortedZones = [...zones].sort((a, b) => a.city.localeCompare(b.city));

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white focus:outline-blue-600 text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-300"
      >
        <span className="text-slate-700">{displayText}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
          {zones.length === 0 ? (
            <div className="p-3 text-[11px] text-slate-400 text-center">
              Sin zonas disponibles
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {sortedZones.map((zone) => (
                <label
                  key={zone.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
