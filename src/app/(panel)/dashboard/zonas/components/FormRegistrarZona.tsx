'use client';

import React, { useState } from 'react';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Loader2, X, BarChart3, ShieldCheck } from 'lucide-react';

interface FormRegistrarZonaProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Array<{ id: string; name: string }>;
  states: Array<{ id: string; countryId: string; name: string }>;
}

export default function FormRegistrarZona({ isOpen, onClose, countries, states }: FormRegistrarZonaProps) {
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [selectedState, setSelectedState] = useState('');
  const [city, setCity] = useState('');
  const [channel, setChannel] = useState('PR');

  // Datos de Censo (INEGI)
  const [schoolsPotential, setSchoolsPotential] = useState(0);
  const [licensesCenso, setLicensesCenso] = useState(0);

  // Métricas Operativas de la UNE y Comisión
  const [uneMinLimit, setUneMinLimit] = useState(0);
  const [uneLicenses, setUneLicenses] = useState(0);
  const [averageLicensePrice, setAverageLicensePrice] = useState(450); // Inicializado en tu estándar de 450
  const [commissionPercentage, setCommissionPercentage] = useState(30); // Inicializado en tu estándar del 30%

  const [assignedTo, setAssignedTo] = useState('Libre');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const filteredStates = states.filter(s => s.countryId === selectedCountry);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedState || !city.trim()) return alert('Por favor selecciona el estado y escribe la ciudad.');

    setIsSaving(true);

    try {
      const zonesRef = collection(db, 'zones');
      const q = query(zonesRef, where('stateId', '==', selectedState), where('channel', '==', channel));
      const querySnapshot = await getDocs(q);
      const nextConsecutive = querySnapshot.size + 1;
      const paddedConsecutive = String(nextConsecutive).padStart(3, '0');

      const zoneId = `${selectedState}-${channel}-${paddedConsecutive}`;
      const zoneDocRef = doc(db, 'zones', zoneId);

      await setDoc(zoneDocRef, {
        id: zoneId,
        countryId: selectedCountry,
        stateId: selectedState,
        city: city.trim(),
        channel: channel,

        schoolsPotential: Number(schoolsPotential),
        licensesCenso: Number(licensesCenso),

        uneMinLimit: Number(uneMinLimit),
        uneLicenses: Number(uneLicenses),
        averageLicensePrice: Number(averageLicensePrice),
        commissionPercentage: Number(commissionPercentage), // Nuevo campo de incentivo

        licensesSold: 0,
        schoolsOccupied: 0,
        assignedTo: assignedTo
      });

      setCity('');
      setSchoolsPotential(0);
      setLicensesCenso(0);
      setUneMinLimit(0);
      setUneLicenses(0);
      setAverageLicensePrice(450);
      setCommissionPercentage(30);
      setChannel('PR');
      setAssignedTo('Libre');
      onClose();
    } catch (error) {
      console.error('Error al guardar zona en Firestore:', error);
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
            <p className="text-[11px] text-slate-400">Configuración territorial, censal y potencial de ingresos de la UNE.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateZone} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">País</label>
              <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); }} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Estado / Depto</label>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                <option value="">Selecciona...</option>
                {filteredStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Ciudad / Municipio Base</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. Matamoros" className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Segmento / Canal de Venta</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white font-bold text-slate-800 focus:outline-blue-600">
                <option value="PR">PR - Colegio Privado</option>
                <option value="PU">PU - Escuela Pública</option>
                <option value="GB">GB - Gobierno / Licitación</option>
                <option value="PE">PE - Proyecto Especial / Organización</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Asignado</label>
            <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
          </div>

          {/* DATOS DE CENSO */}
          <div className="border-t border-slate-100 pt-3 bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 mb-1">
              <BarChart3 size={13} className="text-slate-400" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Datos Estadísticos / Censo (INEGI)</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Escuelas de la Zona (Censo)</label>
                <input type="number" value={schoolsPotential} onChange={(e) => setSchoolsPotential(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Licencias Proyectadas en Censo</label>
                <input type="number" value={licensesCenso} onChange={(e) => setLicensesCenso(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
            </div>
          </div>

          {/* MÉTRICAS FINANCIERAS DE LA UNE CON COMISIÓN */}
          <div className="border-t border-slate-100 pt-3 bg-blue-50/30 p-3 rounded-xl border border-blue-100/40 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-900 mb-1">
              <ShieldCheck size={13} className="text-blue-500" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Proyección Financiera Base de la UNE</label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-1">Límite Mínimo UNE</label>
                <input type="number" value={uneMinLimit} onChange={(e) => setUneMinLimit(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg p-2 text-[11px] font-mono bg-white focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-1">Licencias de UNE</label>
                <input type="number" value={uneLicenses} onChange={(e) => setUneLicenses(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg p-2 text-[11px] font-mono bg-white focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-1">Precio Prom. ($)</label>
                <input type="number" step="0.01" value={averageLicensePrice} onChange={(e) => setAverageLicensePrice(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg p-2 text-[11px] font-mono bg-white focus:outline-blue-600" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] font-bold text-blue-700 mb-1">Comisión (%)</label>
                <input type="number" value={commissionPercentage} onChange={(e) => setCommissionPercentage(Number(e.target.value))} className="w-full border border-blue-200 rounded-lg p-2 text-[11px] font-mono bg-blue-50 font-bold text-blue-900 focus:outline-blue-600" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Canal de Zona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}