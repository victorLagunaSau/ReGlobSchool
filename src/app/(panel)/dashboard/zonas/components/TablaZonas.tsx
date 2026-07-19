'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Edit2, Check, X, Building, ShieldCheck, Briefcase, Landmark, Trash2, PencilLine, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Lógica de filtrado combinado
  const filteredZones = useMemo(() => {
    return zones.filter((z: any) => {
      const matchesCity = z.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = filterState ? z.stateId === filterState : true;
      return matchesCity && matchesState;
    });
  }, [zones, searchTerm, filterState]);

  // Totales basados en el filtro
  const totals = useMemo(() => {
    return filteredZones.reduce((acc, z: any) => {
      const uneLic = z.uneLicenses || 0;
      const price = z.averageLicensePrice || 0;
      const commPct = z.commissionPercentage || 0;
      const val = uneLic * price;

      acc.schools += (z.schoolsPotential || 0);
      acc.licCenso += (z.licensesCenso || 0);
      acc.uneLic += uneLic;
      acc.marketVal += val;
      acc.commVal += (val * (commPct / 100));
      return acc;
    }, { schools: 0, licCenso: 0, uneLic: 0, marketVal: 0, commVal: 0 });
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
      city: editForm.city,
      schoolsPotential: Number(editForm.schoolsPotential),
      licensesCenso: Number(editForm.licensesCenso),
      uneMinLimit: Number(editForm.uneMinLimit),
      uneLicenses: Number(editForm.uneLicenses),
      averageLicensePrice: Number(editForm.averageLicensePrice),
      commissionPercentage: Number(editForm.commissionPercentage),
      assignedTo: editForm.assignedTo
    });
    setEditingId(null);
  };

  const handleDeleteZone = async (id: string, city: string) => {
    if (window.confirm(`¿Eliminar ${city}?`)) await deleteDoc(doc(db, 'zones', id));
  };

  const getChannelBadge = (channel: string) => {
    const badges: Record<string, React.ReactNode> = {
      PR: <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-100"><Building size={9} /> PRIVADA</span>,
      PU: <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100"><ShieldCheck size={9} /> PÚBLICA</span>,
      GB: <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100"><Landmark size={9} /> GOBIERNO</span>,
      PE: <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100"><Briefcase size={9} /> PROY. ESP</span>,
    };
    return badges[channel] || <span className="text-[9px] font-mono font-bold uppercase bg-slate-100 px-1.5 py-0.5 text-slate-600">{channel}</span>;
  };

  return (
  <div className="space-y-6 animate-fade-in">
    {/* 1. KPIs Superiores */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
        { label: 'CENSO INEGI', val: `${totals.schools.toLocaleString()} Escuelas`, sub: `${totals.licCenso.toLocaleString()} Licencias` },
        { label: 'PROYECCIÓN ESTIMADA', val: `${totals.uneLic.toLocaleString()} Metas UNE`, sub: 'Licencias' },
        { label: 'CAPITAL ESTIMADO', val: `$${totals.marketVal.toLocaleString()}`, sub: 'Valor de Mercado', color: 'text-blue-700' },
        { label: 'UTILIDAD (COMISIÓN)', val: `$${totals.commVal.toLocaleString()}`, sub: 'Proyectada', color: 'text-emerald-600' }
      ].map((kpi, i) => (
        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase">{kpi.label}</p>
          <div className={`text-sm font-black text-slate-900 ${kpi.color}`}>{kpi.val}</div>
          <p className="text-[10px] text-slate-500 font-medium">{kpi.sub}</p>
        </div>
      ))}
    </div>

    {/* 2. Filtros y Búsqueda */}
    <div className="flex gap-3 bg-white p-3 rounded-xl border border-slate-200">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        <input className="w-full pl-9 py-2 text-xs border rounded-lg" placeholder="Buscar por ciudad..." onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
      </div>
      <select className="text-xs border rounded-lg px-3" onChange={(e) => { setFilterState(e.target.value); setCurrentPage(1); }}>
        <option value="">Todos los Estados</option>
        {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>

    {/* 3. Paginación Superior */}
    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1">
      <span>Página {currentPage} de {totalPages}</span>
      <div className="flex gap-2">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50"><ChevronLeft size={14} /></button>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-slate-50"><ChevronRight size={14} /></button>
      </div>
    </div>

    {/* 4. Tabla (Estructura favorita) */}
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 w-[16%]">Clave / Territorio</th>
              <th className="py-3 px-4 w-[18%]">Ciudad / Canal</th>
              <th className="py-3 px-4 text-center w-[15%] bg-slate-100/30">Censo INEGI</th>
              <th className="py-3 px-4 text-center w-[15%]">Plan Ventas UNE</th>
              <th className="py-3 px-4 text-center w-[22%] bg-blue-50/20">Valor Esperado Mercado</th>
              <th className="py-3 px-4 w-[10%]">Asignado</th>
              <th className="py-3 px-4 text-center w-[5%]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {paginatedZones.map((zone: any) => {
              const isEditing = editingId === zone.id;
              const currentState = states.find(s => s.id === zone.stateId)?.name || zone.stateId;
              const uneLic = zone.uneLicenses || 0;
              const price = zone.averageLicensePrice || 0;
              const commPct = zone.commissionPercentage || 0;
              const expectedTotalValue = uneLic * price;
              const projectedCommission = expectedTotalValue * (commPct / 100);

              return (
                <tr key={zone.id} className={`transition-colors ${isEditing ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}>
                  <td className="py-3 px-4 relative">
                    {isEditing && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l" />}
                    <div className="font-mono text-[11px] text-blue-600 font-bold uppercase">{zone.id}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{currentState}</div>
                  </td>
                  <td className="py-3 px-4">
                    {isEditing ? <input value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} className="border border-blue-400 rounded px-1 text-xs w-full" /> : <div className="font-bold text-slate-900">{zone.city}</div>}
                    <div className="mt-0.5">{getChannelBadge(zone.channel)}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                     <div className="text-slate-800 text-xs">{zone.licensesCenso?.toLocaleString()} <span className="text-[9px] text-slate-400">LIC</span></div>
                     <div className="text-[10px] text-slate-400">{zone.schoolsPotential || 0} escuelas</div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                     <div className="text-slate-900 font-black text-xs">{uneLic.toLocaleString()} <span className="text-[9px] text-slate-400">META</span></div>
                     <div className="text-[10px] text-orange-600 font-bold">Min Esc: {(zone.uneMinLimit || 0).toLocaleString()}</div>
                  </td>
                  <td className="py-3 px-4 bg-blue-50/10 text-center font-mono">
                    <div className="text-[11px] font-black text-slate-800">Total: ${expectedTotalValue.toLocaleString()}</div>
                    <div className="text-[10px] text-blue-700 font-bold">Comisión ({commPct}%): ${projectedCommission.toLocaleString()}</div>
                  </td>
                  <td className="py-3 px-4">
                    {isEditing ? <input value={editForm.assignedTo} onChange={(e) => setEditForm({...editForm, assignedTo: e.target.value})} className="border border-blue-400 rounded px-1 text-xs w-full" /> : <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${zone.assignedTo === 'Libre' ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}>{zone.assignedTo}</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isEditing ? <div className="flex gap-1 justify-center"><button onClick={() => saveEdit(zone.id)}><Check size={14}/></button><button onClick={() => setEditingId(null)}><X size={14}/></button></div> : <div className="flex gap-1.5 justify-center"><button onClick={() => startEditing(zone)}><Edit2 size={13}/></button><button onClick={() => handleDeleteZone(zone.id, zone.city)}><Trash2 size={13}/></button></div>}
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


