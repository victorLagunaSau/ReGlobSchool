'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { Search, Trash2, MapPinned } from 'lucide-react';
import type { UneRow, Distribution, CommercialPartner, StateRow, Country, UneType } from '../page';

interface TablaUnesProps {
  unes: UneRow[];
  distributions: Distribution[];
  partners: CommercialPartner[];
  states: StateRow[];
  countries: Country[];
  uneTypes: UneType[];
  onRefresh: () => void;
}

function calcGananciaTotal(u: UneRow) {
  if (u.real_selling_price == null || u.agreed_departure_price == null) return null;
  const gananciaPorLicencia = u.real_selling_price - u.agreed_departure_price;
  return gananciaPorLicencia * (u.projected_licenses || 0);
}

export default function TablaUnes({ unes, partners, states, countries, uneTypes, onRefresh }: TablaUnesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterType, setFilterType] = useState('');

  const filteredUnes = useMemo(() => {
    return unes.filter((u) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term
        || u.distribution_name.toLowerCase().includes(term)
        || u.une_type_titulo.toLowerCase().includes(term)
        || u.producto_nombre.toLowerCase().includes(term);
      const matchesCountry = filterCountry ? u.country_id === filterCountry : true;
      const matchesState = filterState ? u.state_id === filterState : true;
      const matchesPartner = filterPartner ? u.commercial_partner_id === filterPartner : true;
      const matchesType = filterType ? u.une_type_id === filterType : true;
      return matchesSearch && matchesCountry && matchesState && matchesPartner && matchesType;
    });
  }, [unes, searchTerm, filterCountry, filterState, filterPartner, filterType]);

  const handleDelete = async (id: string, distributionName: string) => {
    if (!window.confirm(`¿Eliminar de forma permanente la UNE de "${distributionName}"? También se eliminan sus vínculos con zonas.`)) return;
    const { error } = await supabase.from('unes').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar UNE:', error);
      return;
    }
    onRefresh();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Búsqueda */}
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="w-full pl-9 py-2 text-xs border rounded-lg"
            placeholder="Buscar por distribución, tipo o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mt-3">
          <select className="text-xs border rounded-lg px-3 py-2 bg-white" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="">Todos los Países</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="text-xs border rounded-lg px-3 py-2 bg-white" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="">Todos los Estados</option>
            {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="text-xs border rounded-lg px-3 py-2 bg-white" value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)}>
            <option value="">Todos los Socios Comerciales</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </select>
          <select className="text-xs border rounded-lg px-3 py-2 bg-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Todos los Tipos</option>
            {uneTypes.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-[18%]">Distribución</th>
                <th className="py-3 px-4 w-[15%]">Tipo de UNE</th>
                <th className="py-3 px-4 w-[12%]">Producto</th>
                <th className="py-3 px-4 w-[15%]">Ubicación</th>
                <th className="py-3 px-4 text-center w-[10%]">Zonas</th>
                <th className="py-3 px-4 text-center w-[10%]">Licencias Proy.</th>
                <th className="py-3 px-4 text-right w-[15%] bg-blue-50/20">Ganancia Total</th>
                <th className="py-3 px-4 text-center w-[5%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUnes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">No hay UNEs que coincidan con los filtros.</td>
                </tr>
              ) : (
                filteredUnes.map((u) => {
                  const gananciaTotal = calcGananciaTotal(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/unes/${u.id}`} className="font-bold text-blue-700 hover:text-blue-800 hover:underline text-sm">
                          {u.distribution_name}
                        </Link>
                        {u.commercial_partner_name && (
                          <div className="text-[10px] text-slate-400 font-medium">Socio: {u.commercial_partner_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{u.une_type_titulo}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{u.producto_nombre}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {u.state_name}, {u.country_name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          <MapPinned size={11} /> {u.zone_ids.length}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{(u.projected_licenses || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-black bg-blue-50/5">
                        {gananciaTotal != null ? (
                          <span className={gananciaTotal >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            ${gananciaTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(u.id, u.distribution_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
