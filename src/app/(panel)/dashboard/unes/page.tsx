'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase/client';
import { PlusCircle, Settings, LayoutGrid } from 'lucide-react';
import TablaUnes from './components/TablaUnes';
import FormRegistrarUne from './components/FormRegistrarUne';
import Config from './components/Config';

// Producto vendido en la UNE: lista fija por ahora (todo este año es
// Pathbooks). El día que exista un segundo producto real, esto pasa a ser
// un catálogo gestionable como UneType.
export const PRODUCTS = [
  { clave: '101', nombre: 'Pathbooks' },
] as const;

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
  schools_potential: number;
  assigned_to: string | null;
}

export interface CommercialPartner {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  website_url: string | null;
  social_media_urls: Array<{ name: string; url: string }> | null;
}

export interface Distribution {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  country_id: string | null;
  state_id: string | null;
  commercial_partner_id: string | null;
  website_url: string | null;
  social_media_urls: Array<{ name: string; url: string }> | null;
}

export interface DistributionContact {
  id?: string;
  distribution_id?: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  role: 'Principal' | 'Colaborador';
  is_admin: boolean;
}

export interface UneType {
  id: string;
  clave: string;
  titulo: string;
  descripcion: string | null;
}

export interface UneRow {
  id: string;
  distribution_id: string;
  une_type_id: string;
  une_type_titulo: string;
  une_type_clave: string;
  producto_clave: string;
  producto_nombre: string;
  country_id: string | null;
  state_id: string | null;
  projected_schools: number;
  projected_licenses: number;
  agreed_departure_price: number | null;
  suggested_selling_price: number | null;
  real_selling_price: number | null;
  partner_commission: number | null;
  distribution_name: string;
  commercial_partner_id: string | null;
  commercial_partner_name: string | null;
  state_name: string;
  country_name: string;
  zone_ids: string[];
}

export default function UnesPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'config'>('list');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [partners, setPartners] = useState<CommercialPartner[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [distributionContacts, setDistributionContacts] = useState<DistributionContact[]>([]);
  const [uneTypes, setUneTypes] = useState<UneType[]>([]);
  const [unes, setUnes] = useState<UneRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [countriesRes, statesRes, partnersRes, distributionsRes, contactsRes, uneTypesRes, unesRes] = await Promise.all([
      supabase.from('countries').select('id, name').order('name'),
      supabase.from('states').select('id, country_id, cve_estado, name').order('name'),
      supabase.from('commercial_partners').select('id, company_name, contact_name, phone, website_url, social_media_urls').order('company_name'),
      supabase.from('distributions').select('id, name, address, phone, country_id, state_id, commercial_partner_id, website_url, social_media_urls').order('name'),
      supabase.from('distribution_contacts').select('id, distribution_id, full_name, email, phone, position, role, is_admin').order('created_at'),
      supabase.from('une_types').select('id, clave, titulo, descripcion').order('titulo'),
      supabase
        .from('unes')
        .select(
          '*, distributions(name, commercial_partner_id, commercial_partners(company_name)), une_types(clave, titulo), states(name), countries(name), une_zones(zone_id)'
        )
        .order('created_at', { ascending: false }),
    ]);

    if (countriesRes.data) setCountries(countriesRes.data);
    if (statesRes.data) setStates(statesRes.data);
    if (partnersRes.data) setPartners(partnersRes.data);
    if (distributionsRes.data) setDistributions(distributionsRes.data);
    if (contactsRes.data) setDistributionContacts(contactsRes.data);
    if (uneTypesRes.data) setUneTypes(uneTypesRes.data);

    if (unesRes.data) {
      setUnes(
        unesRes.data.map((u: any) => ({
          id: u.id,
          distribution_id: u.distribution_id,
          une_type_id: u.une_type_id,
          une_type_titulo: u.une_types?.titulo || '—',
          une_type_clave: u.une_types?.clave || '—',
          producto_clave: u.producto_clave,
          producto_nombre: u.producto_nombre,
          country_id: u.country_id,
          state_id: u.state_id,
          projected_schools: u.projected_schools,
          projected_licenses: u.projected_licenses,
          agreed_departure_price: u.agreed_departure_price,
          suggested_selling_price: u.suggested_selling_price,
          real_selling_price: u.real_selling_price,
          partner_commission: u.partner_commission,
          distribution_name: u.distributions?.name || '—',
          commercial_partner_id: u.distributions?.commercial_partner_id || null,
          commercial_partner_name: u.distributions?.commercial_partners?.company_name || null,
          state_name: u.states?.name || '—',
          country_name: u.countries?.name || '—',
          zone_ids: (u.une_zones || []).map((z: any) => z.zone_id),
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando UNEs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">UNEs — Unidades de Negocio Educativo</h1>
          <p className="text-xs text-slate-500">Oportunidades comerciales de venta de licencias por zona.</p>
        </div>

        <div className="flex flex-wrap border border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-0.5">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'list' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={14} />
            Listado de UNEs
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
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm group"
            >
              <PlusCircle size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
              Nueva UNE
            </button>
          </div>

          <TablaUnes unes={unes} distributions={distributions} partners={partners} states={states} countries={countries} uneTypes={uneTypes} onRefresh={fetchAll} />
        </div>
      )}

      {activeTab === 'config' && (
        <Config
          partners={partners}
          distributions={distributions}
          distributionContacts={distributionContacts}
          uneTypes={uneTypes}
          countries={countries}
          states={states}
          onRefresh={fetchAll}
        />
      )}

      <FormRegistrarUne
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        countries={countries}
        states={states}
        distributions={distributions}
        uneTypes={uneTypes}
        onCreated={fetchAll}
      />
    </div>
  );
}
