'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Loader2, X, BarChart3 } from 'lucide-react';
import type { Country, StateRow } from '../page';

interface FormRegistrarZonaProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  states: StateRow[];
  onCreated: () => void;
}

export default function FormRegistrarZona({ isOpen, onClose, countries, states, onCreated }: FormRegistrarZonaProps) {
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [selectedState, setSelectedState] = useState(''); // Representa el stateId (Ej: MX-AGS)
  const [assignedTo, setAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Campos de la Estructura Geopolítica y Cartográfica
  const [cveMunicipio, setCveMunicipio] = useState('');
  const [cveGeo, setCveGeo] = useState('');
  const [ciudad, setCiudad] = useState('');

  // Campos de Proyección Censal
  const [schoolsPotential, setSchoolsPotential] = useState('');
  const [licensesCenso, setLicensesCenso] = useState('');

  if (!isOpen) return null;

  const filteredStates = states.filter(s => s.country_id === selectedCountry);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedState || !ciudad.trim() || !cveMunicipio.trim() || !cveGeo.trim()) {
      return alert('Por favor completa todos los campos de control territorial.');
    }

    setIsSaving(true);

    try {
      // Consulta consecutiva basada únicamente en el Estado (ID limpio sin canal)
      const { count } = await supabase
        .from('zones')
        .select('id', { count: 'exact', head: true })
        .eq('state_id', selectedState);

      const nextConsecutive = (count || 0) + 1;
      const paddedConsecutive = String(nextConsecutive).padStart(3, '0');

      // Formato de ID limpio requerido: MX-AGS-001
      const zoneId = `${selectedState}-${paddedConsecutive}`;

      const { error } = await supabase.from('zones').insert({
        id: zoneId,
        country_id: selectedCountry,
        state_id: selectedState,
        assigned_to: assignedTo.trim() || null,
        cve_municipio: Number(cveMunicipio.trim()),
        cvegeo: cveGeo.trim(),
        city: ciudad.trim(),
        schools_potential: Number(schoolsPotential) || 0,
        licenses_censo: Number(licensesCenso) || 0,
      });

      if (error) throw error;

      // Limpieza de estados
      setCveMunicipio('');
      setCveGeo('');
      setCiudad('');
      setSchoolsPotential('');
      setLicensesCenso('');
      setAssignedTo('Libre');
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error al guardar zona en Supabase:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-950 tracking-tight">Nueva Zona Comercial</h2>
            <p className="text-[11px] text-slate-400">Configuración e integración cartográfica de control territorial y censal.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateZone} className="space-y-4">

          {/* Bloque Geográfico Padre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">País</label>
              <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); }} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Estado vinculante</label>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                <option value="">Selecciona...</option>
                {filteredStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Bloque INEGI / Localidad */}
          <div className="border-t border-slate-100 pt-3 bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 mb-1">
              <BarChart3 size={13} className="text-slate-400" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Mapeo Geopolítico e Identificadores Oficiales</label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">CveMunicipio</label>
                <input type="number" placeholder="Ej. 1" value={cveMunicipio} onChange={(e) => setCveMunicipio(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">CVEGEO (Clave INEGI)</label>
                <input type="text" placeholder="Ej. 1001" value={cveGeo} onChange={(e) => setCveGeo(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Ciudad o Localidad</label>
                <input type="text" placeholder="Ej. Aguascalientes" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
              </div>
            </div>
          </div>

          {/* Bloque de Censo e Indicadores Iniciales */}
          <div className="border-t border-slate-100 pt-3 bg-blue-50/30 p-3 rounded-xl border border-blue-100/40 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-900 mb-1">
              <BarChart3 size={13} className="text-blue-500" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Datos Estadísticos Iniciales del Censo</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Escuelas Censo</label>
                <input type="number" placeholder="0" value={schoolsPotential} onChange={(e) => setSchoolsPotential(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Licencias Censo</label>
                <input type="number" placeholder="0" value={licensesCenso} onChange={(e) => setLicensesCenso(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
            </div>
          </div>

          {/* Bloque de Operadores */}
          <div className="border-t border-slate-100 pt-1">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Asignado a</label>
            <input type="text" placeholder="Sin asignar (se llena automático desde UNEs)" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Territorialidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
