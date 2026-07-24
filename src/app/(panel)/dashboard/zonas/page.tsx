'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase/client';
import { ClipboardCopy, LayoutGrid, PlusCircle, Settings } from 'lucide-react';
import TablaZonas from './components/TablaZonas';
import ModalCargaMasiva from './components/ModalCargaMasiva';
import FormRegistrarZona from './components/FormRegistrarZona';
import Config from './components/Config';

export interface Country {
  id: string;
  name: string;
}

export interface StateRow {
  id: string;
  country_id: string;
  cve_estado: number;
  cod_estado: string;
  name: string;
}

export interface ZoneRow {
  id: string;
  country_id: string;
  state_id: string;
  cve_municipio: number;
  cvegeo: string;
  city: string;
  assigned_to: string | null;
  schools_potential: number;
  licenses_censo: number;
  licenses_sold: number;
  state_name: string;
  state_code: string;
  country_name: string;
}

export default function ZonasPage() {
  // Pestañas activas: 'list' (Matriz de Control), 'config' (Configuración General)
  const [activeTab, setActiveTab] = useState<'list' | 'config'>('list');

  // Controladores de Popups globales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Catálogos y zonas: fuente única de verdad en este componente, compartidos hacia abajo
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [countriesRes, statesRes, zonesRes] = await Promise.all([
      supabase.from('countries').select('id, name').order('name'),
      supabase.from('states').select('id, country_id, cve_estado, cod_estado, name').order('name'),
      supabase
        .from('zones')
        .select('*, states(name, cod_estado, countries(name))')
        .order('city'),
    ]);

    if (countriesRes.data) setCountries(countriesRes.data);
    if (statesRes.data) setStates(statesRes.data);

    if (zonesRes.data) {
      setZones(
        zonesRes.data.map((z: any) => ({
          id: z.id,
          country_id: z.country_id,
          state_id: z.state_id,
          cve_municipio: z.cve_municipio,
          cvegeo: z.cvegeo,
          city: z.city,
          assigned_to: z.assigned_to,
          schools_potential: z.schools_potential,
          licenses_censo: z.licenses_censo,
          licenses_sold: z.licenses_sold,
          state_name: z.states?.name || z.state_id,
          state_code: z.states?.cod_estado || '',
          country_name: z.states?.countries?.name || z.country_id,
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Sincronizando catálogos y territorios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER DE NAVEGACIÓN GENERAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Control Territorial Multi-País</h1>
          <p className="text-xs text-slate-500">Datos y catálogos conectados con Supabase.</p>
        </div>

        {/* Botonera Principal Reducida */}
        <div className="flex flex-wrap border border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-0.5">
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
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'config' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings size={14} />
            Configuración
          </button>

          <div className="w-px h-6 bg-slate-200 self-center mx-1 hidden sm:block" />

          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
          >
            <ClipboardCopy size={14} />
            Carga Excel
          </button>
        </div>
      </div>

      {/* CUERPO DINÁMICO DEL MÓDULO */}
      {activeTab === 'list' && (
        <div className="space-y-4 animate-fade-in">
          {/* BOTÓN "NUEVA ZONA" UBICADO JUSTO ARRIBA DE LA TABLA */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm group"
            >
              <PlusCircle size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
              Nueva Zona Comercial
            </button>
          </div>

          {/* Renderizado de la Tabla de Control */}
          <TablaZonas countries={countries} states={states} zones={zones} onRefresh={fetchAll} />
        </div>
      )}

      {activeTab === 'config' && (
        <Config countries={countries} states={states} onRefresh={fetchAll} />
      )}

      {/* POPUP DE REGISTRO INDIVIDUAL DE ZONA SEGMENTADA */}
      <FormRegistrarZona
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        countries={countries}
        states={states}
        onCreated={fetchAll}
      />

      {/* POPUP DE CARGA MASIVA */}
      <ModalCargaMasiva
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onImported={fetchAll}
      />
    </div>
  );
}
