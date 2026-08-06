'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, AlertCircle, Loader2, Check, Upload, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';
import DeleteAction from './DeleteAction';

interface LeadDocument {
  id: string;
  nombre: string;
  entregado: boolean;
  aceptado_estado: 'pendiente' | 'aceptado' | 'rechazado';
}

interface DocumentSubmission {
  id: string;
  document_id: string;
  status: 'pendiente' | 'aceptado' | 'rechazado' | 'reenviado';
  file_url: string;
  file_path: string;
  submitted_at: string;
  accepted_at?: string;
  rejected_at?: string;
  resent_at?: string;
}

interface TipoDocumentacionActionsProps {
  leadId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
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
  onNotesChange,
  stageTitle = 'Documentación',
  stageNumber = '5',
  stageClave = '201',
  onSuccess,
}: TipoDocumentacionActionsProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, DocumentSubmission[]>>({});
  const [loading, setLoading] = useState(true);
  const [newDocName, setNewDocName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    loadSubmissions();
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

  const loadSubmissions = async () => {
    try {
      const { data, error: err } = await supabase
        .from('document_submissions')
        .select('*')
        .eq('lead_id', leadId)
        .order('submitted_at', { ascending: false });

      if (err) throw err;

      const submissionsByDoc: Record<string, DocumentSubmission[]> = {};
      (data || []).forEach((sub: DocumentSubmission) => {
        if (!submissionsByDoc[sub.document_id]) {
          submissionsByDoc[sub.document_id] = [];
        }
        submissionsByDoc[sub.document_id].push(sub);
      });
      setSubmissions(submissionsByDoc);
    } catch (err: any) {
      console.error('Error loading submissions:', err);
    }
  };

  const generateComment = async (action: string, docName: string) => {
    const timestamp = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let commentText = '';
    if (action === 'uploaded') {
      commentText = `📄 Documento adjuntado: "${docName}" (${timestamp})`;
    } else if (action === 'accepted') {
      commentText = `✅ Documento aceptado: "${docName}" (${timestamp})`;
    } else if (action === 'rejected') {
      commentText = `❌ Documento rechazado: "${docName}" (${timestamp})`;
    } else if (action === 'resent') {
      commentText = `🔄 Documento reenviado: "${docName}" (${timestamp})`;
    }

    if (!commentText) return;

    try {
      await supabase.from('lead_attempt_notes').insert({
        lead_id: leadId,
        stage_clave: stageClave,
        stage_titulo: stageTitle,
        attempt_number: 1,
        note_type: 'documento',
        note_text: commentText,
      });
    } catch (err: any) {
      console.error('Error creating comment:', err);
    }
  };

  const handleUploadFile = async (docId: string, file: File) => {
    if (!file) return;

    setUploadingDocId(docId);
    try {
      const doc = documents.find(d => d.id === docId);
      if (!doc) throw new Error('Documento no encontrado');

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${leadId}/${docId}/${timestamp}_${sanitizedName}`;

      // Subir a Storage
      const { error: uploadError, data } = await supabase.storage
        .from('lead_docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: publicUrl } = supabase.storage
        .from('lead_docs')
        .getPublicUrl(filePath);

      // Guardar en document_submissions
      const { error: dbError } = await supabase
        .from('document_submissions')
        .insert({
          lead_id: leadId,
          document_id: docId,
          file_url: publicUrl.publicUrl,
          file_path: filePath,
          status: 'pendiente',
          submitted_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      // Generar comentario
      await generateComment('uploaded', doc.nombre);

      // Recargar
      await loadSubmissions();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert('Error subiendo archivo: ' + (err?.message || 'Desconocido'));
    } finally {
      setUploadingDocId(null);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: 'aceptado' | 'rechazado' | 'reenviado', docName: string) => {
    try {
      const updateData: any = { status };

      if (status === 'aceptado') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'rechazado') {
        updateData.rejected_at = new Date().toISOString();
      } else if (status === 'reenviado') {
        updateData.resent_at = new Date().toISOString();
      }

      const { error: err } = await supabase
        .from('document_submissions')
        .update(updateData)
        .eq('id', submissionId);

      if (err) throw err;

      const actionMap = { aceptado: 'accepted', rechazado: 'rejected', reenviado: 'resent' };
      await generateComment(actionMap[status], docName);

      await loadSubmissions();
    } catch (err: any) {
      console.error('Error updating submission:', err);
      alert('Error actualizando documento');
    }
  };

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

  const handleAddCustomDoc = async () => {
    if (!newDocName.trim()) {
      alert('Ingresa el nombre del documento');
      return;
    }

    await handleAddPredefinedDoc(newDocName.trim());
    setNewDocName('');
  };

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
          <div className="space-y-3">
            {documents.map(doc => {
              const docSubmissions = submissions[doc.id] || [];
              const latestSubmission = docSubmissions[0];

              return (
                <div key={doc.id} className="p-3 bg-white rounded border border-slate-200 space-y-2">
                  {/* Header del documento */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={doc.entregado}
                      onChange={(e) => handleUpdateDoc(doc.id, { entregado: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className={`flex-1 text-xs font-medium ${doc.entregado ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {doc.nombre}
                    </span>
                  </div>

                  {/* Estado de aceptación */}
                  {latestSubmission && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateSubmissionStatus(latestSubmission.id, 'aceptado', doc.nombre)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                          latestSubmission.status === 'aceptado'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-green-50'
                        }`}
                      >
                        ✓ Aceptado
                      </button>
                      <button
                        onClick={() => updateSubmissionStatus(latestSubmission.id, 'rechazado', doc.nombre)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                          latestSubmission.status === 'rechazado'
                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                        }`}
                      >
                        ✗ Rechazado
                      </button>
                      <button
                        onClick={() => updateSubmissionStatus(latestSubmission.id, 'reenviado', doc.nombre)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                          latestSubmission.status === 'reenviado'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                        }`}
                      >
                        🔄 Reenviar
                      </button>
                    </div>
                  )}

                  {/* Upload file */}
                  <label className="flex items-center gap-2 px-2 py-1.5 text-xs bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                    <Upload size={12} className="text-blue-600" />
                    <span className="text-blue-600 font-medium">
                      {uploadingDocId === doc.id ? 'Subiendo...' : 'Adjuntar archivo'}
                    </span>
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUploadFile(doc.id, e.target.files[0]);
                        }
                      }}
                      disabled={uploadingDocId === doc.id}
                    />
                  </label>

                  {/* Historial de submissions */}
                  {docSubmissions.length > 0 && (
                    <div className="text-[10px] text-slate-500 space-y-1 pl-2 border-l border-slate-300">
                      {docSubmissions.map((sub, idx) => (
                        <div key={sub.id} className="flex justify-between">
                          <span>
                            Envío {docSubmissions.length - idx}: <strong>{sub.status}</strong>
                          </span>
                          <span>{new Date(sub.submitted_at).toLocaleDateString('es-ES')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Comentarios de Actividad */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Comentarios de Actividad
          <span className="text-rose-600 ml-1">*</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Describe la actividad realizada... (mínimo 10 caracteres)"
          maxLength={500}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-xs resize-none focus:outline-slate-400 transition-colors ${
            notes.length > 0 && notes.length < 10
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-300'
          }`}
        />
        <div className="flex items-center justify-between">
          <p
            className={`text-[10px] ${
              notes.length < 10 && notes.length > 0
                ? 'text-rose-600 font-semibold'
                : 'text-slate-600'
            }`}
          >
            {notes.length}/500
            {notes.length < 10 && notes.length > 0 && (
              <span className="ml-1">({10 - notes.length} caracteres mínimos)</span>
            )}
          </p>
          {notes.length > 0 && notes.length < 10 && (
            <span className="text-[9px] text-rose-600 font-semibold">⚠ Mínimo 10 caracteres</span>
          )}
        </div>
      </div>

      {(!notes.trim() || notes.trim().length < 10) && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">Para continuar, deja tus comentarios de actividad en la sección siguiente.</p>
        </div>
      )}

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
