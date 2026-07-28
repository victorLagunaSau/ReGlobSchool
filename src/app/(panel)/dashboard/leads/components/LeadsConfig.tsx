'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import ModalPipelineStage, { PipelineStageFormData } from './ModalPipelineStage';
import PipelineFlowDiagram from './PipelineFlowDiagram';

export interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  descripcion: string | null;
  objetivo: string | null;
  orden: number;
  limite_pospuestas: number;
  intentos_requeridos: number;
  tipo?: string;
  tasa_exito?: number;
  siguiente_etapa_id?: string | null;
  continuar_a_id?: string | null;
  regresar_a_id?: string | null;
}

interface LeadsConfigProps {
  stages: PipelineStage[];
  onRefresh: () => void;
}

type SortColumn = keyof PipelineStage | null;
type SortDirection = 'asc' | 'desc';

export default function LeadsConfig({ stages, onRefresh }: LeadsConfigProps) {
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('orden');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const editingStage = useMemo(() => {
    const stage = stages.find(s => s.id === editingStageId);
    if (!stage) return undefined;
    return {
      id: stage.id,
      clave: stage.clave,
      titulo: stage.titulo,
      descripcion: stage.descripcion || '',
      objetivo: stage.objetivo || '',
      orden: stage.orden,
      limite_pospuestas: stage.limite_pospuestas,
      intentos_requeridos: stage.intentos_requeridos,
      tipo: stage.tipo || 'contacto',
      tasa_exito: stage.tasa_exito || 0,
      siguiente_etapa_id: stage.siguiente_etapa_id || null,
      continuar_a_id: stage.continuar_a_id || null,
      regresar_a_id: stage.regresar_a_id || null,
    };
  }, [stages, editingStageId]);

  const sortedStages = useMemo(() => {
    if (!sortColumn) return stages;

    return [...stages].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [stages, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSaveStage = async (data: PipelineStageFormData) => {
    setIsLoading(true);
    try {
      if (editingStageId) {
        const { error } = await supabase
          .from('pipeline_stages')
          .update(data)
          .eq('id', editingStageId);

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(error.message || 'Error al guardar');
        }
      } else {
        const { error } = await supabase
          .from('pipeline_stages')
          .insert([data]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingStageId(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error saving stage:', error);
      alert(`Error al guardar la etapa: ${error.message || 'Desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStage = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Error desconocido al eliminar');
      }
      setDeleteConfirmId(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      alert(`Error al eliminar la etapa: ${error.message || 'Desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewStage = () => {
    setEditingStageId(null);
    setIsModalOpen(true);
  };

  const handleEditStage = (id: string) => {
    setEditingStageId(id);
    setIsModalOpen(true);
  };

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors group"
    >
      <span>{label}</span>
      {sortColumn === column && (
        <>
          {sortDirection === 'asc' ? (
            <ChevronUp size={14} className="text-blue-500" />
          ) : (
            <ChevronDown size={14} className="text-blue-500" />
          )}
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Etapas del Pipeline</h2>
            <p className="text-sm text-slate-600 mt-2">
              {stages.length} etapa{stages.length !== 1 ? 's' : ''} configurada{stages.length !== 1 ? 's' : ''} • Gestiona los flujos de prospección
            </p>
          </div>
          <button
            onClick={handleNewStage}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={16} />
            Nueva Etapa
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900">Configuración de Etapas</h3>
          <p className="text-xs text-slate-600 mt-1">Vista tabular de todas las etapas y sus parámetros</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left font-bold text-slate-700">
                  <SortHeader column="orden" label="Orden" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">
                  <SortHeader column="clave" label="Clave" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">
                  <SortHeader column="titulo" label="Título" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">
                  Descripción
                </th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">
                  Límite Pospuestas
                </th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">
                  Intentos Máx.
                </th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">
                  Tipo
                </th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">
                  Tasa Éxito
                </th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStages.map((stage, idx) => (
                <tr
                  key={stage.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                >
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    {stage.orden}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-mono text-xs font-bold">
                      {stage.clave}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {stage.titulo}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs">
                    <span title={stage.descripcion || ''} className="line-clamp-1">
                      {stage.descripcion || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                      stage.limite_pospuestas === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {stage.limite_pospuestas}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-900">
                    {stage.intentos_requeridos}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                      stage.tipo === 'inicial' ? 'bg-slate-100 text-slate-700' :
                      stage.tipo === 'contacto' ? 'bg-amber-100 text-amber-700' :
                      stage.tipo === 'reunion' ? 'bg-blue-100 text-blue-700' :
                      stage.tipo === 'cierre' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {stage.tipo || 'contacto'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700">
                      {stage.tasa_exito || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => handleEditStage(stage.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(stage.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar etapa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flow Diagram Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-6">
          <h3 className="font-bold text-slate-900 text-lg">Flujo del Pipeline</h3>
          <p className="text-sm text-slate-600 mt-1">Visualización de los caminos de éxito y fracaso en cada etapa</p>
        </div>
        <PipelineFlowDiagram stages={stages} />
      </div>

      <ModalPipelineStage
        isOpen={isModalOpen}
        isLoading={isLoading}
        stage={editingStage}
        existingClaves={stages.map(s => s.clave)}
        allStages={stages.map(s => ({ id: s.id, titulo: s.titulo, clave: s.clave }))}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStageId(null);
        }}
        onConfirm={handleSaveStage}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="font-bold text-slate-900 mb-2">Confirmar Eliminación</h3>
            <p className="text-xs text-slate-600 mb-4">
              ¿Estás seguro de que quieres eliminar la etapa "{stages.find(s => s.id === deleteConfirmId)?.titulo}"?
              <br />
              <span className="text-red-600 font-bold">Esta acción no se puede deshacer.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteStage(deleteConfirmId)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
