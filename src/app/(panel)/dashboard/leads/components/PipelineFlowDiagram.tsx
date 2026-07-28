'use client';

import React from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';

interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  orden: number;
  tipo?: string;
  continuar_a_id?: string | null;
  regresar_a_id?: string | null;
}

interface PipelineFlowDiagramProps {
  stages: PipelineStage[];
}

const getTypeColor = (tipo?: string) => {
  switch (tipo) {
    case 'inicial':
      return 'bg-slate-100 border-slate-300';
    case 'contacto':
      return 'bg-amber-50 border-amber-300';
    case 'reunion':
      return 'bg-blue-50 border-blue-300';
    case 'cierre':
      return 'bg-emerald-50 border-emerald-300';
    case 'reagendar':
      return 'bg-purple-50 border-purple-300';
    default:
      return 'bg-slate-50 border-slate-300';
  }
};

export default function PipelineFlowDiagram({ stages }: PipelineFlowDiagramProps) {
  const sortedStages = [...stages].sort((a, b) => a.orden - b.orden);

  return (
    <div className="mt-8 pt-8 border-t-2 border-slate-200">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Flujo del Pipeline</h2>
        <p className="text-xs text-slate-500 mt-1">Visualización del proceso de cada etapa</p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-2 pb-4 min-w-full">
          {sortedStages.map((stage, idx) => {
            const nextStage = stages.find(s => s.id === stage.continuar_a_id);
            const backStage = stages.find(s => s.id === stage.regresar_a_id);

            return (
              <div key={stage.id} className="flex items-start gap-2">
                {/* Stage Card */}
                <div className={`w-48 px-4 py-3 rounded-lg border-2 ${getTypeColor(stage.tipo)} shadow-sm`}>
                  <div className="text-xs font-bold text-slate-900">{stage.titulo}</div>
                  <div className="text-[10px] text-slate-500 mt-1">({stage.clave})</div>
                  <div className="mt-2 text-[10px] space-y-1">
                    {nextStage && (
                      <div className="flex items-center gap-1 text-green-700 font-bold">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        ✓ {nextStage.titulo}
                      </div>
                    )}
                    {!nextStage && (
                      <div className="text-green-700 font-bold text-[10px]">
                        ✓ Terminal (Contrato)
                      </div>
                    )}
                    {backStage && (
                      <div className="flex items-center gap-1 text-yellow-700 font-bold">
                        <RotateCcw size={10} />
                        ↺ {backStage.titulo}
                      </div>
                    )}
                    {!backStage && stage.clave !== 'descartado' && (
                      <div className="text-yellow-700 font-bold text-[10px]">
                        ↺ Eliminar
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow to next stage */}
                {idx < sortedStages.length - 1 && (
                  <div className="flex items-center justify-center pt-3">
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600"><strong className="font-bold">Verde:</strong> Si éxito → continúa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-slate-600"><strong className="font-bold">Amarillo:</strong> Si falla → regresa</span>
        </div>
      </div>
    </div>
  );
}
