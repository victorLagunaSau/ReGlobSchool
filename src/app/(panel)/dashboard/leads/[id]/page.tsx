'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Globe, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import LeadTaskList, { type LeadTaskRow } from '../components/LeadTaskList';
import LeadInteractionHistory from '../components/LeadInteractionHistory';
import EmailComposer from '../components/EmailComposer';
import ScoreChecklist, { type LeadScoreStep } from '../components/ScoreChecklist';
import { LEAD_STATUSES } from '../page';

interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  descripcion: string | null;
  objetivo: string | null;
  orden: number;
  limite_pospuestas: number;
}

interface LeadDetail {
  id: string;
  business_name: string;
  business_type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  status: string;
  source: string;
  created_at: string;
  score_percent: number;
  zone_city: string | null;
  state_name: string | null;
  country_name: string | null;
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [tasks, setTasks] = useState<LeadTaskRow[]>([]);
  const [scoreSteps, setScoreSteps] = useState<LeadScoreStep[]>([]);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const fetchLead = useCallback(async () => {
    const [leadRes, tasksRes, stepsRes, progressRes, stagesRes] = await Promise.all([
      supabase
        .from('leads')
        .select('*, zones(city), states(name), countries(name)')
        .eq('id', leadId)
        .single(),
      supabase.from('lead_tasks').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('lead_score_steps').select('id, stage, label, weight, sort_order').order('sort_order'),
      supabase.from('lead_score_progress').select('step_id').eq('lead_id', leadId),
      supabase.from('pipeline_stages').select('*').order('orden'),
    ]);

    const { data, error } = leadRes;
    if (error || !data) {
      setLoading(false);
      return;
    }

    setLead({
      id: data.id,
      business_name: data.business_name,
      business_type: data.business_type,
      phone: data.phone,
      email: data.email,
      address: data.address,
      website: data.website,
      status: data.status,
      source: data.source,
      created_at: data.created_at,
      score_percent: data.score_percent || 0,
      zone_city: data.zones?.city || null,
      state_name: data.states?.name || null,
      country_name: data.countries?.name || null,
    });

    if (tasksRes.data) setTasks(tasksRes.data);
    if (stepsRes.data) setScoreSteps(stepsRes.data);
    if (progressRes.data) setCompletedStepIds(new Set(progressRes.data.map((p) => p.step_id)));
    if (stagesRes.data) setStages(stagesRes.data as PipelineStage[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    setIsSavingStatus(true);
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
    if (!error) setLead({ ...lead, status: newStatus });
    setIsSavingStatus(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando Lead...</div>;
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        No se encontró este lead.
        <div className="mt-3">
          <Link href="/dashboard/leads" className="text-blue-600 hover:underline text-sm font-semibold">Volver al listado</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/leads" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 w-fit">
        <ArrowLeft size={14} /> Volver al listado de Leads
      </Link>

      {/* DATOS GENERALES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Building2 size={14} className="text-slate-400" />
            <h1 className="text-lg font-black text-slate-950">{lead.business_name}</h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isSavingStatus}
              className="border border-slate-200 rounded-lg p-2 text-xs font-bold bg-white focus:outline-blue-600"
            >
              {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={() => setIsEmailOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
            >
              <Mail size={13} /> Enviar Correo
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 mb-4">
          <span className="font-semibold text-slate-700">{lead.business_type}</span>
          {lead.phone && <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400" /> {lead.phone}</span>}
          {lead.email && <span className="flex items-center gap-1"><Mail size={11} className="text-slate-400" /> {lead.email}</span>}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
              <Globe size={11} className="text-slate-400" /> {lead.website}
            </a>
          )}
          {lead.address && <span>{lead.address}</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Zona</p>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
              {lead.zone_city ? <><MapPin size={12} className="text-slate-400" /> {lead.zone_city}</> : '—'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Estado / País</p>
            <p className="text-sm font-bold text-slate-800">{lead.state_name || '—'}{lead.country_name ? `, ${lead.country_name}` : ''}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Fuente</p>
            <p className="text-sm font-bold text-slate-800 capitalize">{lead.source}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Creado</p>
            <p className="text-sm font-bold text-slate-800">{new Date(lead.created_at).toLocaleDateString('es-MX')}</p>
          </div>
        </div>
      </div>

      {/* Sección de Información de Etapa del Pipeline */}
      {stages.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          {(() => {
            const currentStage = stages.find(s => s.clave === lead.status);
            if (!currentStage) return null;

            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-1">Etapa Actual</h2>
                    <p className="text-lg font-bold text-slate-950">{currentStage.titulo}</p>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 rounded-lg">
                    <CheckCircle2 size={13} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-600">Paso {currentStage.orden} de {stages.length}</span>
                  </div>
                </div>

                {currentStage.descripcion && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Descripción</p>
                    <p className="text-sm text-slate-700">{currentStage.descripcion}</p>
                  </div>
                )}

                {currentStage.objetivo && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Objetivo Comercial</p>
                    <p className="text-sm text-emerald-900">{currentStage.objetivo}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Límite de Pospuestas</p>
                    <p className="text-xl font-bold text-slate-800">{currentStage.limite_pospuestas}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <ScoreChecklist
        leadId={lead.id}
        scorePercent={lead.score_percent}
        steps={scoreSteps}
        completedStepIds={completedStepIds}
        onRefresh={fetchLead}
      />

      <LeadTaskList leadId={lead.id} tasks={tasks} onRefresh={fetchLead} />

      <LeadInteractionHistory leadId={lead.id} onRefresh={fetchLead} />

      <EmailComposer
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        leadId={lead.id}
        leadEmail={lead.email}
        leadName={lead.business_name}
        onSent={fetchLead}
      />
    </div>
  );
}
