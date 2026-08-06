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

const TIPO_COLORS: Record<string, string> = {
  inicial: 'border-t-blue-400',
  contacto: 'border-t-orange-400',
  reunion: 'border-t-purple-400',
  reagendar: 'border-t-pink-400',
  documentacion: 'border-t-green-400',
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

const detectSocialMedia = (url: string | null): { type: string; color: string; bgColor: string; label: string } | null => {
  if (!url) return null;

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('facebook.com')) {
    return { type: 'facebook', color: 'text-white', bgColor: 'bg-blue-600 hover:bg-blue-700', label: 'Facebook' };
  }
  if (lowerUrl.includes('instagram.com')) {
    return { type: 'instagram', color: 'text-white', bgColor: 'bg-pink-600 hover:bg-pink-700', label: 'Instagram' };
  }
  if (lowerUrl.includes('linkedin.com')) {
    return { type: 'linkedin', color: 'text-white', bgColor: 'bg-blue-700 hover:bg-blue-800', label: 'LinkedIn' };
  }
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return { type: 'twitter', color: 'text-white', bgColor: 'bg-slate-700 hover:bg-slate-800', label: 'Twitter' };
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return { type: 'youtube', color: 'text-white', bgColor: 'bg-red-600 hover:bg-red-700', label: 'YouTube' };
  }
  if (lowerUrl.includes('tiktok.com')) {
    return { type: 'tiktok', color: 'text-white', bgColor: 'bg-black hover:bg-slate-900', label: 'TikTok' };
  }

  return null;
};

export default function LeadsKanban({ leads, states, stages, onRefresh }: LeadsKanbanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedStageType, setSelectedStageType] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

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

  const toggleColumnCollapse = (columnValue: string) => {
    const newCollapsed = new Set(collapsedColumns);
    if (newCollapsed.has(columnValue)) {
      newCollapsed.delete(columnValue);
    } else {
      newCollapsed.add(columnValue);
    }
    setCollapsedColumns(newCollapsed);
  };


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-900 w-[25%]">Pipeline de Leads</h3>
          <div className="relative w-[40%]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full pl-9 py-2 text-xs border border-slate-200 rounded-lg"
              placeholder="Buscar por negocio o giro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="text-xs border border-slate-200 rounded-lg px-3 bg-white w-[35%]"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
          >
            <option value="">Todos los Estados (geo)</option>
            {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="p-3 overflow-x-auto">
          <div className="flex gap-0">
        {columns.map((col) => {
          const isCollapsed = collapsedColumns.has(col.value) || (col.leads.length === 0 && col.leads.length === 0);
          const shouldShowCollapsed = col.leads.length === 0 || collapsedColumns.has(col.value);
          const columnStage = stages.find(s => s.clave === col.value);
          const borderColor = columnStage && columnStage.tipo ? TIPO_COLORS[columnStage.tipo] || COLUMN_ACCENTS[col.value] : COLUMN_ACCENTS[col.value];

          return (
            <div
              key={col.value}
              onDragOver={(e) => { e.preventDefault(); setDragOverStatus(col.value); }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.value ? null : s))}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.value); }}
              className={`shrink-0 ${shouldShowCollapsed ? 'w-12' : 'w-48'} rounded-t-2xl rounded-b-lg border-t-4 ${borderColor} ${
                columns.indexOf(col) % 2 === 0 ? 'bg-slate-50/60' : 'bg-slate-200/70'
              } transition-all transition-width ${dragOverStatus === col.value ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
            >
              {shouldShowCollapsed ? (
                <button
                  onClick={() => toggleColumnCollapse(col.value)}
                  className="w-full h-full flex flex-col items-center justify-start pt-1 p-2 group"
                  title={col.label}
                >
                  <span className="text-[7px] font-bold text-slate-400 text-center leading-tight group-hover:text-slate-600 truncate px-0.5 mt-5">
                    {col.label.split(' ')[0]}
                  </span>
                  {col.leads.length > 0 && (
                    <span className="text-[8px] font-bold text-slate-400 mt-1 bg-white px-1 py-0.5 rounded-full border border-slate-200">
                      {col.leads.length}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl rounded-b-md ${
                    columns.indexOf(col) % 2 === 0 ? 'bg-slate-950' : 'bg-slate-800'
                  }`}>
                    <div className="flex items-center gap-1.5 flex-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">{col.label}</h3>
                    </div>
                    <span className="text-[15px] font-bold text-white flex-shrink-0">{col.leads.length}</span>
                  </div>

                  <div className="px-1 pt-2 pb-1 space-y-1 min-h-[80px]">
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
                  <div className="text-center">
                    <div className="font-bold text-slate-900 text-sm">
                      {lead.business_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 justify-center">
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
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium">{lead.business_type}</div>

                  {lead.zone_city && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <MapPin size={10} className="text-slate-400" /> {lead.zone_city}{lead.state_name ? `, ${lead.state_name}` : ''}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-slate-50">
                    {lead.phone && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-green-600 hover:text-green-700"
                        title="Abrir WhatsApp"
                      >
                        <Phone size={11} />
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-blue-600 hover:text-blue-700"
                        title="Enviar email"
                      >
                        <Mail size={11} />
                      </a>
                    )}
                    {lead.website && (() => {
                      const socialMedia = detectSocialMedia(lead.website);
                      if (socialMedia) {
                        return (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-1.5 rounded transition-colors ${socialMedia.bgColor} ${socialMedia.color}`}
                            title={`Abrir ${socialMedia.label}`}
                          >
                            <Globe size={11} />
                          </a>
                        );
                      }
                      return (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-700"
                          title="Abrir sitio web"
                        >
                          <Globe size={11} />
                        </a>
                      );
                    })()}
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
                      <>
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
                        <div className="flex justify-center mt-2">
                          <span className="text-[7px] font-bold text-slate-300 uppercase">{SOURCE_LABELS[lead.source] || lead.source}</span>
                        </div>
                        <div className="flex justify-center mt-4 pt-3 border-t border-slate-100">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                            title="Ver detalles del lead"
                          >
                            <Maximize2 size={12} />
                            <span>Ver detalles</span>
                          </Link>
                        </div>
                      </>
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
                </>
              )}
            </div>
          );
        })}
          </div>
        </div>
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
