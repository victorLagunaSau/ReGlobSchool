'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { Search, MapPin, Phone, Mail, Globe, Maximize2, Calendar, Clock, Play } from 'lucide-react';
import { scoreStyle } from '../../../../../lib/lead-score';
import LeadWorkModal from './LeadWorkModal';
import InitialCampaignModal from './InitialCampaignModal';
import type { LeadRow, StateRow, PipelineStage, DEFAULT_LEAD_STATUSES } from '../page';
import { DEFAULT_LEAD_STATUSES as DEFAULTS } from '../page';

interface LeadsKanbanProps {
  leads: LeadRow[];
  states: StateRow[];
  stages: PipelineStage[];
  onRefresh: () => void;
}

const COLUMN_ACCENTS: Record<string, string> = {
  prospecto: 'border-t-slate-400',
  llamada: 'border-t-amber-400',
  negociacion: 'border-t-blue-500',
  sociedad_comercial: 'border-t-emerald-500',
  descartado: 'border-t-rose-400',
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
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignLeadId, setCampaignLeadId] = useState<string | null>(null);
  const [schedulingLeadId, setSchedulingLeadId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.business_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = filterState ? l.state_id === filterState : true;
      return matchesSearch && matchesState;
    });
  }, [leads, searchTerm, filterState]);

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
      leads: filteredLeads.filter((l) => l.status === s.clave),
    }));
  }, [filteredLeads, stages]);

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

  const handleScheduleLead = async (leadId: string, date: string) => {
    if (!date) return;

    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Get the first pending task for this lead
      const { data: tasks, error: tasksError } = await supabase
        .from('lead_tasks')
        .select('id')
        .eq('lead_id', leadId)
        .eq('status', 'pendiente')
        .order('created_at', { ascending: true })
        .limit(1);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) {
        alert('No hay tareas pendientes para este lead');
        return;
      }

      // Update task with scheduled date
      const taskId = tasks[0].id;
      const { error: taskError } = await supabase
        .from('lead_tasks')
        .update({ scheduled_for: date })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Move lead to next stage
      const currentStage = stages.find(s => s.clave === lead.status);
      const nextStage = stages.find(s => currentStage && s.orden === currentStage.orden + 1);

      if (nextStage) {
        const { error: leadError } = await supabase
          .from('leads')
          .update({ status: nextStage.clave })
          .eq('id', leadId);

        if (leadError) throw leadError;
      }

      setSchedulingLeadId(null);
      setScheduledDate('');
      onRefresh();
    } catch (error) {
      console.error('Error al calendarizar lead:', error);
      alert('Error al calendarizar el lead');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
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
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">{col.label}</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{col.leads.length}</span>
            </div>

            <div className="px-2 pb-2 space-y-2 min-h-[80px]">
              {col.leads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggedId(lead.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing space-y-1.5 ${draggedId === lead.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 flex items-start gap-1.5">
                      <Link href={`/dashboard/leads/${lead.id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 hover:underline leading-tight">
                        {lead.business_name}
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setIsLeadModalOpen(true);
                        }}
                        className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all flex-shrink-0 mt-0.5"
                        title="Ver detalles"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black" style={scoreStyle(lead.score_percent)}>
                      {lead.score_percent.toFixed(0)}%
                    </span>
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

                  {schedulingLeadId === lead.id && (
                    <div className="pt-2 border-t border-slate-100 bg-slate-50/50 -mx-3 -mb-3 px-3 py-2 rounded-b-xl space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-700">Calendarizar:</label>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                        <button
                          onClick={() => handleScheduleLead(lead.id, scheduledDate)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setSchedulingLeadId(null)}
                          className="px-2 py-1 border border-slate-200 text-xs font-bold rounded hover:bg-slate-100"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const leadStage = stages.find(s => s.clave === lead.status);
                    const isFirstStage = leadStage && leadStage.orden === 1;
                    const isSecondStage = leadStage && leadStage.orden === 2;

                    if (isFirstStage) {
                      return (
                        <button
                          onClick={() => {
                            setCampaignLeadId(lead.id);
                            setIsCampaignModalOpen(true);
                          }}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Iniciar trabajo en el lead"
                        >
                          <Play size={11} />
                          Trabajar
                        </button>
                      );
                    }

                    if (isSecondStage) {
                      return (
                        <button
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setIsLeadModalOpen(true);
                          }}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                          title="Registrar intento de contacto"
                        >
                          <Play size={11} />
                          Trabajar
                        </button>
                      );
                    }

                    return null;
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

      <LeadWorkModal
        isOpen={isLeadModalOpen}
        leadId={selectedLeadId}
        onClose={() => {
          setIsLeadModalOpen(false);
          setSelectedLeadId(null);
        }}
        onTaskResolved={onRefresh}
      />

      {campaignLeadId && (
        <InitialCampaignModal
          isOpen={isCampaignModalOpen}
          lead={campaignLeadId ? leads.find(l => l.id === campaignLeadId) || null : null}
          onClose={() => {
            setIsCampaignModalOpen(false);
            setCampaignLeadId(null);
          }}
          onCampaignStarted={onRefresh}
        />
      )}
    </div>
  );
}
