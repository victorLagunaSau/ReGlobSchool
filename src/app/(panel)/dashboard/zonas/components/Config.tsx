'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Globe, Map, PlusCircle, Trash2 } from 'lucide-react';
import type { Country, StateRow } from '../page';

interface ConfigProps {
  countries: Country[];
  states: StateRow[];
  onRefresh: () => void;
}

export default function Config({ countries, states, onRefresh }: ConfigProps) {
  // Estados de los Formularios
  const [countryId, setCountryId] = useState('');
  const [countryName, setCountryName] = useState('');

  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [cveEstado, setCveEstado] = useState('');
  const [codEstado, setCodEstado] = useState('');
  const [stateName, setStateName] = useState('');

  const handleCreateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryId.trim() || !countryName.trim()) return;

    const cleanId = countryId.trim().toUpperCase().replace(/\s+/g, '');
    try {
      const { error } = await supabase.from('countries').insert({ id: cleanId, name: countryName.trim() });
      if (error) throw error;
      setCountryId('');
      setCountryName('');
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountryId || !cveEstado.trim() || !codEstado.trim() || !stateName.trim()) return;

    const cleanCodEstado = codEstado.trim().toUpperCase().replace(/\s+/g, '');
    const cleanStateId = `${selectedCountryId}-${cleanCodEstado}`;

    try {
      const { error } = await supabase.from('states').insert({
        id: cleanStateId,
        country_id: selectedCountryId,
        cve_estado: Number(cveEstado.trim()),
        cod_estado: cleanCodEstado,
        name: stateName.trim(),
      });
      if (error) throw error;
      setCveEstado('');
      setCodEstado('');
      setStateName('');
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!window.confirm('Esto también elimina en cascada todos los estados y zonas de este país. ¿Continuar?')) return;
    try {
      const { error } = await supabase.from('countries').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleDeleteState = async (id: string) => {
    if (!window.confirm('Esto también elimina en cascada todas las zonas de este estado. ¿Continuar?')) return;
    try {
      const { error } = await supabase.from('states').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECCIÓN DE FORMULARIOS DE REGISTRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Formulario de Países */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="text-blue-600" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Registrar País</h3>
          </div>
          <form onSubmit={handleCreateCountry} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">CÓDIGO (ISO)</label>
                <input type="text" placeholder="MX" value={countryId} onChange={(e) => setCountryId(e.target.value)} className="w-full border rounded-lg p-2 text-xs uppercase focus:outline-blue-600" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">NOMBRE DEL PAÍS</label>
                <input type="text" placeholder="México" value={countryName} onChange={(e) => setCountryName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
              </div>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-xs font-semibold py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <PlusCircle size={14} /> Guardar País
            </button>
          </form>
        </div>

        {/* Formulario de Estados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Map className="text-blue-600" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Registrar Estado (Mapeo Geopolítico)</h3>
          </div>
          <form onSubmit={handleCreateState} className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">PAÍS</label>
                <select value={selectedCountryId} onChange={(selected) => setSelectedCountryId(selected.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  <option value="">Selecciona...</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">CVE ESTADO</label>
                <input type="number" placeholder="01" value={cveEstado} onChange={(e) => setCveEstado(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">COD ESTADO</label>
                <input type="text" placeholder="AGS" value={codEstado} onChange={(e) => setCodEstado(e.target.value)} className="w-full border rounded-lg p-2 text-xs uppercase focus:outline-blue-600" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ESTADO</label>
                <input type="text" placeholder="Aguascalientes" value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
              </div>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-xs font-semibold py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <PlusCircle size={14} /> Guardar Estado
            </button>
          </form>
        </div>
      </div>

      {/* SECCIÓN DE TABLAS COMPACTAS POR PAÍS */}
      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2">Estructura General de Catálogos</h3>

        {countries.map((country) => {
          const countryStates = states.filter(s => s.country_id === country.id);

          return (
            <div key={country.id} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Header del País */}
              <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" /> {country.name} (ID Raíz: "{country.id}")
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-2 py-0.5 rounded-md">
                    {countryStates.length} Estados
                  </span>
                  <button
                    onClick={() => handleDeleteCountry(country.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded-md hover:bg-slate-800"
                    title="Eliminar País"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tabla Compacta */}
              {countryStates.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 text-center font-medium">
                  No hay subdivisiones o estados vinculados a este país todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2 px-4 w-[10%]">CveEstado</th>
                        <th className="py-2 px-4 w-[15%]">Pais</th>
                        <th className="py-2 px-4 w-[15%]">CodEstado</th>
                        <th className="py-2 px-4 w-[25%]">Estado</th>
                        <th className="py-2 px-4 w-[25%]">ID Relación</th>
                        <th className="py-2 px-4 text-right w-[10%]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {countryStates.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-4 font-mono font-bold text-slate-600">
                            {st.cve_estado ?? '—'}
                          </td>
                          <td className="py-2 px-4 text-slate-500">
                            {country.name}
                          </td>
                          <td className="py-2 px-4 font-mono font-bold text-blue-600">
                            {st.cod_estado ?? '—'}
                          </td>
                          <td className="py-2 px-4 font-bold text-slate-800">
                            {st.name}
                          </td>
                          <td className="py-2 px-4 font-mono text-[11px] text-slate-400">
                            {st.id}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <button
                              onClick={() => handleDeleteState(st.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-md"
                              title="Eliminar Estado"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
