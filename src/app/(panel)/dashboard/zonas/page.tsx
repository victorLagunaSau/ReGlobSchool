'use client';

import React, { useState } from 'react';
import { LayoutGrid, ClipboardCopy, Edit2, Check, X, ShieldAlert } from 'lucide-react';

// Interfaces de la nueva Arquitectura Relacional
interface CountryCatalog {
  id: string;
  name: string;
}

interface StateCatalog {
  id: string;
  countryId: string;
  name: string;
}

interface SchoolSegmentation {
  private: number;
  public: number;
  government: number;
}

interface Zone {
  id: string;
  countryId: string;
  stateId: string;
  city: string;
  schoolsPotential: SchoolSegmentation;
  schoolsOccupied: SchoolSegmentation;
  licensesSold: number;
  assignedTo: string;
}

export default function ZonasPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'bulk'>('list');
  const [bulkInput, setBulkInput] = useState('');

  // --- CATÁLOGOS NORMALIZADOS FIJOS ---
  const countries: CountryCatalog[] = [
    { id: 'MX', name: 'México' },
    { id: 'GT', name: 'Guatemala' }
  ];

  const states: StateCatalog[] = [
    { id: 'MX-AGS', countryId: 'MX', name: 'Aguascalientes' },
    { id: 'MX-BCN', countryId: 'MX', name: 'Baja California' },
    { id: 'MX-CHH', countryId: 'MX', name: 'Chihuahua' },
    { id: 'MX-NLE', countryId: 'MX', name: 'Nuevo León' },
    { id: 'MX-TAM', countryId: 'MX', name: 'Tamaulipas' },
    { id: 'GT-GUA', countryId: 'GT', name: 'Guatemala (Depto)' }
  ];

  // --- ESTADOS DE EDICIÓN ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    city: string;
    potPrivate: number;
    potPublic: number;
    potGov: number;
    occPrivate: number;
    occPublic: number;
    occGov: number;
    assignedTo: string;
  }>({ city: '', potPrivate: 0, potPublic: 0, potGov: 0, occPrivate: 0, occPublic: 0, occGov: 0, assignedTo: 'Libre' });

  // Data inicial con segmentación por tipo de sostenimiento
  const [zones, setZones] = useState<Zone[]>([
    {
      id: 'MX-BCN-Tijuana',
      countryId: 'MX',
      stateId: 'MX-BCN',
      city: 'Tijuana',
      schoolsPotential: { private: 120, public: 250, government: 50 },
      schoolsOccupied: { private: 8, public: 4, government: 0 },
      licensesSold: 9030,
      assignedTo: 'Emmanuel Guerrero'
    },
    {
      id: 'MX-CHH-Chihuahua',
      countryId: 'MX',
      stateId: 'MX-CHH',
      city: 'Chihuahua',
      schoolsPotential: { private: 60, public: 130, government: 20 },
      schoolsOccupied: { private: 0, public: 0, government: 0 },
      licensesSold: 0,
      assignedTo: 'Libre'
    }
  ]);

  // --- PROCESADOR DE COPIADO DIRECTO DE EXCEL ---
  const handleBulkLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;

    const lines = bulkInput.split('\n');
    const newZones: Zone[] = [];

    lines.forEach((line) => {
      const columns = line.split(/\t+/);
      if (columns.length >= 3) {
        const rawStateName = columns[0].trim();
        const rawCityCode = columns[1].trim();
        const totalPotential = parseInt(columns[2].trim(), 10) || 0;

        // Buscamos el estado mapeado en nuestro catálogo seguro para evitar variaciones de texto
        const matchedState = states.find(s => s.name.toLowerCase() === rawStateName.toLowerCase());

        if (matchedState) {
          const cityClean = rawCityCode.split('-')[1] ? rawCityCode.split('-')[1].trim() : rawCityCode;
          const cleanCityId = cityClean.replace(/\s+/g, '');
          const zoneId = `${matchedState.id}-${cleanCityId}`;

          // Por defecto en la carga masiva distribuimos equitativamente o lo mandamos a privados/públicos provisionalmente
          const privateEst = Math.round(totalPotential * 0.3);
          const publicEst = totalPotential - privateEst;

          newZones.push({
            id: zoneId,
            countryId: matchedState.countryId,
            stateId: matchedState.id,
            city: cityClean,
            schoolsPotential: { private: privateEst, public: publicEst, government: 0 },
            schoolsOccupied: { private: 0, public: 0, government: 0 },
            licensesSold: 0,
            assignedTo: 'Libre'
          });
        }
      }
    });

    setZones((prev) => [...prev, ...newZones]);
    setBulkInput('');
    setActiveTab('list');
  };

  const startEditing = (zone: Zone) => {
    setEditingId(zone.id);
    setEditForm({
      city: zone.city,
      potPrivate: zone.schoolsPotential.private,
      potPublic: zone.schoolsPotential.public,
      potGov: zone.schoolsPotential.government,
      occPrivate: zone.schoolsOccupied.private,
      occPublic: zone.schoolsOccupied.public,
      occGov: zone.schoolsOccupied.government,
      assignedTo: zone.assignedTo
    });
  };

  const saveEdit = (id: string) => {
    setZones((prev) =>
      prev.map((z) =>
        z.id === id
          ? {
              ...z,
              city: editForm.city,
              schoolsPotential: { private: editForm.potPrivate, public: editForm.potPublic, government: editForm.potGov },
              schoolsOccupied: { private: editForm.occPrivate, public: editForm.occPublic, government: editForm.occGov },
              assignedTo: editForm.assignedTo
            }
          : z
      )
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Control Territorial Multi-País</h1>
          <p className="text-xs text-slate-500">Segmentación por Sostenimiento (Privados, Públicos y Proyectos de Gobierno).</p>
        </div>

        <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'list' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={14} />
            Matriz de Zonas
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'bulk' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardCopy size={14} />
            Asimilador de Excel
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Ciudad / Entidad</th>
                  <th className="py-3 px-4 text-center">Potencial (Pr/Pu/Gob)</th>
                  <th className="py-3 px-4 text-center">Ocupadas (Pr/Pu/Gob)</th>
                  <th className="py-3 px-4 text-center">Licencias Totales</th>
                  <th className="py-3 px-4">Asignación Comercial</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {zones.map((zone) => {
                  const isEditing = editingId === zone.id;
                  const currentCountry = countries.find(c => c.id === zone.countryId)?.name || zone.countryId;
                  const currentState = states.find(s => s.id === zone.stateId)?.name || zone.stateId;

                  const totalPot = zone.schoolsPotential.private + zone.schoolsPotential.public + zone.schoolsPotential.government;
                  const totalOcc = zone.schoolsOccupied.private + zone.schoolsOccupied.public + zone.schoolsOccupied.government;

                  return (
                    <tr key={zone.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{currentState}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{currentCountry} • {zone.id}</div>
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-full focus:outline-blue-600"
                          />
                        ) : (
                          <span className="font-bold text-slate-800">{zone.city}</span>
                        )}
                      </td>

                      {/* Potenciales Desglosadas */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center text-xs">
                            <input type="number" title="Privadas" value={editForm.potPrivate} onChange={(e) => setEditForm({ ...editForm, potPrivate: Number(e.target.value) })} className="w-12 border rounded p-1 text-center" />
                            <input type="number" title="Públicas" value={editForm.potPublic} onChange={(e) => setEditForm({ ...editForm, potPublic: Number(e.target.value) })} className="w-12 border rounded p-1 text-center" />
                            <input type="number" title="Gobierno" value={editForm.potGov} onChange={(e) => setEditForm({ ...editForm, potGov: Number(e.target.value) })} className="w-12 border rounded p-1 text-center" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-slate-900">{totalPot}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({zone.schoolsPotential.private}/{zone.schoolsPotential.public}/{zone.schoolsPotential.government})</span>
                          </div>
                        )}
                      </td>

                      {/* Ocupadas Desglosadas */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center text-xs">
                            <input type="number" title="Privadas" value={editForm.occPrivate} onChange={(e) => setEditForm({ ...editForm, occPrivate: Number(e.target.value) })} className="w-12 border rounded p-1 text-center" />
                            <input type="number" title="Públicas" value={editForm.occPublic} onChange={(e) => setEditForm({ ...editForm, occPublic: Number(e.target.value) })} className="w-12 border rounded p-1 text-center" />
                            <input type="number" title="Gobierno" value={editForm.occGov} onChange={(e) => setEditForm({ ...editForm, occGov: Number(e.target.value) })} className="w-12 border rounded p-1 text-center" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-blue-600">{totalOcc}</span>
                            <span className="text-[10px] text-blue-400 font-mono">({zone.schoolsOccupied.private}/{zone.schoolsOccupied.public}/{zone.schoolsOccupied.government})</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-black text-emerald-600">
                        {zone.licensesSold.toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.assignedTo}
                            onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                            className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-full focus:outline-blue-600"
                          />
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${zone.assignedTo === 'Libre' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {zone.assignedTo}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEdit(zone.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md"><X size={16} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(zone)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md"><Edit2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl">
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3 text-xs">
            <ShieldAlert className="shrink-0 text-blue-600" size={16} />
            <div>
              <p className="font-bold">Asimilador de Excel Inteligente</p>
              <p className="mt-0.5 text-blue-700">El sistema validará el nombre del Estado contra el catálogo oficial (ej: Aguascalientes, Tamaulipas, Baja California). Las filas cuyos estados no coincidan se omitirán para mantener limpia la BD.</p>
            </div>
          </div>
          <form onSubmit={handleBulkLoad} className="space-y-4">
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={10}
              placeholder={`Tamaulipas\tTAM - Madero\t145\nBaja California\tBCN - Tijuana\t420`}
              className="w-full font-mono text-xs p-4 border border-slate-200 rounded-xl focus:outline-blue-600 bg-slate-50/50"
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setBulkInput('')} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Limpiar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Procesar e Inyectar Zonas</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}