'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { Loader2, X, Mail } from 'lucide-react';

const TEMPLATES = [
  {
    label: 'Presentación Pathbooks',
    subject: 'Invitación — Conoce Pathbooks para tu negocio',
    body: 'Hola,\n\nMe gustaría invitarte a una breve llamada para presentarte Pathbooks y explorar cómo podríamos colaborar.\n\n¿Tienes disponibilidad esta semana?\n\nSaludos.',
  },
  {
    label: 'Seguimiento sin respuesta',
    subject: 'Seguimiento — ¿Seguimos en contacto?',
    body: 'Hola,\n\nTe escribo de nuevo para saber si tuviste oportunidad de revisar mi mensaje anterior. Quedo atento a tus comentarios.\n\nSaludos.',
  },
];

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadEmail: string | null;
  leadName: string;
  onSent: () => void;
}

export default function EmailComposer({ isOpen, onClose, leadId, leadEmail, leadName, onSent }: EmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const applyTemplate = (index: number) => {
    setSubject(TEMPLATES[index].subject);
    setBody(TEMPLATES[index].body);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      return alert('Asunto y cuerpo del correo son obligatorios.');
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('lead_tasks').insert({
        lead_id: leadId,
        task_type: 'email',
        description: subject.trim(),
        status: 'completado',
        completed_at: new Date().toISOString(),
        outcome: body.trim(),
      });
      if (error) throw error;

      if (leadEmail) {
        const mailto = `mailto:${encodeURIComponent(leadEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
      }

      setSubject('');
      setBody('');
      onSent();
      onClose();
    } catch (error) {
      console.error('Error al registrar el email:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400" />
            <div>
              <h2 className="text-base font-black text-slate-950 tracking-tight">Enviar Correo</h2>
              <p className="text-[11px] text-slate-400">
                Para: {leadName} {leadEmail ? `(${leadEmail})` : '— sin correo registrado'}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {!leadEmail && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
            Este lead no tiene correo registrado. Se guardará como tarea completada, pero no se abrirá tu cliente de correo.
          </div>
        )}

        <div className="flex gap-2 mb-3">
          {TEMPLATES.map((t, i) => (
            <button key={t.label} type="button" onClick={() => applyTemplate(i)} className="px-2.5 py-1 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Asunto</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Mensaje</label>
            <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-blue-600 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Enviar y Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
