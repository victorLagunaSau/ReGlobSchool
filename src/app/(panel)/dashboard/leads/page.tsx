'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase/client';
import { PlusCircle, UploadCloud, Search } from 'lucide-react';
import LeadsTable from './components/LeadsTable';
import FormRegistrarLead from './components/FormRegistrarLead';
import ImportCSV from './components/ImportCSV';
import SearchBusinesses from './components/SearchBusinesses';

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

export const LEAD_STATUSES = [
  { value: 'prospecto', label: 'Prospecto' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'negociacion', label: 'Negociación' },
  { value: 'sociedad_comercial', label: 'Sociedad Comercial' },
  { value: 'descartado', label: 'Descartado' },
] as const;

export interface LeadRow {
  id: string;
  business_name: string;
  business_type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  zone_id: string | null;
  country_id: string | null;
  state_id: string | null;
  municipality_code: string | null;
  status: string;
  source: string;
  assigned_to: string | null;
  tags: string[];
  score_percent: number;
  created_at: string;
  zone_city: string | null;
  state_name: string | null;
}

export default function LeadsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
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
          zone_id: l.zone_id,
          country_id: l.country_id,
          state_id: l.state_id,
          municipality_code: l.municipality_code,
          status: l.status,
          source: l.source,
          assigned_to: l.assigned_to,
          tags: l.tags || [],
          score_percent: l.score_percent || 0,
          created_at: l.created_at,
          zone_city: l.zones?.city || null,
          state_name: l.states?.name || null,
        }))
      );
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
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <UploadCloud size={14} className="text-slate-400" />
            Importar CSV
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <PlusCircle size={14} className="text-slate-400" />
            Nuevo Lead
          </button>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm group"
          >
            <Search size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
            Buscar Negocios
          </button>
        </div>
      </div>

      <LeadsTable leads={leads} states={states} onRefresh={fetchAll} />

      <FormRegistrarLead
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        countries={countries}
        states={states}
        zones={zones}
        onCreated={fetchAll}
      />

      <ImportCSV
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        zones={zones}
        onImported={fetchAll}
      />

      <SearchBusinesses
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        countries={countries}
        states={states}
        zones={zones}
        onCreated={fetchAll}
      />
    </div>
  );
}
