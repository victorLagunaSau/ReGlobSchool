'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Edit2, Check, X, Trash2, Search, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

interface TablaZonasProps {
  countries: any[];
  states: any[];
}

export default function TablaZonas({ countries, states }: TablaZonasProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Estados de Filtro y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'zones'), (snapshot) => {
      setZones(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);
 console.log(zones.map(z => `${z.id} | ${z.Pais} | ${z.CodEstado} | ${z.Estado} | ${z.CveMunicipio} | ${z.CVEGEO} | ${z.Ciudad} | ${z.assignedTo} | ${z.countryId}`));

  // Lógica de filtrado combinado mapeada a la estructura cartográfica
  const filteredZones = useMemo(() => {
    return zones.filter((z: any) => {
      const cityName = z.Ciudad || z.city || '';
      const matchesCity = cityName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = filterState ? z.stateId === filterState : true;
      return matchesCity && matchesState;
    });
  }, [zones, searchTerm, filterState]);

  // Totales de control basados exclusivamente en la proyección del Censo
  const totals = useMemo(() => {
    return filteredZones.reduce((acc, z: any) => {
      acc.schools += (z.schoolsPotential || 0);
      acc.licCenso += (z.licensesCenso || 0);
      return acc;
    }, { schools: 0, licCenso: 0 });
  }, [filteredZones]);

  // Paginación
  const totalPages = Math.ceil(filteredZones.length / itemsPerPage) || 1;
  const paginatedZones = filteredZones.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const startEditing = (zone: any) => {
    setEditingId(zone.id);
    setEditForm({ ...zone });
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, 'zones', id), {
      Ciudad: editForm.Ciudad,
      city: editForm.Ciudad, // Sincronizado por retrocompatibilidad
      CveMunicipio: Number(editForm.CveMunicipio),
      CVEGEO: editForm.CVEGEO,
      schoolsPotential: Number(editForm.schoolsPotential),
      licensesCenso: Number(editForm.licensesCenso),
      assignedTo: editForm.assignedTo
    });
    setEditingId(null);
  };

  const handleDeleteZone = async (id: string, city: string) => {
    if (window.confirm(`¿Eliminar de forma permanente el territorio cartográfico de ${city}?`)) {
      await deleteDoc(doc(db, 'zones', id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. KPIs Superiores Cartográficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'COBERTURA TERRITORIAL', val: `${filteredZones.length} Municipios`, sub: 'Zonas Activas registradas' },
          { label: 'CENSO TOTAL ESCUELAS', val: `${totals.schools.toLocaleString()} Planteles`, sub: 'Potencial total de la muestra' },
          { label: 'PROYECCIÓN CENSO LICENCIAS', val: `${totals.licCenso.toLocaleString()} Alumnos / Licencias`, sub: 'Universo proyectado global', color: 'text-blue-700' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase">{kpi.label}</p>
            <div className={`text-sm font-black text-slate-900 ${kpi.color || ''}`}>{kpi.val}</div>
            <p className="text-[10px] text-slate-500 font-medium">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="flex gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="w-full pl-9 py-2 text-xs border rounded-lg"
            placeholder="Buscar por ciudad o municipio..."
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          className="text-xs border rounded-lg px-3 bg-white"
          onChange={(e) => { setFilterState(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Todos los Estados</option>
          {states.map((s: any) => <option key={s.id} value={s.id}>{s.name || s.Estado}</option>)}
        </select>
      </div>

      {/* 3. Paginación Superior */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1">
        <span>Página {currentPage} de {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={14} /></button>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* 4. Tabla Geopolítica Oficial */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-[15%]">Clave / Territorio</th>
                <th className="py-3 px-4 w-[20%]">Localidad / Estado</th>
                <th className="py-3 px-4 text-center w-[12%]">Cve Municipio</th>
                <th className="py-3 px-4 text-center w-[15%] bg-slate-100/30">CVEGEO (INEGI)</th>
                <th className="py-3 px-4 text-center w-[18%] bg-blue-50/20">Escuelas Censo</th>
                <th className="py-3 px-4 text-center w-[18%] bg-blue-50/20">Licencias Censo</th>
                <th className="py-3 px-4 w-[12%]">Asignado</th>
                <th className="py-3 px-4 text-center w-[5%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedZones.map((zone: any) => {
                const isEditing = editingId === zone.id;
                const displayCity = zone.Ciudad || zone.city || '—';
                const displayState = zone.Estado || states.find(s => s.id === zone.stateId)?.name || zone.stateId || '—';
                const displayCountry = zone.Pais || zone.countryId || '—';

                return (
                  <tr key={zone.id} className={`transition-colors ${isEditing ? 'bg-blue-50/40 hover:bg-blue-50/50' : 'hover:bg-slate-50/60'}`}>

                    {/* COLUMNA 1: CLAVE + RELACIÓN ID */}
                    <td className="py-3 px-4 relative">
                      {isEditing && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l" />}
                      <div className="font-mono text-[11px] text-blue-600 font-bold uppercase tracking-wider">{zone.id}</div>
                      <div className="text-[9px] text-slate-400 font-medium font-mono">{zone.countryId}</div>
                    </td>

                    {/* COLUMNA 2: LOCALIDAD / ESTADO */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.Ciudad || ''}
                          onChange={(e) => setEditForm({...editForm, Ciudad: e.target.value})}
                          className="border border-blue-400 rounded px-2 py-1 text-xs w-full focus:outline-blue-600 bg-white font-bold shadow-inner"
                        />
                      ) : (
                        <div className="font-bold text-slate-900 text-sm truncate max-w-[180px]" title={displayCity}>
                          {displayCity}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400" /> {displayState}, {displayCountry}
                      </div>
                    </td>

                    {/* COLUMNA 3: CVE MUNICIPIO */}
                    <td className="py-3 px-4 text-center font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.CveMunicipio || ''}
                          onChange={(e) => setEditForm({...editForm, CveMunicipio: e.target.value})}
                          className="w-16 border border-slate-300 rounded text-center text-xs p-1 focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-700 font-semibold">{zone.CveMunicipio ?? '—'}</span>
                      )}
                    </td>

                    {/* COLUMNA 4: CVEGEO (INEGI) */}
                    <td className="py-3 px-4 text-center font-mono bg-slate-100/10">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.CVEGEO || ''}
                          onChange={(e) => setEditForm({...editForm, CVEGEO: e.target.value})}
                          className="w-24 border border-slate-300 rounded text-center text-xs p-1 focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">{zone.CVEGEO ?? '—'}</span>
                      )}
                    </td>

                    {/* COLUMNA 5: ESCUELAS CENSO */}
                    <td className="py-3 px-4 text-center font-mono bg-blue-50/5">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.schoolsPotential || 0}
                          onChange={(e) => setEditForm({...editForm, schoolsPotential: e.target.value})}
                          className="w-20 border border-slate-300 rounded text-center text-xs p-1 focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <div className="text-slate-800 font-semibold text-xs">
                          {(zone.schoolsPotential || 0).toLocaleString()} <span className="text-[9px] font-sans font-bold text-slate-400">ESC.</span>
                        </div>
                      )}
                    </td>

                    {/* COLUMNA 6: LICENCIAS CENSO */}
                    <td className="py-3 px-4 text-center font-mono bg-blue-50/5">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.licensesCenso || 0}
                          onChange={(e) => setEditForm({...editForm, licensesCenso: e.target.value})}
                          className="w-24 border border-slate-300 rounded text-center text-xs p-1 focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <div className="text-blue-700 font-black text-xs">
                          {(zone.licensesCenso || 0).toLocaleString()} <span className="text-[9px] font-sans font-bold text-blue-400">LIC.</span>
                        </div>
                      )}
                    </td>

                    {/* COLUMNA 7: ASIGNADO */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.assignedTo || ''}
                          onChange={(e) => setEditForm({...editForm, assignedTo: e.target.value})}
                          className="border border-blue-400 rounded px-2 py-1 text-xs w-full focus:outline-blue-600 bg-white"
                        />
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${zone.assignedTo === 'Libre' ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-xs'}`}>
                          {zone.assignedTo || 'Libre'}
                        </span>
                      )}
                    </td>

                    {/* COLUMNA 8: ACCIONES */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => saveEdit(zone.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Guardar"><Check size={15} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancelar"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => startEditing(zone)} disabled={editingId !== null} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md disabled:opacity-30" title="Editar"><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteZone(zone.id, displayCity)} disabled={editingId !== null} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md disabled:opacity-30" title="Eliminar"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}