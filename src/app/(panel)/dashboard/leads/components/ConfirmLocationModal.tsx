'use client';

import React, { useState, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Country, StateRow } from '../page';

interface Zone {
  id: string;
  city: string;
  state_id: string;
}

interface ConfirmLocationModalProps {
  isOpen: boolean;
  onConfirm: (stateId: string, zoneId: string) => void;
  onCancel: () => void;
  address: string;
  foundStateName: string | null;
  foundZoneName: string | null;
  countries: Country[];
  states: StateRow[];
  zones: Zone[];
  defaultCountryId?: string;
}

export default function ConfirmLocationModal({
  isOpen,
  onConfirm,
  onCancel,
  address,
  foundStateName,
  foundZoneName,
  countries,
  states,
  zones,
  defaultCountryId = 'MX',
}: ConfirmLocationModalProps) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedZone, setSelectedZone] = useState('');

  const filteredStates = useMemo(
    () => states.filter((s) => s.country_id === defaultCountryId),
    [states, defaultCountryId]
  );

  const filteredZones = useMemo(
    () => zones.filter((z) => z.state_id === selectedState),
    [zones, selectedState]
  );

  const handleConfirm = () => {
    if (!selectedState) {
      alert('Por favor selecciona un estado');
      return;
    }
    onConfirm(selectedState, selectedZone);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600" />
            <h2 className="text-base font-bold text-slate-950">Confirmar ubicación</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            <span className="font-medium">Dirección:</span> <span className="italic">{address}</span>
          </p>

          {foundStateName && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-800">
                ✓ <span className="font-medium">Estado encontrado:</span> {foundStateName}
              </p>
            </div>
          )}

          {!foundStateName && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠️ <span className="font-medium">Estado no encontrado en la dirección</span>
              </p>
            </div>
          )}

          {foundZoneName && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-800">
                ✓ <span className="font-medium">Zona encontrada:</span> {foundZoneName}
              </p>
            </div>
          )}

          {!foundZoneName && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠️ <span className="font-medium">Zona no encontrada en la dirección</span>
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="block text-[10px] font-bold text-slate-500">Estado *</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedZone('');
              }}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Selecciona un estado...</option>
              {filteredStates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedState && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500">Zona (opcional)</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Sin zona</option>
                {filteredZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
          >
            Confirmar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}
