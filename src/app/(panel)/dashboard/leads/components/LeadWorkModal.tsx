'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import LeadTaskList, { type LeadTaskRow } from './LeadTaskList';

interface LeadWorkModalProps {
  isOpen: boolean;
  leadId: string | null;
  onClose: () => void;
  onTaskResolved?: () => void;
}

interface LeadBasicInfo {
  id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  score_percent: number;
}

interface InteractionRecord {
  id: string;
  action_label: string | null;
  message: string | null;
  created_at: string;
  actor_name?: string;
}

function getActionBadgeColor(actionLabel: string | null): { bg: string; text: string } {
  if (!actionLabel) return { bg: 'bg-slate-100', text: 'text-slate-700' };

  const label = actionLabel.toLowerCase();
  if (label.includes('éxito') || label.includes('exito')) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (label.includes('posponer') || label.includes('postpone')) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  if (label.includes('descartar') || label.includes('discard')) return { bg: 'bg-red-100', text: 'text-red-700' };
  if (label.includes('regresar') || label.includes('return')) return { bg: 'bg-blue-100', text: 'text-blue-700' };

  return { bg: 'bg-blue-100', text: 'text-blue-700' };
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'hace unos segundos';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffMins < 1440) return `hace ${Math.floor(diffMins / 60)}h`;
  return `hace ${Math.floor(diffMins / 1440)}d`;
}

export default function LeadWorkModal({ isOpen, leadId, onClose, onTaskResolved }: LeadWorkModalProps) {
  const [lead, setLead] = useState<LeadBasicInfo | null>(null);
  const [tasks, setTasks] = useState<LeadTaskRow[]>([]);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !leadId) {
      setLead(null);
      setTasks([]);
      setInteractions([]);
      return;
    }

    const fetchLeadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [leadRes, tasksRes, interactionsRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id, business_name, phone, email, status, score_percent')
            .eq('id', leadId)
            .single(),
          supabase
            .from('lead_tasks')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false }),
          supabase
            .from('lead_interactions')
            .select('*, actor:profiles(id, full_name)')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (leadRes.error) throw leadRes.error;
        if (leadRes.data) setLead(leadRes.data);

        if (tasksRes.data) setTasks(tasksRes.data);

        if (interactionsRes.data) {
          const mapped = interactionsRes.data.map((item: any) => ({
            ...item,
            actor_name: item.actor?.full_name || 'Usuario desconocido',
          }));
          setInteractions(mapped);
        }
      } catch (err) {
        console.error('Error fetching lead data:', err);
        setError('No se pudo cargar la información del lead');
      } finally {
        setLoading(false);
      }
    };

    fetchLeadData();
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 text-white p-4 border-b border-slate-800">
          <div className="flex-1">
            <h2 className="text-lg font-bold">{lead?.business_name || 'Cargando...'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lead?.phone && <span className="flex items-center gap-1"><Phone size={11} /> {lead.phone}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Left Panel: Lead Details + Tasks */}
          <div className="flex-1 border-r border-slate-200 p-4 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-48 text-slate-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                Cargando...
              </div>
            )}

            {error && (
              <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {!loading && lead && (
              <>
                {/* Lead Summary Card */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Estado</p>
                        <p className="text-sm font-bold text-slate-800">{lead.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Puntuación</p>
                        <p className="text-lg font-bold text-blue-600">{lead.score_percent}%</p>
                      </div>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail size={12} /> {lead.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Tareas Pendientes ({tasks.filter(t => t.status === 'pendiente').length})
                  </h3>
                  {tasks.filter(t => t.status === 'pendiente').length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-lg text-center">
                      Sin tareas pendientes
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {tasks
                        .filter(t => t.status === 'pendiente')
                        .map((task) => (
                          <div key={task.id} className="border border-slate-200 rounded-lg p-2.5 bg-white text-xs">
                            <div className="font-bold text-slate-800 mb-1">{task.description || 'Tarea'}</div>
                            {task.scheduled_for && (
                              <p className="text-[10px] text-slate-500 mb-1.5">
                                Programada: {new Date(task.scheduled_for).toLocaleDateString('es-MX')}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel: Interaction History */}
          <div className="w-80 bg-slate-50 p-4 flex flex-col border-l border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Últimas Interacciones</h3>

            {interactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400">
                Sin interacciones todavía
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {interactions.map((interaction) => {
                  const badge = getActionBadgeColor(interaction.action_label);
                  const relativeTime = getRelativeTime(interaction.created_at);

                  return (
                    <div key={interaction.id} className="bg-white rounded-lg p-2.5 border border-slate-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-700">{interaction.actor_name}</span>
                        <span className="text-[9px] text-slate-500">{relativeTime}</span>
                      </div>

                      {interaction.action_label && (
                        <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${badge.bg} ${badge.text} mb-1.5`}>
                          {interaction.action_label}
                        </div>
                      )}

                      {interaction.message && (
                        <p className="text-[9px] text-slate-700 italic line-clamp-3">&ldquo;{interaction.message}&rdquo;</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
