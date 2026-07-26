'use client';

import React, { useMemo } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Target } from 'lucide-react';
import { scoreStyle } from '../../../../../lib/lead-score';
import { DEFAULT_LEAD_STATUSES } from '../page';

export interface LeadScoreStep {
  id: string;
  stage: string;
  label: string;
  weight: number;
  sort_order: number;
}

interface ScoreChecklistProps {
  leadId: string;
  scorePercent: number;
  steps: LeadScoreStep[];
  completedStepIds: Set<string>;
  onRefresh: () => void;
}

const STAGES = DEFAULT_LEAD_STATUSES.filter((s) => s.value !== 'descartado');

export default function ScoreChecklist({ leadId, scorePercent, steps, completedStepIds, onRefresh }: ScoreChecklistProps) {
  const stepsByStage = useMemo(() => {
    const grouped: Record<string, LeadScoreStep[]> = {};
    for (const stage of STAGES) grouped[stage.value] = [];
    for (const step of steps) {
      if (!grouped[step.stage]) grouped[step.stage] = [];
      grouped[step.stage].push(step);
    }
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));
    return grouped;
  }, [steps]);

  const toggleStep = async (step: LeadScoreStep) => {
    const isCompleted = completedStepIds.has(step.id);

    if (isCompleted) {
      const { error } = await supabase
        .from('lead_score_progress')
        .delete()
        .eq('lead_id', leadId)
        .eq('step_id', step.id);
      if (error) {
        console.error('Error al desmarcar sub-paso:', error);
        return;
      }
    } else {
      const { error } = await supabase.from('lead_score_progress').insert({ lead_id: leadId, step_id: step.id });
      if (error) {
        console.error('Error al marcar sub-paso:', error);
        return;
      }
    }

    onRefresh();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Target size={14} className="text-slate-400" />
          <h2 className="text-xs font-black uppercase tracking-wider">Checklist de Avance</h2>
        </div>
        <span className="px-3 py-1 rounded-lg text-sm font-black" style={scoreStyle(scorePercent)}>
          {scorePercent.toFixed(0)}% Posibilidad
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {STAGES.map((stage) => (
          <div key={stage.value} className="p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{stage.label}</p>
            {(stepsByStage[stage.value] || []).length === 0 ? (
              <p className="text-[10px] text-slate-300">Sin sub-pasos configurados.</p>
            ) : (
              <ul className="space-y-1.5">
                {stepsByStage[stage.value].map((step) => (
                  <li key={step.id}>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={completedStepIds.has(step.id)}
                        onChange={() => toggleStep(step)}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <span className="text-[11px] text-slate-700 group-hover:text-slate-900">
                        {step.label} <span className="text-slate-400 font-semibold">({step.weight}%)</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
