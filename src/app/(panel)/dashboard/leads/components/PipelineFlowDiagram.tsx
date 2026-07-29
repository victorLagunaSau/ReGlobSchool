'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  descripcion?: string | null;
  orden: number;
  tipo?: string;
  tasa_exito?: number;
  siguiente_etapa_id?: string | null;
  continuar_a_id?: string | null;
  regresar_a_id?: string | null;
  intentos_requeridos?: number;
}

interface PipelineFlowDiagramProps {
  stages: PipelineStage[];
}

const getTypeColor = (tipo?: string) => {
  switch (tipo) {
    case 'inicial':
      return { bg: 'bg-slate-50', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-700' };
    case 'contacto':
      return { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700' };
    case 'reunion':
      return { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' };
    case 'cierre':
      return { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-700' };
    case 'reagendar':
      return { bg: 'bg-purple-50', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' };
    default:
      return { bg: 'bg-slate-50', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-700' };
  }
};

export default function PipelineFlowDiagram({ stages }: PipelineFlowDiagramProps) {
  const sortedStages = [...stages].sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-6">
      {/* Flow visualization */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-4 min-w-full">
          {sortedStages.map((stage, idx) => {
            const colors = getTypeColor(stage.tipo);
            const nextStage = stages.find(s => s.id === stage.continuar_a_id);
            const backStage = stages.find(s => s.id === stage.regresar_a_id);

            return (
              <div key={stage.id} className="flex items-center gap-4">
                {/* Stage Card */}
                <div className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-5 w-72 shadow-md hover:shadow-lg transition-shadow flex-shrink-0`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900">{stage.titulo}</div>
                      <div className="text-xs text-slate-500 mt-1">Etapa {stage.orden}</div>
                    </div>
                    <span className={`${colors.badge} px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0`}>
                      {stage.tipo || 'contacto'}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-slate-200 mb-4"></div>

                  {/* Description */}
                  {stage.descripcion && (
                    <p className="text-xs text-slate-600 mb-4 line-clamp-2 italic">
                      {stage.descripcion}
                    </p>
                  )}

                  {/* Content */}
                  <div className="space-y-3 text-xs">
                    {/* Reintentos */}
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                        <span className="font-bold text-slate-700">Reintentos Máximos:</span>
                      </div>
                      <div className="text-slate-900 font-semibold ml-4">
                        {stage.intentos_requeridos || 1}
                      </div>
                    </div>

                    {/* Success Path */}
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-bold text-green-700">Éxito → Continuar a:</span>
                      </div>
                      <div className="text-green-700 font-semibold ml-4">
                        {nextStage ? nextStage.titulo : 'Terminal (Contrato)'}
                      </div>
                    </div>

                    {/* Failure Path - Only show if there's a back stage */}
                    {backStage && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="font-bold text-amber-700">Falla → Regresar a:</span>
                        </div>
                        <div className="text-amber-700 font-semibold ml-4">
                          {backStage.titulo}
                        </div>
                      </div>
                    )}

                    {/* Eliminate Lead - Show only if no back stage */}
                    {!backStage && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="font-bold text-red-700">Acción por Falla:</span>
                        </div>
                        <div className="text-red-700 font-semibold ml-4">
                          Eliminar lead
                        </div>
                      </div>
                    )}

                    {/* Clave */}
                    <div className="text-center text-slate-500 text-xs pt-2 border-t border-slate-200">
                      Clave: <span className="font-mono font-bold text-slate-700">{stage.clave}</span>
                    </div>
                  </div>
                </div>

                {/* Arrow to next stage */}
                {idx < sortedStages.length - 1 && (
                  <div className="flex items-center justify-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight size={24} className="text-slate-400" strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
          <span className="text-sm text-green-700"><strong>Verde:</strong> Camino de éxito</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></div>
          <span className="text-sm text-amber-700"><strong>Amarillo:</strong> Camino de falla</span>
        </div>
      </div>
    </div>
  );
}
