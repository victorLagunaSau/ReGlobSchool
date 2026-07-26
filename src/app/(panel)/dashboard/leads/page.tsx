'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';
import { PlusCircle, Settings, Search } from 'lucide-react';
import LeadsKanban from './components/LeadsKanban';
import FormRegistrarLead from './components/FormRegistrarLead';

export interface Country {
  id: string;
  name: string;
}

export interface StateRow {
  id: string;
  country_id: string;
  cve_estado: number;
  name: string;
}

export interface ZoneRow {
  id: string;
  country_id: string;
  state_id: string;
  cve_municipio: number;
  cvegeo: string;
  city: string;
}

// Default statuses fallback if pipeline_stages table not yet created
export const DEFAULT_LEAD_STATUSES = [
  { value: 'prospecto', label: 'Prospecto' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'negociacion', label: 'Negociación' },
  { value: 'sociedad_comercial', label: 'Sociedad Comercial' },
  { value: 'descartado', label: 'Descartado' },
] as const;

export interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  descripcion: string | null;
  objetivo: string | null;
  orden: number;
  limite_pospuestas: number;
  intentos_requeridos: number;
}

export interface LeadRow {
  id: string;
  business_name: string;
  business_type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  zone_id: string | null;
  country_id: string | null;
  state_id: string | null;
  municipality_code: string | null;
  status: string;
  source: string;
  tags: string[];
  score_percent: number;
  created_at: string;
  zone_city: string | null;
  state_name: string | null;
}

export default function LeadsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [countriesRes, statesRes, zonesRes, leadsRes] = await Promise.all([
      supabase.from('countries').select('id, name').order('name'),
      supabase.from('states').select('id, country_id, cve_estado, name').order('name'),
      supabase.from('zones').select('id, country_id, state_id, cve_municipio, cvegeo, city').order('city'),
      supabase
        .from('leads')
        .select('*, zones(city), states(name)')
        .order('created_at', { ascending: false }),
    ]);

    // Try to fetch pipeline_stages, but don't block if it fails (table might not exist yet)
    let stagesRes = { data: null, error: null };
    try {
      stagesRes = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('orden', { ascending: true });
    } catch (err) {
      console.log('Pipeline stages table not yet created - using defaults');
    }

    if (countriesRes.data) setCountries(countriesRes.data);
    if (statesRes.data) setStates(statesRes.data);
    if (zonesRes.data) setZones(zonesRes.data);

    if (leadsRes.data) {
      setLeads(
        leadsRes.data.map((l: any) => ({
          id: l.id,
          business_name: l.business_name,
          business_type: l.business_type,
          phone: l.phone,
          email: l.email,
          address: l.address,
          website: l.website,
          zone_id: l.zone_id,
          country_id: l.country_id,
          state_id: l.state_id,
          municipality_code: l.municipality_code,
          status: l.status,
          source: l.source,
          tags: l.tags || [],
          score_percent: l.score_percent || 0,
          created_at: l.created_at,
          zone_city: l.zones?.city || null,
          state_name: l.states?.name || null,
        }))
      );
    }

    if (stagesRes.data) {
      setStages(stagesRes.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando Leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Leads — Prospección Comercial</h1>
          <p className="text-xs text-slate-500">Búsqueda, captura y seguimiento de negocios por giro y zona.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/leads/config"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings size={14} className="text-slate-400" />
            Configuración
          </Link>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <PlusCircle size={14} className="text-slate-400" />
            Nuevo Lead
          </button>
          <Link
            href="/dashboard/leads/search"
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm group"
          >
            <Search size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
            Buscar Negocios
          </Link>
        </div>
      </div>

      <LeadsKanban leads={leads} states={states} stages={stages} onRefresh={fetchAll} />

      <FormRegistrarLead
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        countries={countries}
        states={states}
        zones={zones}
        onCreated={fetchAll}
      />
    </div>
  );
}
