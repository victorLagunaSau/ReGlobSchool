'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { MessageCircle, CheckCircle2, Clock, Trash2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface InteractionRecord {
  id: string;
  lead_id: string;
  interaction_type: string;
  actor_id: string;
  action_label: string | null;
  message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
}

interface LeadInteractionHistoryProps {
  leadId: string;
  onRefresh?: () => void;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'hace unos segundos';
  if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

  return date.toLocaleDateString('es-MX');
}

function getActionBadgeColor(actionLabel: string | null): { bg: string; text: string; icon: React.ReactNode } {
  if (!actionLabel) return { bg: 'bg-slate-100', text: 'text-slate-700', icon: <MessageCircle size={13} /> };

  const label = actionLabel.toLowerCase();
  if (label.includes('éxito') || label.includes('exito')) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={13} /> };
  }
  if (label.includes('posponer') || label.includes('postpone')) {
    return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={13} /> };
  }
  if (label.includes('descartar') || label.includes('discard')) {
    return { bg: 'bg-red-100', text: 'text-red-700', icon: <Trash2 size={13} /> };
  }
  if (label.includes('regresar') || label.includes('return')) {
    return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <ArrowRight size={13} /> };
  }

  return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <MessageCircle size={13} /> };
}

function getActorInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || '?').toUpperCase();
}

export default function LeadInteractionHistory({ leadId, onRefresh }: LeadInteractionHistoryProps) {
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInteractions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from('lead_interactions')
          .select('*, actor:profiles(id, full_name)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (queryError) throw queryError;

        if (data) {
          const mappedInteractions = data.map((item: any) => ({
            ...item,
            actor_name: item.actor?.full_name || 'Usuario desconocido',
          }));
          setInteractions(mappedInteractions);
        }
      } catch (err) {
        console.error('Error fetching interactions:', err);
        setError('No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    };

    fetchInteractions();
  }, [leadId, onRefresh]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          Historial de Interacciones ({interactions.length})
        </h2>
      </div>

      {loading && (
        <div className="p-6 flex items-center justify-center text-slate-500">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span className="text-xs">Cargando historial...</span>
        </div>
      )}

      {error && (
        <div className="p-4 flex gap-2 items-start bg-red-50 border-t border-red-100">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {!loading && interactions.length === 0 && (
        <div className="p-6 text-center text-xs text-slate-400">
          Sin interacciones todavía — las acciones sobre tareas aparecerán aquí.
        </div>
      )}

      {!loading && interactions.length > 0 && (
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {interactions.map((interaction) => {
            const badge = getActionBadgeColor(interaction.action_label);
            const initials = getActorInitials(interaction.actor_name);
            const relativeTime = getRelativeTime(interaction.created_at);

            return (
              <div key={interaction.id} className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  {/* Actor avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600">{initials}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Actor + Time */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">
                        {interaction.actor_name}
                      </span>
                      <span className="text-[10px] text-slate-400">{relativeTime}</span>
                    </div>

                    {/* Action Badge */}
                    {interaction.action_label && (
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${badge.bg} mb-2`}>
                        <span className={`${badge.text}`}>
                          {badge.icon}
                        </span>
                        <span className={`text-[10px] font-bold ${badge.text}`}>
                          {interaction.action_label}
                        </span>
                      </div>
                    )}

                    {/* Message */}
                    {interaction.message && (
                      <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2.5 mb-2 border border-slate-100">
                        &ldquo;{interaction.message}&rdquo;
                      </div>
                    )}

                    {/* Metadata Details */}
                    {interaction.metadata && (
                      <div className="space-y-1 text-[10px] text-slate-600">
                        {interaction.metadata.previous_stage && interaction.metadata.new_stage && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-700">Etapa:</span>
                            <span>{interaction.metadata.previous_stage}</span>
                            <ArrowRight size={10} />
                            <span className="font-semibold text-emerald-600">{interaction.metadata.new_stage}</span>
                          </div>
                        )}
                        {interaction.metadata.new_scheduled_date && (
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>Reprogramada para: {new Date(interaction.metadata.new_scheduled_date).toLocaleString('es-MX')}</span>
                          </div>
                        )}
                        {interaction.metadata.reason && (
                          <div className="flex items-start gap-1">
                            <span className="font-semibold text-slate-700 flex-shrink-0">Razón:</span>
                            <span>{interaction.metadata.reason}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
