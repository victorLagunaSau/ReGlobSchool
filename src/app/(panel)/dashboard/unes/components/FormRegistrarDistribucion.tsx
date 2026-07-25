'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Loader2, X, Building2, User, Users, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import type { CommercialPartner, DistributionContact, Distribution, Country, StateRow } from '../page';

interface FormRegistrarDistribucionProps {
  isOpen: boolean;
  onClose: () => void;
  partners: CommercialPartner[];
  countries: Country[];
  states: StateRow[];
  onCreated: () => void;
  editing?: { distribution: Distribution; contacts: DistributionContact[] } | null;
}

const emptyCollaborator = (): DistributionContact => ({
  full_name: '',
  email: '',
  phone: '',
  position: '',
  role: 'Colaborador',
  is_admin: false,
});

export default function FormRegistrarDistribucion({ isOpen, onClose, partners, countries, states, onCreated, editing }: FormRegistrarDistribucionProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Datos de la empresa
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [countryId, setCountryId] = useState('MX');
  const [stateId, setStateId] = useState('');
  const [partnerId, setPartnerId] = useState('');

  const filteredStates = states.filter((s) => s.country_id === countryId);

  // Responsable principal
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalPhone, setPrincipalPhone] = useState('');
  const [principalPosition, setPrincipalPosition] = useState('');

  // Colaboradores (los que ya existían conservan su id, para reconciliar al guardar)
  const [collaborators, setCollaborators] = useState<DistributionContact[]>([]);
  const [originalCollaboratorIds, setOriginalCollaboratorIds] = useState<string[]>([]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setCountryId('MX');
    setStateId('');
    setPartnerId('');
    setPrincipalId(null);
    setPrincipalName('');
    setPrincipalEmail('');
    setPrincipalPhone('');
    setPrincipalPosition('');
    setCollaborators([]);
    setOriginalCollaboratorIds([]);
    setShowConfirm(false);
  };

  // Al abrir el modal: precarga datos si es edición, o limpia si es alta nueva.
  useEffect(() => {
    if (!isOpen) return;
    setShowConfirm(false);

    if (editing) {
      const principal = editing.contacts.find((c) => c.role === 'Principal');
      const cols = editing.contacts.filter((c) => c.role === 'Colaborador');
      setName(editing.distribution.name);
      setAddress(editing.distribution.address || '');
      setPhone(editing.distribution.phone || '');
      setCountryId(editing.distribution.country_id || 'MX');
      setStateId(editing.distribution.state_id || '');
      setPartnerId(editing.distribution.commercial_partner_id || '');
      setPrincipalId(principal?.id || null);
      setPrincipalName(principal?.full_name || '');
      setPrincipalEmail(principal?.email || '');
      setPrincipalPhone(principal?.phone || '');
      setPrincipalPosition(principal?.position || '');
      setCollaborators(cols.map((c) => ({ ...c })));
      setOriginalCollaboratorIds(cols.map((c) => c.id).filter((id): id is string => Boolean(id)));
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const updateCollaborator = (index: number, field: keyof DistributionContact, value: string | boolean) => {
    setCollaborators((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addCollaborator = () => setCollaborators((prev) => [...prev, emptyCollaborator()]);

  const removeCollaborator = (index: number) => setCollaborators((prev) => prev.filter((_, i) => i !== index));

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return alert('El nombre de la distribución es obligatorio.');
    if (!principalName.trim() || !principalPhone.trim()) {
      return alert('El Responsable Principal necesita al menos nombre y teléfono.');
    }
    if (collaborators.some((c) => !c.full_name.trim() || !c.phone.trim())) {
      return alert('Completa nombre y teléfono de todos los colaboradores.');
    }

    setShowConfirm(true);
  };

  const handleConfirmedSave = async () => {
    setIsSaving(true);

    try {
      if (editing) {
        const distributionId = editing.distribution.id;

        const { error: distError } = await supabase
          .from('distributions')
          .update({
            name: name.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            country_id: countryId || null,
            state_id: stateId || null,
            commercial_partner_id: partnerId || null,
          })
          .eq('id', distributionId);
        if (distError) throw distError;

        if (principalId) {
          const { error: pErr } = await supabase
            .from('distribution_contacts')
            .update({
              full_name: principalName.trim(),
              email: principalEmail.trim() || null,
              phone: principalPhone.trim(),
              position: principalPosition.trim() || null,
            })
            .eq('id', principalId);
          if (pErr) throw pErr;
        } else {
          const { error: pErr } = await supabase.from('distribution_contacts').insert({
            distribution_id: distributionId,
            full_name: principalName.trim(),
            email: principalEmail.trim() || null,
            phone: principalPhone.trim(),
            position: principalPosition.trim() || null,
            role: 'Principal',
            is_admin: true,
          });
          if (pErr) throw pErr;
        }

        const currentIds = collaborators.map((c) => c.id).filter((id): id is string => Boolean(id));
        const idsToDelete = originalCollaboratorIds.filter((id) => !currentIds.includes(id));
        if (idsToDelete.length > 0) {
          const { error: delErr } = await supabase.from('distribution_contacts').delete().in('id', idsToDelete);
          if (delErr) throw delErr;
        }

        for (const c of collaborators) {
          if (c.id) {
            const { error: uErr } = await supabase
              .from('distribution_contacts')
              .update({
                full_name: c.full_name.trim(),
                email: c.email.trim() || null,
                phone: c.phone.trim(),
                is_admin: c.is_admin,
              })
              .eq('id', c.id);
            if (uErr) throw uErr;
          } else {
            const { error: iErr } = await supabase.from('distribution_contacts').insert({
              distribution_id: distributionId,
              full_name: c.full_name.trim(),
              email: c.email.trim() || null,
              phone: c.phone.trim(),
              position: null,
              role: 'Colaborador',
              is_admin: c.is_admin,
            });
            if (iErr) throw iErr;
          }
        }
      } else {
        const { data: distributionData, error: distributionError } = await supabase
          .from('distributions')
          .insert({
            name: name.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            country_id: countryId || null,
            state_id: stateId || null,
            commercial_partner_id: partnerId || null,
          })
          .select('id')
          .single();

        if (distributionError) throw distributionError;
        const createdDistributionId = distributionData.id;

        const contactRows = [
          {
            distribution_id: createdDistributionId,
            full_name: principalName.trim(),
            email: principalEmail.trim() || null,
            phone: principalPhone.trim(),
            position: principalPosition.trim() || null,
            role: 'Principal',
            is_admin: true,
          },
          ...collaborators.map((c) => ({
            distribution_id: createdDistributionId,
            full_name: c.full_name.trim(),
            email: c.email.trim() || null,
            phone: c.phone.trim(),
            position: null,
            role: 'Colaborador',
            is_admin: c.is_admin,
          })),
        ];

        const { error: contactsError } = await supabase.from('distribution_contacts').insert(contactRows);
        if (contactsError) {
          await supabase.from('distributions').delete().eq('id', createdDistributionId);
          throw contactsError;
        }
      }

      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error al guardar la distribución:', error);
      alert('Ocurrió un error al guardar la distribución. Revisa la consola para más detalle.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-950 tracking-tight">{editing ? 'Editar Distribución' : 'Nueva Distribución'}</h2>
            <p className="text-[11px] text-slate-400">Empresa distribuidora, su responsable principal y colaboradores.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleReviewSubmit} className="space-y-4">

          {/* DATOS DE LA EMPRESA */}
          <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-700 mb-1">
              <Building2 size={13} className="text-slate-400" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Datos de la Empresa</label>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Nombre de la Distribución *</label>
              <input type="text" placeholder="Nombre de la empresa" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Dirección</label>
                <input type="text" placeholder="Ubicación de la empresa" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Teléfono</label>
                <input type="text" placeholder="55 0000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg p-2 text-xs focus:outline-blue-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">País</label>
                <select value={countryId} onChange={(e) => { setCountryId(e.target.value); setStateId(''); }} className="w-full border rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Estado</label>
                <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                  <option value="">Selecciona...</option>
                  {filteredStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Socio Comercial (opcional)</label>
              <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white focus:outline-blue-600">
                <option value="">Sin socio comercial</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
              </select>
            </div>
          </div>

          {/* RESPONSABLE PRINCIPAL */}
          <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-100/40 space-y-3">
            <div className="flex items-center gap-1.5 text-blue-900 mb-1">
              <User size={13} className="text-blue-500" />
              <label className="block text-[11px] font-black uppercase tracking-wider">Responsable Principal</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="text" placeholder="Nombre completo *" value={principalName} onChange={(e) => setPrincipalName(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
              <input type="text" placeholder="Cargo" value={principalPosition} onChange={(e) => setPrincipalPosition(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
              <input type="email" placeholder="Email" value={principalEmail} onChange={(e) => setPrincipalEmail(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
              <input type="text" placeholder="Teléfono *" value={principalPhone} onChange={(e) => setPrincipalPhone(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
            </div>
          </div>

          {/* COLABORADORES */}
          <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Users size={13} className="text-slate-400" />
                <label className="block text-[11px] font-black uppercase tracking-wider">Colaboradores</label>
              </div>
              <button type="button" onClick={addCollaborator} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800">
                <PlusCircle size={13} /> Agregar Colaborador
              </button>
            </div>

            {collaborators.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Sin colaboradores agregados todavía.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c, index) => (
                  <div key={c.id || index} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Colaborador {index + 1}</span>
                      <button type="button" onClick={() => removeCollaborator(index)} className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md" title="Quitar colaborador">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" placeholder="Nombre *" value={c.full_name} onChange={(e) => updateCollaborator(index, 'full_name', e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
                      <input type="text" placeholder="Teléfono *" value={c.phone} onChange={(e) => updateCollaborator(index, 'phone', e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
                      <input type="email" placeholder="Email (opcional)" value={c.email} onChange={(e) => updateCollaborator(index, 'email', e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-600" />
                      <select
                        value={c.is_admin ? 'true' : 'false'}
                        onChange={(e) => updateCollaborator(index, 'is_admin', e.target.value === 'true')}
                        className="border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600"
                      >
                        <option value="false">Administrador: No</option>
                        <option value="true">Administrador: Sí</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showConfirm ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800">
                <AlertTriangle size={13} />
                <p className="text-[11px] font-black uppercase tracking-wider">Confirma antes de {editing ? 'actualizar' : 'guardar'}</p>
              </div>
              <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
                <li>Distribución: <strong>{name}</strong></li>
                <li>Responsable Principal: <strong>{principalName}</strong></li>
                <li>Colaboradores: <strong>{collaborators.length}</strong>{collaborators.length === 0 && ' (ninguno agregado)'}</li>
              </ul>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowConfirm(false)} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Volver a Editar</button>
                <button type="button" onClick={handleConfirmedSave} disabled={isSaving} className="px-5 py-2 bg-amber-600 text-white font-semibold rounded-lg text-xs hover:bg-amber-700 flex items-center gap-2">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : (editing ? 'Confirmar y Actualizar' : 'Confirmar y Guardar')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
                {editing ? 'Guardar Cambios' : 'Guardar Distribución'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
