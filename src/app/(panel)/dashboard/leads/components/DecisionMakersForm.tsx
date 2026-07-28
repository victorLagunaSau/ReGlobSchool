'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase/client';

interface DecisionMaker {
  id?: string;
  nombre: string;
  cargo?: string;
  telefono?: string;
  email?: string;
}

interface DecisionMakersFormProps {
  leadId: string;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export default function DecisionMakersForm({
  leadId,
  readOnly = false,
  onUpdate,
}: DecisionMakersFormProps) {
  const [decisionMakers, setDecisionMakers] = useState<DecisionMaker[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDM, setNewDM] = useState<DecisionMaker>({
    nombre: '',
    cargo: '',
    telefono: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch decision makers
  useEffect(() => {
    const fetchDecisionMakers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lead_decision_makers')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDecisionMakers(data || []);
      } catch (err) {
        console.error('Error fetching decision makers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) fetchDecisionMakers();
  }, [leadId]);

  const handleAddDecisionMaker = async () => {
    if (!newDM.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('lead_decision_makers')
        .insert({
          lead_id: leadId,
          nombre: newDM.nombre.trim(),
          cargo: newDM.cargo?.trim() || null,
          telefono: newDM.telefono?.trim() || null,
          email: newDM.email?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setDecisionMakers([data, ...decisionMakers]);
      setNewDM({ nombre: '', cargo: '', telefono: '', email: '' });
      setIsAddingNew(false);
      onUpdate?.();
    } catch (err) {
      console.error('Error adding decision maker:', err);
      alert('Error al agregar tomador de decisiones');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDecisionMaker = async (id: string) => {
    if (!confirm('¿Eliminar este tomador de decisiones?')) return;

    try {
      const { error } = await supabase
        .from('lead_decision_makers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDecisionMakers(decisionMakers.filter((dm) => dm.id !== id));
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting decision maker:', err);
      alert('Error al eliminar');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase">Tomadores de Decisiones</h4>
        {!readOnly && (
          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <Plus size={14} /> Agregar
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAddingNew && !readOnly && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
          <input
            type="text"
            placeholder="Nombre *"
            value={newDM.nombre}
            onChange={(e) => setNewDM({ ...newDM, nombre: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <input
            type="text"
            placeholder="Cargo"
            value={newDM.cargo}
            onChange={(e) => setNewDM({ ...newDM, cargo: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <input
            type="tel"
            placeholder="Teléfono"
            value={newDM.telefono}
            onChange={(e) => setNewDM({ ...newDM, telefono: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <input
            type="email"
            placeholder="Email"
            value={newDM.email}
            onChange={(e) => setNewDM({ ...newDM, email: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddDecisionMaker}
              disabled={isSaving}
              className="flex-1 px-2 py-1.5 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isSaving && <Loader2 size={12} className="animate-spin" />}
              Guardar
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              disabled={isSaving}
              className="flex-1 px-2 py-1.5 border border-slate-200 text-xs font-bold rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-500">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span className="text-xs">Cargando...</span>
        </div>
      ) : decisionMakers.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Sin tomadores de decisiones registrados</p>
      ) : (
        <div className="space-y-2">
          {decisionMakers.map((dm) => (
            <div key={dm.id} className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{dm.nombre}</p>
                  {dm.cargo && <p className="text-[10px] text-slate-600">{dm.cargo}</p>}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => dm.id && handleDeleteDecisionMaker(dm.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {dm.telefono && (
                  <p className="text-[10px] text-slate-600">📱 {dm.telefono}</p>
                )}
                {dm.email && (
                  <p className="text-[10px] text-slate-600">✉️ {dm.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
