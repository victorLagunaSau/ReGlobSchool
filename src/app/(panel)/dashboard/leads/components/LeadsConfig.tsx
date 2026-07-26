'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import ModalPipelineStage, { PipelineStageFormData } from './ModalPipelineStage';

export interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  descripcion: string | null;
  objetivo: string | null;
  orden: number;
  limite_pospuestas: number;
  intentos_requeridos: number;
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

  const editingStage = useMemo(
    () => stages.find(s => s.id === editingStageId),
    [stages, editingStageId]
  );

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

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pipeline_stages')
          .insert([data]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingStageId(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving stage:', error);
      alert('Error al guardar la etapa');
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

      if (error) throw error;
      setDeleteConfirmId(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting stage:', error);
      alert('Error al eliminar la etapa');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Etapas del Pipeline</h2>
          <p className="text-xs text-slate-500 mt-1">
            {stages.length} etapa{stages.length !== 1 ? 's' : ''} configurada{stages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleNewStage}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all"
        >
          <Plus size={14} />
          Nueva Etapa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-bold text-slate-700">
                <SortHeader column="orden" label="Orden" />
              </th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">
                <SortHeader column="clave" label="Clave" />
              </th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">
                <SortHeader column="titulo" label="Título" />
              </th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">
                Descripción
              </th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">
                Límite Pospuestas
              </th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">
                Intentos Req.
              </th>
              <th className="px-4 py-3 text-center font-bold text-slate-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStages.map(stage => (
              <tr
                key={stage.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  {stage.orden}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono text-xs font-bold">
                    {stage.clave}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {stage.titulo}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {stage.descripcion || '—'}
                </td>
                <td className="px-4 py-3 text-center font-bold">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                    stage.limite_pospuestas === 0
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {stage.limite_pospuestas}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-bold">
                  {stage.intentos_requeridos}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEditStage(stage.id)}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-all text-xs font-bold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(stage.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalPipelineStage
        isOpen={isModalOpen}
        isLoading={isLoading}
        stage={editingStage}
        existingClaves={stages.map(s => s.clave)}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStageId(null);
        }}
        onConfirm={handleSaveStage}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 p-4">
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
