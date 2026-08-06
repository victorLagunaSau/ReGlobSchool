'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { Search, MapPin, Phone, Mail, Globe, Maximize2, Calendar, Info } from 'lucide-react';
import { scoreStyle } from '../../../../../lib/lead-score';
import StageNavigatorModal from './StageNavigatorModal';
import type { LeadRow, StateRow, PipelineStage, DEFAULT_LEAD_STATUSES } from '../page';
import { DEFAULT_LEAD_STATUSES as DEFAULTS } from '../page';

interface LeadsKanbanProps {
  leads: LeadRow[];
  states: StateRow[];
  stages: PipelineStage[];
  onRefresh: () => void;
}

const COLUMN_ACCENTS: Record<string, string> = {
  prospecto: 'border-t-emerald-300',
  llamada: 'border-t-emerald-400',
  negociacion: 'border-t-emerald-600',
  sociedad_comercial: 'border-t-emerald-700',
  descartado: 'border-t-rose-400',
};

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  prospecto: 'Potenciales clientes a los que aún no hemos contactado',
  llamada: 'Clientes con los que hemos establecido contacto inicial',
  negociacion: 'En demostración y evaluación de nuestros servicios',
  sociedad_comercial: 'Acuerdos cerrados y asociaciones establecidas',
  descartado: 'Clientes descartados o sin interés',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  denue: 'DENUE',
  google_maps: 'Google Maps',
  csv: 'CSV',
};

