'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, AlertCircle, Loader2, Check, Upload, RefreshCw, X, Download } from 'lucide-react';
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
  nextStageClave?: string;
  nextStageTitle?: string;
  onSuccess?: (shouldClose?: boolean) => void;
  onCommentAdded?: () => void;
  onLeadUpdated?: () => void;
  onAllAcceptedChange?: (allAccepted: boolean) => void;
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
  nextStageClave,
  nextStageTitle,
  onSuccess,
  onCommentAdded,
  onLeadUpdated,
  onAllAcceptedChange,
}: TipoDocumentacionActionsProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, DocumentSubmission[]>>({});
  const [loading, setLoading] = useState(true);
  const [newDocName, setNewDocName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [isLoadingExito, setIsLoadingExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  };

  useEffect(() => {
    loadDocuments();
    loadSubmissions();
  }, [leadId]);

  // Notificar si todos los documentos están aceptados
  useEffect(() => {
    const allAccepted =
      documents.length > 0 &&
      documents.every(d => {
        const docSubmissions = submissions[d.id] || [];
        const latestSubmission = docSubmissions[0];
        return latestSubmission && latestSubmission.status === 'aceptado';
      });
    onAllAcceptedChange?.(allAccepted);
  }, [documents, submissions, onAllAcceptedChange]);

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
    const now = new Date();
    const timestamp = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let statusLabel = '';
    let noteType = '';

    if (action === 'uploaded') {
      statusLabel = 'Adjuntado';
      noteType = 'documento';
    } else if (action === 'accepted') {
      statusLabel = 'Aceptado';
      noteType = 'success';
    } else if (action === 'rejected') {
      statusLabel = 'Rechazado';
      noteType = 'retry';
    } else if (action === 'resent') {
      statusLabel = 'Reenviado';
      noteType = 'retry';
    }

    if (!statusLabel) return;

    const stageTitle = `Documentacion - ${statusLabel}`;
    const noteText = `${docName} - ${statusLabel}`;

    try {
      await supabase.from('lead_attempt_notes').insert({
        lead_id: leadId,
        stage_clave: stageClave,
        stage_titulo: stageTitle,
        attempt_number: 1,
        note_type: noteType,
        note_text: noteText,
      });
    } catch (err: any) {
      console.error('Error creating comment:', err);
    }
  };

  const handleDeleteClick = () => {
    if (!notes.trim() || notes.trim().length < 10) {
      alert('Requiere comentario (mínimo 10 caracteres)');
      return;
    }
    setShowDeleteConfirm(!showDeleteConfirm);
  };

  const handleExito = async () => {
    if (!notes.trim() || notes.trim().length < 10) {
      setError('Requiere comentario (mínimo 10 caracteres)');
      return;
    }

    if (!nextStageClave || !nextStageTitle) {
      setError('No hay etapa siguiente configurada');
      return;
    }

    setIsLoadingExito(true);
    setError(null);

    try {
      const timestamp = formatDateTime(new Date().toISOString().split('T')[0]);

      // 1. Guardar comentario automático PRIMERO
      const { error: autoNoteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${stageTitle} completada - Avanzar a ${nextStageTitle}\n\n${timestamp}`,
        });

      if (autoNoteError) throw autoNoteError;

      // 2. Guardar comentario del usuario DESPUÉS
      const { error: noteError } = await supabase
        .from('lead_attempt_notes')
        .insert({
          lead_id: leadId,
          stage_clave: stageClave,
          stage_titulo: stageTitle,
          attempt_number: 1,
          note_type: 'success',
          note_text: `${notes.trim()}\n\n${timestamp}`,
        });

      if (noteError) throw noteError;

      // 3. Actualizar lead al siguiente stage
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: nextStageClave,
          current_stage_attempts: 0,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 4. Registrar interacción
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: leadId,
          interaction_type: 'stage_advance',
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action_label: `Avance a ${nextStageTitle}`,
          message: `Lead avanzó de ${stageTitle} a ${nextStageTitle}: ${notes.trim()}`,
          metadata: {
            from_stage: stageClave,
            to_stage: nextStageClave,
          },
        });

      if (interactionError) throw interactionError;

      // 5. Refrescar comentarios y lead
      onCommentAdded?.();
      onLeadUpdated?.();

      onSuccess?.(false);
    } catch (err: any) {
      console.error('Error in handleExito:', err);
      const errorMsg = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoadingExito(false);
    }
  };

  const handleUploadFile = async (docId: string, file: File) => {
    if (!file) return;

    setUploadingDocId(docId);
    try {
      const doc = documents.find(d => d.id === docId);
      if (!doc) throw new Error('Documento no encontrado');

      // Obtener sesión
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) throw new Error('Usuario no autenticado');

      const docSubmissions = submissions[docId] || [];
      const existingSubmission = docSubmissions[0];

      // Si existe un archivo anterior, eliminarlo
      if (existingSubmission?.file_path) {
        try {
          await supabase.storage
            .from('lead_docs')
            .remove([existingSubmission.file_path]);
        } catch (deleteErr: any) {
          console.warn('No se pudo eliminar archivo anterior:', deleteErr?.message);
          // Continuar aunque falle la eliminación
        }
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${leadId}/${docId}/${timestamp}_${sanitizedName}`;

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('lead_docs')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Error subiendo archivo a Storage: ${uploadError.message}`);
      }

      // Obtener URL firmada (válida por 1 año)
      const { data, error: signError } = await supabase.storage
        .from('lead_docs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 año

      if (signError || !data?.signedUrl) {
        throw new Error(`No se pudo obtener URL del archivo: ${signError?.message || 'desconocido'}`);
      }

      const publicUrl = { publicUrl: data.signedUrl };

      if (existingSubmission) {
        // Reemplazar submission existente
        const { error: updateError } = await supabase
          .from('document_submissions')
          .update({
            file_url: publicUrl.publicUrl,
            file_path: filePath,
            status: 'pendiente',
            submitted_at: new Date().toISOString(),
            accepted_at: null,
            rejected_at: null,
            resent_at: null,
          })
          .eq('id', existingSubmission.id)
          .select();

        if (updateError) {
          throw new Error(`Error actualizando submission: ${updateError.message}`);
        }
      } else {
        // Crear nueva submission
        const { error: dbError } = await supabase
          .from('document_submissions')
          .insert({
            lead_id: leadId,
            document_id: docId,
            file_url: publicUrl.publicUrl,
            file_path: filePath,
            status: 'pendiente',
          })
          .select();

        if (dbError) {
          throw new Error(`Error creando submission: ${dbError.message}`);
        }
      }

      // Generar comentario y refrescar
      await generateComment('uploaded', doc.nombre);
      await loadSubmissions();
      onCommentAdded?.();
    } catch (err: any) {
      const errorMsg = err?.message || JSON.stringify(err) || 'Error desconocido';
      console.error('Error uploading file:', errorMsg);
      alert('Error subiendo archivo: ' + errorMsg);
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

      const { error: err, data } = await supabase
        .from('document_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select();

      if (err) {
        console.error('Supabase error details:', err);
        throw new Error(err.message || 'Error actualizando documento en base de datos');
      }

      const actionMap = { aceptado: 'accepted', rechazado: 'rejected', reenviado: 'resent' };
      await generateComment(actionMap[status], docName);

      await loadSubmissions();

      // Refrescar comentarios en tiempo real sin cerrar modal
      onCommentAdded?.();
    } catch (err: any) {
      console.error('Error updating submission:', err?.message || err);
      alert('Error actualizando documento: ' + (err?.message || 'Desconocido'));
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

  const allDeliveredAndAccepted =
    documents.length > 0 &&
    documents.every(d => {
      const docSubmissions = submissions[d.id] || [];
      const latestSubmission = docSubmissions[0];
      return latestSubmission && latestSubmission.status === 'aceptado';
    });

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
                    <span className="flex-1 text-xs font-medium text-slate-700">
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
                        Aceptado
                      </button>
                      <button
                        onClick={() => updateSubmissionStatus(latestSubmission.id, 'rechazado', doc.nombre)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                          latestSubmission.status === 'rechazado'
                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                        }`}
                      >
                        Rechazado
                      </button>
                      <button
                        onClick={() => updateSubmissionStatus(latestSubmission.id, 'reenviado', doc.nombre)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                          latestSubmission.status === 'reenviado'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                        }`}
                      >
                        Reenviar
                      </button>
                    </div>
                  )}

                  {/* Upload/Replace file */}
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                      <Upload size={12} className="text-blue-600" />
                      <span className="text-blue-600 font-medium">
                        {uploadingDocId === doc.id ? 'Subiendo...' : latestSubmission ? 'Reemplazar' : 'Adjuntar archivo'}
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

                    {/* Download button */}
                    {latestSubmission?.file_url && (
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = latestSubmission.file_url;
                          // Remover timestamp del nombre: "1234567_nombre.pdf" → "nombre.pdf"
                          const filename = latestSubmission.file_path?.split('/').pop() || 'archivo';
                          const cleanFilename = filename.replace(/^\d+_/, '');
                          link.download = cleanFilename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors text-green-600 font-medium"
                      >
                        <Download size={12} />
                        <span>Descargar</span>
                      </button>
                    )}
                  </div>

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
