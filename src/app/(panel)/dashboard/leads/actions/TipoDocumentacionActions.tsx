'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import DeleteAction from './DeleteAction';

interface LeadDocument {
  id: string;
  nombre: string;
  entregado: boolean;
  aceptado_estado: 'pendiente' | 'aceptado' | 'rechazado';
}

interface TipoDocumentacionActionsProps {
  leadId: string;
  notes: string;
  stageTitle?: string;
  stageNumber?: string;
  stageClave?: string;
  onSuccess?: (shouldClose?: boolean) => void;
}

const DOCUMENTOS_PREDEFINIDOS = [
  'Cotización',
  'Contrato',
  'Propuesta',
  'Manuales',
  'Acuerdo Comercial',
  'Términos y Condiciones',
];

export default function TipoDocumentacionActions({
  leadId,
  notes,
  stageTitle = 'Documentación',
  stageNumber = '5',
  stageClave = '201',
  onSuccess,
}: TipoDocumentacionActionsProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDocName, setNewDocName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar documentos
  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err?.message || 'Error cargando documentos');
    } finally {
      setLoading(false);
    }
  };

  // Agregar documento predefinido
  const handleAddPredefinedDoc = async (docName: string) => {
    if (documents.some(d => d.nombre.toLowerCase() === docName.toLowerCase())) {
      alert(`${docName} ya existe en la lista`);
      return;
    }

    setIsAddingDoc(true);
    try {
      const { data, error: err } = await supabase
        .from('lead_documents')
        .insert({
          lead_id: leadId,
          nombre: docName,
          entregado: false,
          aceptado_estado: 'pendiente',
        })
        .select()
        .single();

      if (err) throw err;
      setDocuments([...documents, data]);
    } catch (err: any) {
      console.error('Error adding document:', err);
      alert('Error agregando documento');
    } finally {
      setIsAddingDoc(false);
    }
  };

  // Agregar documento nuevo personalizado
  const handleAddCustomDoc = async () => {
    if (!newDocName.trim()) {
      alert('Ingresa el nombre del documento');
      return;
    }

    await handleAddPredefinedDoc(newDocName.trim());
    setNewDocName('');
  };

  // Actualizar documento
  const handleUpdateDoc = async (docId: string, updates: Partial<LeadDocument>) => {
    try {
      const { error: err } = await supabase
        .from('lead_documents')
        .update(updates)
        .eq('id', docId);

      if (err) throw err;
      setDocuments(documents.map(d => d.id === docId ? { ...d, ...updates } : d));
    } catch (err: any) {
      console.error('Error updating document:', err);
      alert('Error actualizando documento');
    }
  };

  // Verificar si todos los documentos están entregados y aceptados
  const allDeliveredAndAccepted =
    documents.length > 0 &&
    documents.every(d => d.entregado && d.aceptado_estado === 'aceptado');

  const hasNotes = notes.trim().length >= 10;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 size={20} className="animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-600">Cargando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Lista de documentos */}
      <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="text-xs font-bold uppercase text-slate-700 mb-3">Documentos Requeridos</h3>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No hay documentos. Agrega uno abajo.</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                <input
                  type="checkbox"
                  checked={doc.entregado}
                  onChange={(e) => handleUpdateDoc(doc.id, { entregado: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className={`flex-1 text-xs font-medium ${doc.entregado ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {doc.nombre}
                </span>

                {/* Estado de aceptación */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleUpdateDoc(doc.id, { aceptado_estado: 'aceptado' })}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                      doc.aceptado_estado === 'aceptado'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-green-50'
                    }`}
                  >
                    ✓ Aceptado
                  </button>
                  <button
                    onClick={() => handleUpdateDoc(doc.id, { aceptado_estado: 'rechazado' })}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                      doc.aceptado_estado === 'rechazado'
                        ? 'bg-rose-100 text-rose-700 border border-rose-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                    }`}
                  >
                    ✗ Rechazado
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agregar documento */}
      <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-xs font-bold uppercase text-blue-700 mb-2">Agregar Documento</h3>

        {/* Predefinidos */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {DOCUMENTOS_PREDEFINIDOS.filter(
            doc => !documents.some(d => d.nombre.toLowerCase() === doc.toLowerCase())
          ).map(doc => (
            <button
              key={doc}
              onClick={() => handleAddPredefinedDoc(doc)}
              disabled={isAddingDoc}
              className="px-2 py-1.5 text-xs bg-white text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 font-medium transition-colors"
            >
              + {doc}
            </button>
          ))}
        </div>

        {/* Personalizado */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            placeholder="Nombre del documento..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomDoc()}
            className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={handleAddCustomDoc}
            disabled={isAddingDoc || !newDocName.trim()}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-1"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      </div>

      {(!notes.trim() || notes.trim().length < 10) && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">Para continuar, deja tus comentarios de actividad en la sección siguiente.</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 w-full">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={!hasNotes}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            !hasNotes
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={!hasNotes ? 'Requiere comentario (mínimo 10 caracteres)' : ''}
        >
          <Trash2 size={18} />
          <span>Eliminar</span>
        </button>

        <button
          disabled={!allDeliveredAndAccepted || !hasNotes}
          className={`flex-1 px-2 py-3 text-sm font-bold rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
            !allDeliveredAndAccepted || !hasNotes
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
          title={
            !allDeliveredAndAccepted
              ? 'Todos los documentos deben estar entregados y aceptados'
              : !hasNotes
              ? 'Requiere comentario (mínimo 10 caracteres)'
              : ''
          }
        >
          <Check size={18} />
          <span>Éxito</span>
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteAction
          leadId={leadId}
          stageTitle={stageTitle}
          stageNumber={stageNumber}
          stageClave={stageClave}
          notes={notes}
          currentAttempts={0}
          minAttempts={0}
          maxAttempts={0}
          onSuccess={() => {
            setShowDeleteConfirm(false);
            onSuccess?.(true);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
