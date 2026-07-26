'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Loader2, X, Building2 } from 'lucide-react';
import type { Country, StateRow, ZoneRow } from '../page';

export interface LeadInitialData {
  business_name?: string;
  business_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  country_id?: string;
  state_id?: string;
  zone_id?: string;
}

interface FormRegistrarLeadProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  states: StateRow[];
  zones: ZoneRow[];
  onCreated: () => void;
  initialData?: LeadInitialData;
  source?: string;
}

export default function FormRegistrarLead({ isOpen, onClose, countries, states, zones, onCreated, initialData, source = 'manual' }: FormRegistrarLeadProps) {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [selectedState, setSelectedState] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialData) return;
    setBusinessName(initialData.business_name || '');
    setBusinessType(initialData.business_type || '');
    setPhone(initialData.phone || '');
    setEmail(initialData.email || '');
    setAddress(initialData.address || '');
    setWebsite(initialData.website || '');
    if (initialData.country_id) setSelectedCountry(initialData.country_id);
    if (initialData.state_id) setSelectedState(initialData.state_id);
    if (initialData.zone_id) setSelectedZone(initialData.zone_id);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const filteredStates = states.filter((s) => s.country_id === selectedCountry);
  const filteredZones = zones.filter((z) => z.state_id === selectedState);

  const resetForm = () => {
    setBusinessName('');
    setBusinessType('');
    setPhone('');
    setEmail('');
    setAddress('');
    setWebsite('');
    setSelectedState('');
    setSelectedZone('');
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !businessType.trim()) {
      return alert('Nombre del negocio y giro son obligatorios.');
    }

    setIsSaving(true);

    try {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          business_name: businessName.trim(),
          business_type: businessType.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          website: website.trim() || null,
          country_id: selectedCountry || null,
          state_id: selectedState || null,
          zone_id: selectedZone || null,
          source,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Todo lead nuevo entra de inmediato a "Mis Tareas" con su primer contacto.
      await supabase.from('lead_tasks').insert({
        lead_id: newLead.id,
        task_type: 'contacto_inicial',
        channel: 'ambos',
        description: 'Contacto inicial',
        scheduled_for: new Date().toISOString(),
        status: 'pendiente',
      });

      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error al guardar lead en Supabase:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-950 tracking-tight">Nuevo Lead</h2>
            <p className="text-[11px] text-slate-400">Alta manual de un prospecto comercial.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateLead} className="space-y-4">

          <div className="border-t border-slate-100 pt-3 bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 mb-1">
              <Building2 size={13} className="text-slate-400" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Datos del Negocio</label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Nombre del Negocio</label>
                <input type="text" placeholder="Ej. Librería El Sabio" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Giro</label>
                <input type="text" placeholder="Ej. Librería" value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Teléfono</label>
                <input type="text" placeholder="Ej. 993 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Correo</label>
                <input type="email" placeholder="contacto@negocio.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Dirección</label>
              <input type="text" placeholder="Calle, número, colonia" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Sitio Web</label>
              <input type="text" placeholder="https://negocio.com" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 bg-blue-50/30 p-3 rounded-xl border border-blue-100/40 space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-blue-900 mb-1">Ubicación (opcional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">País</label>
                <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedZone(''); }} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
                <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedZone(''); }} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  <option value="">Selecciona...</option>
                  {filteredStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Zona</label>
                <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} disabled={!selectedState} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600 disabled:opacity-50">
                  <option value="">Sin zona</option>
                  {filteredZones.map((z) => <option key={z.id} value={z.id}>{z.city}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