export default function LeadsKanban({ leads, states, stages, onRefresh }: LeadsKanbanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedStageType, setSelectedStageType] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Excluir leads descartados del pipeline
      if (l.status === 'descartado') return false;

      const matchesSearch =
        l.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.business_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = filterState ? l.state_id === filterState : true;
      return matchesSearch && matchesState;
    });
  }, [leads, searchTerm, filterState]);

  // Detectar leads con etapas inválidas y reiniciarlos automáticamente
  const leadsWithValidStatus = useMemo(() => {
    const stageClavesSet = new Set(stages.map(s => s.clave));
    const firstStage = stages.length > 0 ? stages[0] : DEFAULTS[0];
    const firstStageId = 'clave' in firstStage ? firstStage.clave : firstStage.value;

    return filteredLeads.map(lead => {
      const hasValidStatus = stageClavesSet.has(lead.status);
      if (!hasValidStatus) {
        // Reasignar a la primera etapa
        supabase.from('leads').update({ status: firstStageId }).eq('id', lead.id).then(() => onRefresh());
        return { ...lead, status: firstStageId, statusReset: true };
      }
      return lead;
    });
  }, [filteredLeads, stages]);

  const columns = useMemo(() => {
    const stagesToUse = stages.length > 0 ? stages : DEFAULTS.map(s => ({
      id: s.value,
      clave: s.value,
      titulo: s.label,
      descripcion: null,
      objetivo: null,
      orden: DEFAULTS.findIndex(ds => ds.value === s.value),
      limite_pospuestas: 3,
      intentos_requeridos: 1,
    }));

    return stagesToUse.map((s) => ({
      value: s.clave,
      label: s.titulo,
      leads: leadsWithValidStatus.filter((l) => l.status === s.clave),
    }));
  }, [leadsWithValidStatus, stages]);

  const handleDrop = async (newStatus: string) => {
    setDragOverStatus(null);
    if (!draggedId) return;
    const lead = leads.find((l) => l.id === draggedId);
    setDraggedId(null);
    if (!lead || lead.status === newStatus) return;

    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', draggedId);
    if (error) {
      console.error('Error al mover lead:', error);
      return;
    }
    onRefresh();
  };


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Filtros y Búsqueda</h3>
          <div className="group relative">
            <Info size={16} className="text-slate-400 cursor-help hover:text-slate-600" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50">
              Busca por nombre de negocio o giro comercial, filtra por estado
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full pl-9 py-2 text-xs border rounded-lg"
              placeholder="Buscar por negocio o giro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="text-xs border rounded-lg px-3 bg-white"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
          >
            <option value="">Todos los Estados (geo)</option>
            {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.value}
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus(col.value); }}
            onDragLeave={() => setDragOverStatus((s) => (s === col.value ? null : s))}
            onDrop={(e) => { e.preventDefault(); handleDrop(col.value); }}
            className={`shrink-0 w-72 rounded-2xl border-t-4 ${COLUMN_ACCENTS[col.value]} bg-slate-50/60 transition-colors ${dragOverStatus === col.value ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-1.5 flex-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">{col.label}</h3>
                <div className="group relative">
                  <Info size={13} className="text-slate-400 cursor-help hover:text-slate-600 flex-shrink-0" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-normal z-50 w-48">
                    {COLUMN_DESCRIPTIONS[col.value] || 'Etapa del pipeline'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 flex-shrink-0">{col.leads.length}</span>
            </div>

            <div className="px-2 pb-2 space-y-2 min-h-[80px]">
              {col.leads.map((lead) => (
                <div
                  key={lead.id}
                  draggable={!lead.is_discarded}
                  onDragStart={() => setDraggedId(lead.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all space-y-1.5 ${
                    lead.is_discarded
                      ? 'border-red-200 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 cursor-grab active:cursor-grabbing'
                  } ${draggedId === lead.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 flex items-start gap-1.5">
                      <Link href={`/dashboard/leads/${lead.id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 hover:underline leading-tight">
                        {lead.business_name}
                      </Link>
                      <button
                        disabled
                        className="p-0.5 text-slate-300 hover:text-slate-300 rounded flex-shrink-0 mt-0.5"
                        title="Ver detalles"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {lead.is_discarded && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-700 uppercase" title="Lead descartado">
                          Descartado
                        </span>
                      )}
                      {(lead as any).statusReset && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-orange-100 text-orange-700 uppercase" title="Ficha reiniciada a la etapa inicial">
                          Reiniciada
                        </span>
                      )}
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black" style={scoreStyle(lead.score_percent)}>
                        {lead.score_percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium">{lead.business_type}</div>

                  {lead.zone_city && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <MapPin size={10} className="text-slate-400" /> {lead.zone_city}{lead.state_name ? `, ${lead.state_name}` : ''}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      {lead.phone && <Phone size={11} className="text-slate-400" />}
                      {lead.email && <Mail size={11} className="text-slate-400" />}
                      {lead.website && <Globe size={11} className="text-slate-400" />}
                    </div>
                    <span className="text-[8px] font-bold text-slate-300 uppercase">{SOURCE_LABELS[lead.source] || lead.source}</span>
                  </div>

                  {(() => {
                    const leadStage = stages.find(s => s.clave === lead.status);
                    if (!leadStage) return null;

                    const buttonConfig: Record<string, { label: string; icon: React.ReactNode; bgColor: string; title: string }> = {
                      inicial: {
                        label: 'Calendarizar',
                        icon: <Calendar size={11} />,
                        bgColor: 'bg-slate-700 hover:bg-slate-800',
                        title: 'Calendarizar inicio de campaña',
                      },
                      contacto: {
                        label: 'Trabajar',
                        icon: <Mail size={11} />,
                        bgColor: 'bg-amber-600 hover:bg-amber-700',
                        title: 'Registrar intento de contacto',
                      },
                      reunion: {
                        label: 'Calendarizar',
                        icon: <Calendar size={11} />,
                        bgColor: 'bg-blue-600 hover:bg-blue-700',
                        title: 'Calendarizar reunión de demostración',
                      },
                      reagendar: {
                        label: 'Reagendar',
                        icon: <Calendar size={11} />,
                        bgColor: 'bg-purple-600 hover:bg-purple-700',
                        title: 'Reagendar reunión',
                      },
                      documentacion: {
                        label: 'Trabajar',
                        icon: <Mail size={11} />,
                        bgColor: 'bg-green-600 hover:bg-green-700',
                        title: 'Gestionar documentación',
                      },
                    };

                    const config = leadStage.tipo ? buttonConfig[leadStage.tipo as keyof typeof buttonConfig] : null;
                    if (!config || !leadStage.tipo) return null;

                    return (
                      <button
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setSelectedStageType(leadStage.tipo!);
                          setIsStageModalOpen(true);
                        }}
                        className={`w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold text-white ${config.bgColor} rounded-lg transition-colors`}
                        title={config.title}
                      >
                        {config.icon}
                        {config.label}
                      </button>
                    );
                  })()}
                </div>
              ))}

              {col.leads.length === 0 && (
                <div className="text-center text-[10px] text-slate-300 py-6 border border-dashed border-slate-200 rounded-xl mx-1">
                  Sin leads aquí
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedLeadId && (
        <StageNavigatorModal
          leadId={selectedLeadId}
          lead={selectedLeadId ? (leads.find(l => l.id === selectedLeadId) as any) : null}
          stages={stages}
          isOpen={isStageModalOpen}
          onClose={() => {
            setIsStageModalOpen(false);
            setSelectedLeadId(null);
            setSelectedStageType(null);
          }}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
