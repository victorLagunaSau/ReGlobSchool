'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Building2, Handshake, Tag, PlusCircle, Trash2, X, Loader2, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import FormRegistrarDistribucion from './FormRegistrarDistribucion';
import type { CommercialPartner, Distribution, DistributionContact, UneType, Country, StateRow } from '../page';

interface ConfigProps {
  partners: CommercialPartner[];
  distributions: Distribution[];
  distributionContacts: DistributionContact[];
  uneTypes: UneType[];
  countries: Country[];
  states: StateRow[];
  onRefresh: () => void;
}

export default function Config({ partners, distributions, distributionContacts, uneTypes, countries, states, onRefresh }: ConfigProps) {
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<{ distribution: Distribution; contacts: DistributionContact[] } | null>(null);

  const openNewDistribution = () => {
    setEditingDistribution(null);
    setIsDistributionModalOpen(true);
  };

  const openEditDistribution = (d: Distribution) => {
    setEditingDistribution({ distribution: d, contacts: distributionContacts.filter((c) => c.distribution_id === d.id) });
    setIsDistributionModalOpen(true);
  };

  // Orden de la tabla de Distribuciones: solo columnas Distribución y Socio
  // Comercial son ordenables (botones de flecha), el resto de las tablas
  // tiene un orden fijo (se usa poco, no hace falta más que eso).
  const [distSortColumn, setDistSortColumn] = useState<'name' | 'partner' | null>(null);
  const [distSortDirection, setDistSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleDistSort = (column: 'name' | 'partner', direction: 'asc' | 'desc') => {
    setDistSortColumn(column);
    setDistSortDirection(direction);
  };

  const sortedDistributions = useMemo(() => {
    if (!distSortColumn) return distributions;
    const arr = [...distributions];
    arr.sort((a, b) => {
      const valueOf = (d: Distribution) =>
        distSortColumn === 'name' ? d.name : (partners.find((p) => p.id === d.commercial_partner_id)?.company_name || '');
      const cmp = valueOf(a).localeCompare(valueOf(b));
      return distSortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [distributions, partners, distSortColumn, distSortDirection]);

  const sortedPartners = useMemo(
    () => [...partners].sort((a, b) => a.company_name.localeCompare(b.company_name)),
    [partners]
  );

  const sortedUneTypes = useMemo(
    () => [...uneTypes].sort((a, b) => (Number(a.clave) || 0) - (Number(b.clave) || 0) || a.clave.localeCompare(b.clave)),
    [uneTypes]
  );

  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editPartnerForm, setEditPartnerForm] = useState<CommercialPartner | null>(null);

  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeForm, setEditTypeForm] = useState<UneType | null>(null);

  const startEditPartner = (p: CommercialPartner) => {
    setEditingPartnerId(p.id);
    setEditPartnerForm({ ...p });
  };

  const saveEditPartner = async (id: string) => {
    if (!editPartnerForm) return;
    try {
      const { error } = await supabase.from('commercial_partners').update({
        company_name: editPartnerForm.company_name.trim(),
        contact_name: editPartnerForm.contact_name.trim(),
        phone: editPartnerForm.phone.trim(),
      }).eq('id', id);
      if (error) throw error;
      setEditingPartnerId(null);
      onRefresh();
    } catch (err) {
      console.error('Error al actualizar socio comercial:', err);
    }
  };

  const startEditType = (t: UneType) => {
    setEditingTypeId(t.id);
    setEditTypeForm({ ...t });
  };

  const saveEditType = async (id: string) => {
    if (!editTypeForm) return;
    try {
      const { error } = await supabase.from('une_types').update({
        clave: editTypeForm.clave.trim(),
        titulo: editTypeForm.titulo.trim(),
        descripcion: editTypeForm.descripcion?.trim() || null,
      }).eq('id', id);
      if (error) throw error;
      setEditingTypeId(null);
      onRefresh();
    } catch (err) {
      console.error('Error al actualizar tipo de UNE:', err);
    }
  };

  const handleDeleteDistribution = async (id: string) => {
    if (!window.confirm('¿Eliminar esta distribución? También se eliminan sus contactos y solo es posible si no tiene UNEs asociadas.')) return;
    try {
      const { error } = await supabase.from('distributions').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm('¿Eliminar este socio comercial? Las distribuciones vinculadas quedarán sin socio.')) return;
    try {
      const { error } = await supabase.from('commercial_partners').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!window.confirm('¿Eliminar este tipo de UNE? Solo es posible si no está en uso.')) return;
    try {
      const { error } = await supabase.from('une_types').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* DISTRIBUCIONES */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Building2 size={14} className="text-blue-400" /> Distribuciones
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-2 py-0.5 rounded-md">
              {distributions.length} registradas
            </span>
            <button
              onClick={openNewDistribution}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
            >
              <PlusCircle size={12} /> Nueva Distribución
            </button>
          </div>
        </div>
        {distributions.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center font-medium">No hay distribuciones registradas todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-4 w-[30%]">
                    <span className="inline-flex items-center gap-1">
                      Distribución
                      <button onClick={() => toggleDistSort('name', 'asc')} className={`p-0.5 rounded ${distSortColumn === 'name' && distSortDirection === 'asc' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`} title="Ordenar A-Z"><ChevronDown size={11} /></button>
                      <button onClick={() => toggleDistSort('name', 'desc')} className={`p-0.5 rounded ${distSortColumn === 'name' && distSortDirection === 'desc' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`} title="Ordenar Z-A"><ChevronUp size={11} /></button>
                    </span>
                  </th>
                  <th className="py-2 px-4 w-[20%]">Teléfono</th>
                  <th className="py-2 px-4 w-[20%]">Responsable Principal</th>
                  <th className="py-2 px-4 w-[15%]">
                    <span className="inline-flex items-center gap-1">
                      Socio Comercial
                      <button onClick={() => toggleDistSort('partner', 'asc')} className={`p-0.5 rounded ${distSortColumn === 'partner' && distSortDirection === 'asc' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`} title="Ordenar A-Z"><ChevronDown size={11} /></button>
                      <button onClick={() => toggleDistSort('partner', 'desc')} className={`p-0.5 rounded ${distSortColumn === 'partner' && distSortDirection === 'desc' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`} title="Ordenar Z-A"><ChevronUp size={11} /></button>
                    </span>
                  </th>
                  <th className="py-2 px-4 w-[20%]">Redes Sociales</th>
                  <th className="py-2 px-4 text-right w-[10%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sortedDistributions.map((d) => {
                  const partner = partners.find((p) => p.id === d.commercial_partner_id);
                  const principal = distributionContacts.find((c) => c.distribution_id === d.id && c.role === 'Principal');
                  const collaboratorsCount = distributionContacts.filter((c) => c.distribution_id === d.id && c.role === 'Colaborador').length;
                  const stateName = states.find((s) => s.id === d.state_id)?.name;
                  const countryName = countries.find((c) => c.id === d.country_id)?.name;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-4">
                        <div className="font-bold text-slate-800">{d.name}</div>
                        {d.address && <div className="text-[10px] text-slate-400">{d.address}</div>}
                        {(stateName || countryName) && (
                          <div className="text-[10px] text-slate-400">{[stateName, countryName].filter(Boolean).join(', ')}</div>
                        )}
                      </td>
                      <td className="py-2 px-4 font-mono text-slate-600">{d.phone || '—'}</td>
                      <td className="py-2 px-4">
                        {principal ? (
                          <>
                            <div className="font-semibold text-slate-800">{principal.full_name}</div>
                            {collaboratorsCount > 0 && <div className="text-[10px] text-slate-400">+{collaboratorsCount} colaborador{collaboratorsCount === 1 ? '' : 'es'}</div>}
                          </>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-4 text-slate-500">{partner?.company_name || '—'}</td>
                      <td className="py-2 px-4">
                        {d.social_media_urls && Array.isArray(d.social_media_urls) && d.social_media_urls.length > 0 ? (
                          <ul className="space-y-1">
                            {d.social_media_urls.map((social: any, idx: number) => (
                              <li key={idx}>
                                <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-[9px] font-semibold">
                                  {social.name} ↗
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditDistribution(d)}
                            className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-md"
                            title="Editar Distribución"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteDistribution(d.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-md"
                            title="Eliminar Distribución"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SOCIOS COMERCIALES */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Handshake size={14} className="text-blue-400" /> Socios Comerciales
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-2 py-0.5 rounded-md">
              {partners.length} registrados
            </span>
            <button
              onClick={() => setIsPartnerModalOpen(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
            >
              <PlusCircle size={12} /> Nuevo Socio Comercial
            </button>
          </div>
        </div>
        {partners.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center font-medium">No hay socios comerciales registrados todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-4 w-[25%]">Empresa</th>
                  <th className="py-2 px-4 w-[20%]">Responsable</th>
                  <th className="py-2 px-4 w-[12%]">Teléfono</th>
                  <th className="py-2 px-4 w-[12%]">Sitio Web</th>
                  <th className="py-2 px-4 w-[15%]">Redes Sociales</th>
                  <th className="py-2 px-4 text-right w-[16%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sortedPartners.map((p) => {
                  const isEditing = editingPartnerId === p.id;
                  return (
                    <tr key={p.id} className={isEditing ? 'bg-blue-50/40' : 'hover:bg-slate-50/60 transition-colors'}>
                      <td className="py-2 px-4 font-bold text-slate-800">
                        {isEditing ? (
                          <input value={editPartnerForm?.company_name || ''} onChange={(e) => setEditPartnerForm((f) => f && { ...f, company_name: e.target.value })} className="w-full border border-blue-300 rounded px-2 py-1 text-xs" />
                        ) : p.company_name}
                      </td>
                      <td className="py-2 px-4 text-slate-500">
                        {isEditing ? (
                          <input value={editPartnerForm?.contact_name || ''} onChange={(e) => setEditPartnerForm((f) => f && { ...f, contact_name: e.target.value })} className="w-full border border-blue-300 rounded px-2 py-1 text-xs" />
                        ) : p.contact_name}
                      </td>
                      <td className="py-2 px-4 font-mono text-slate-600">
                        {isEditing ? (
                          <input value={editPartnerForm?.phone || ''} onChange={(e) => setEditPartnerForm((f) => f && { ...f, phone: e.target.value })} className="w-full border border-blue-300 rounded px-2 py-1 text-xs" />
                        ) : p.phone}
                      </td>
                      <td className="py-2 px-4">
                        {p.website_url ? (
                          <a
                            href={p.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline truncate inline-block max-w-full"
                            title={p.website_url}
                          >
                            Sitio Web
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {Array.isArray(p.social_media_urls) && p.social_media_urls.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.social_media_urls.map((social, idx) => (
                              <a
                                key={idx}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-2 py-0.5 bg-slate-100 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={social.name}
                              >
                                {social.name}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEditPartner(p.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Guardar"><Check size={13} /></button>
                            <button onClick={() => setEditingPartnerId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancelar"><X size={13} /></button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditPartner(p)} className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-md" title="Editar"><Edit2 size={13} /></button>
                            <button
                              onClick={() => handleDeletePartner(p.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-md"
                              title="Eliminar Socio Comercial"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TIPOS DE UNE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Tag size={14} className="text-blue-400" /> Tipos de UNE
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-2 py-0.5 rounded-md">
              {uneTypes.length} registrados
            </span>
            <button
              onClick={() => setIsTypeModalOpen(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
            >
              <PlusCircle size={12} /> Nuevo Tipo de UNE
            </button>
          </div>
        </div>
        {uneTypes.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center font-medium">No hay tipos de UNE registrados todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-4 w-[15%]">Clave</th>
                  <th className="py-2 px-4 w-[30%]">Título</th>
                  <th className="py-2 px-4 w-[40%]">Descripción</th>
                  <th className="py-2 px-4 text-right w-[15%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sortedUneTypes.map((t) => {
                  const isEditing = editingTypeId === t.id;
                  return (
                    <tr key={t.id} className={isEditing ? 'bg-blue-50/40' : 'hover:bg-slate-50/60 transition-colors'}>
                      <td className="py-2 px-4 font-mono font-bold text-blue-600">
                        {isEditing ? (
                          <input value={editTypeForm?.clave || ''} onChange={(e) => setEditTypeForm((f) => f && { ...f, clave: e.target.value })} className="w-full border border-blue-300 rounded px-2 py-1 text-xs font-mono" />
                        ) : t.clave}
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-800">
                        {isEditing ? (
                          <input value={editTypeForm?.titulo || ''} onChange={(e) => setEditTypeForm((f) => f && { ...f, titulo: e.target.value })} className="w-full border border-blue-300 rounded px-2 py-1 text-xs" />
                        ) : t.titulo}
                      </td>
                      <td className="py-2 px-4 text-slate-400 truncate max-w-[220px]" title={t.descripcion || ''}>
                        {isEditing ? (
                          <input value={editTypeForm?.descripcion || ''} onChange={(e) => setEditTypeForm((f) => f && { ...f, descripcion: e.target.value })} className="w-full border border-blue-300 rounded px-2 py-1 text-xs" />
                        ) : (t.descripcion || '—')}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEditType(t.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Guardar"><Check size={13} /></button>
                            <button onClick={() => setEditingTypeId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancelar"><X size={13} /></button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditType(t)} className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-md" title="Editar"><Edit2 size={13} /></button>
                            <button
                              onClick={() => handleDeleteType(t.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-md"
                              title="Eliminar Tipo de UNE"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormRegistrarDistribucion
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        partners={partners}
        countries={countries}
        states={states}
        onCreated={onRefresh}
        editing={editingDistribution}
      />

      <ModalSocioComercial
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onCreated={onRefresh}
      />

      <ModalTipoUne
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onCreated={onRefresh}
      />
    </div>
  );
}

function ModalSocioComercial({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialMediaUrls, setSocialMediaUrls] = useState<Array<{ name: string; url: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !phone.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('commercial_partners').insert({
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        phone: phone.trim(),
        website_url: websiteUrl.trim() || null,
        social_media_urls: socialMediaUrls.filter(s => s.name.trim() && s.url.trim()),
      });
      if (error) throw error;
      setCompanyName('');
      setContactName('');
      setPhone('');
      setWebsiteUrl('');
      setSocialMediaUrls([]);
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error al guardar socio comercial:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-fade-in-up">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-base font-black text-slate-950 tracking-tight">Nuevo Socio Comercial</h2>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Nombre de la Empresa *</label>
            <input type="text" placeholder="Nombre de la empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Responsable *</label>
              <input type="text" placeholder="Nombre" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Teléfono *</label>
              <input type="text" placeholder="55 0000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-3">
            <label className="block text-[10px] font-bold text-slate-400 mb-2">Sitio Web y Redes Sociales (opcional)</label>
            <div className="space-y-2">
              <input type="url" placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold text-slate-400">Redes Sociales</span>
                  <button
                    type="button"
                    onClick={() => setSocialMediaUrls([...socialMediaUrls, { name: '', url: '' }])}
                    className="text-[9px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Agregar
                  </button>
                </div>
                {socialMediaUrls.map((social, idx) => (
                  <div key={idx} className="flex gap-1 mb-1">
                    <input
                      type="text"
                      placeholder="Facebook, Instagram..."
                      value={social.name}
                      onChange={(e) => setSocialMediaUrls(socialMediaUrls.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                      className="flex-1 border rounded px-2 py-1 text-[10px] focus:outline-blue-600"
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={social.url}
                      onChange={(e) => setSocialMediaUrls(socialMediaUrls.map((s, i) => i === idx ? { ...s, url: e.target.value } : s))}
                      className="flex-1 border rounded px-2 py-1 text-[10px] focus:outline-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setSocialMediaUrls(socialMediaUrls.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalTipoUne({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [clave, setClave] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clave.trim() || !titulo.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('une_types').insert({
        clave: clave.trim(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
      });
      if (error) throw error;
      setClave('');
      setTitulo('');
      setDescripcion('');
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error al guardar tipo de UNE:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-fade-in-up">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-base font-black text-slate-950 tracking-tight">Nuevo Tipo de UNE</h2>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Clave *</label>
              <input type="text" placeholder="Ej. 01" value={clave} onChange={(e) => setClave(e.target.value)} className="w-full border rounded-lg p-2 text-xs font-mono focus:outline-blue-600" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Título *</label>
              <input type="text" placeholder="Nombre del tipo de UNE" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Descripción</label>
            <textarea placeholder="Notas internas, no se muestra en el listado por ahora" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
