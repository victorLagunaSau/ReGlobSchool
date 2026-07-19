'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Globe, Map, PlusCircle, Loader2, Trash2 } from 'lucide-react';

interface Country {
  id: string;
  name: string;
}

interface State {
  id: string;
  countryId: string;
  name: string;
}

export default function Config() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de los Formularios
  const [countryId, setCountryId] = useState('');
  const [countryName, setCountryName] = useState('');

  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [stateName, setStateName] = useState('');

  // Escucha en Tiempo Real desde Firestore
  useEffect(() => {
    const unsubCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      setCountries(snapshot.docs.map(d => d.data() as Country));
    });

    const unsubStates = onSnapshot(collection(db, 'states'), (snapshot) => {
      setStates(snapshot.docs.map(d => d.data() as State));
      setLoading(false);
    });

    return () => {
      unsubCountries();
      unsubStates();
    };
  }, []);

  const handleCreateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryId.trim() || !countryName.trim()) return;

    const cleanId = countryId.trim().toUpperCase().replace(/\s+/g, '');
    try {
      await setDoc(doc(db, 'countries', cleanId), {
        id: cleanId,
        name: countryName.trim()
      });
      setCountryId('');
      setCountryName('');
    } catch (err) { console.error(err); }
  };

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountryId || !stateId.trim() || !stateName.trim()) return;

    const cleanSubId = stateId.trim().toUpperCase().replace(/\s+/g, '').replace(`${selectedCountryId}-`, '');
    const cleanStateId = `${selectedCountryId}-${cleanSubId}`;

    try {
      await setDoc(doc(db, 'states', cleanStateId), {
        id: cleanStateId,
        countryId: selectedCountryId,
        name: stateName.trim()
      });
      setStateId('');
      setStateName('');
    } catch (err) { console.error(err); }
  };

  // --- LÓGICA DE ELIMINACIÓN CON CONFIRMACIÓN ---
  const handleDeleteCountry = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar el país "${name}" (${id})?\n\n⚠️ NOTA: Esto no borrará automáticamente los estados vinculados a él en Firestore.`
    );

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'countries', id));
      } catch (err) {
        console.error("Error al eliminar el país:", err);
      }
    }
  };

  const handleDeleteState = async (id: string, name: string) => {
    const confirmed = window.confirm(`¿Seguro que deseas eliminar el estado/depto "${name}" (${id})?`);

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'states', id));
      } catch (err) {
        console.error("Error al eliminar el estado:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );
  }

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
                <input type="text" placeholder="GT" value={countryId} onChange={(e) => setCountryId(e.target.value)} className="w-full border rounded-lg p-2 text-xs uppercase focus:outline-blue-600" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">NOMBRE DEL PAÍS</label>
                <input type="text" placeholder="Guatemala" value={countryName} onChange={(e) => setCountryName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Registrar Estado / Depto</h3>
          </div>
          <form onSubmit={handleCreateState} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">PAÍS</label>
                <select value={selectedCountryId} onChange={(e) => setSelectedCountryId(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  <option value="">Selecciona...</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">CLAVE (EJ: SMR)</label>
                <input type="text" placeholder="SMR" value={stateId} onChange={(e) => setStateId(e.target.value)} className="w-full border rounded-lg p-2 text-xs uppercase focus:outline-blue-600" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">NOMBRE</label>
                <input type="text" placeholder="San Marcos" value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
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
          const countryStates = states.filter(s => s.countryId === country.id);

          return (
            <div key={country.id} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Header del País */}
              <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" /> {country.name} (ID Raíz: "{country.id}")
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-2 py-0.5 rounded-md">
                    {countryStates.length} Registrados
                  </span>
                  <button
                    onClick={() => handleDeleteCountry(country.id, country.name)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded-md hover:bg-slate-800"
                    title="Eliminar País"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Formato Tabla Tradicional Compacta */}
              {countryStates.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 text-center font-medium">
                  No hay subdivisiones o estados vinculados a este país todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2 px-4 w-1/3">Nombre Oficial</th>
                        <th className="py-2 px-4 w-1/3">ID de Relación (Firestore Document ID)</th>
                        <th className="py-2 px-4 w-1/6">Código Padre</th>
                        <th className="py-2 px-4 text-right w-1/12">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {countryStates.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-4 font-bold text-slate-800">
                            {st.name}
                          </td>
                          <td className="py-2 px-4 font-mono text-[11px] text-blue-600 font-medium">
                            {st.id}
                          </td>
                          <td className="py-2 px-4 text-slate-400 font-mono font-bold">
                            {st.countryId}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <button
                              onClick={() => handleDeleteState(st.id, st.name)}
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