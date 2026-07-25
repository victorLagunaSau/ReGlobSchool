'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import type { LeadRow, StateRow } from '../page';
import { LEAD_STATUSES } from '../page';
import { scoreStyle } from '../../../../../lib/lead-score';

interface LeadsTableProps {
  leads: LeadRow[];
  states: StateRow[];
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  prospecto: 'bg-slate-100 text-slate-600',
  llamada: 'bg-amber-100 text-amber-700',
  negociacion: 'bg-blue-100 text-blue-700',
  sociedad_comercial: 'bg-emerald-100 text-emerald-700',
  descartado: 'bg-rose-100 text-rose-700',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  denue: 'DENUE',
  google_maps: 'Google Maps',
  csv: 'CSV',
};

export default function LeadsTable({ leads, states }: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterState, setFilterState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.business_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus ? l.status === filterStatus : true;
      const matchesState = filterState ? l.state_id === filterState : true;
      return matchesSearch && matchesStatus && matchesState;
    });
  }, [leads, searchTerm, filterStatus, filterState]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusLabel = (value: string) => LEAD_STATUSES.find((s) => s.value === value)?.label || value;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total de Leads</p>
          <div className="text-sm font-black text-slate-900">{filteredLeads.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase">En Negociación</p>
          <div className="text-sm font-black text-blue-700">{filteredLeads.filter((l) => l.status === 'negociacion').length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Sociedad Comercial</p>
          <div className="text-sm font-black text-emerald-700">{filteredLeads.filter((l) => l.status === 'sociedad_comercial').length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="w-full pl-9 py-2 text-xs border rounded-lg"
            placeholder="Buscar por negocio o giro..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          className="text-xs border rounded-lg px-3 bg-white"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Todos los Estados del Funnel</option>
          {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="text-xs border rounded-lg px-3 bg-white"
          value={filterState}
          onChange={(e) => { setFilterState(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Todos los Estados (geo)</option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Paginación superior */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1">
        <span>Página {currentPage} de {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={14} /></button>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-[22%]">Negocio / Giro</th>
                <th className="py-3 px-4 w-[18%]">Contacto</th>
                <th className="py-3 px-4 w-[13%]">Zona</th>
                <th className="py-3 px-4 text-center w-[13%]">Estado</th>
                <th className="py-3 px-4 w-[9%]">Agente</th>
                <th className="py-3 px-4 text-center w-[9%]">Fuente</th>
                <th className="py-3 px-4 text-center w-[10%]">Posibilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No hay leads que coincidan con los filtros.</td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/leads/${lead.id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 hover:underline">
                        {lead.business_name}
                      </Link>
                      <div className="text-[10px] text-slate-500 font-medium">{lead.business_type}</div>
                    </td>
                    <td className="py-3 px-4">
                      {lead.phone && <div className="flex items-center gap-1 text-[11px] text-slate-600"><Phone size={10} className="text-slate-400" /> {lead.phone}</div>}
                      {lead.email && <div className="flex items-center gap-1 text-[11px] text-slate-500"><Mail size={10} className="text-slate-400" /> {lead.email}</div>}
                      {!lead.phone && !lead.email && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {lead.zone_city ? (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1"><MapPin size={10} className="text-slate-400" /> {lead.zone_city}</div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                      {lead.state_name && <div className="text-[9px] text-slate-400">{lead.state_name}</div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">{lead.assigned_to || <span className="text-slate-300">Sin asignar</span>}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{SOURCE_LABELS[lead.source] || lead.source}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black" style={scoreStyle(lead.score_percent)}>
                        {lead.score_percent.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
