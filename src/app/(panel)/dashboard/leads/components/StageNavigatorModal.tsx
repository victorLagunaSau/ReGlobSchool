'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import StageModal from './StageModal';

interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  tipo?: string;
  orden?: number;
  siguiente_etapa_id?: string | null;
  limite_pospuestas?: number;
  intentos_requeridos?: number;
}

interface StageNavigatorModalProps {
  isOpen: boolean;
  leadId: string;
  lead: any;
  stages: PipelineStage[];
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * StageNavigatorModal
 * Detecta la etapa actual del lead y abre StageModal universal
 * StageModal cargará dinámicamente las herramientas y accionables
 *
 * Refresca el lead cada 2 segundos para detectar cambios de etapa en tiempo real
 */
export default function StageNavigatorModal({
  isOpen,
  leadId,
  lead,
  stages,
  onClose,
  onRefresh,
}: StageNavigatorModalProps) {
  const [currentStageClave, setCurrentStageClave] = useState<string | null>(null);
  const [initialStageSet, setInitialStageSet] = useState(false);
  const [currentLead, setCurrentLead] = useState(lead);

  // Inicializar stage cuando se abre el modal
  useEffect(() => {
    if (isOpen && !initialStageSet && lead?.status) {
      setCurrentStageClave(lead.status);
      setCurrentLead(lead);
      setInitialStageSet(true);
    }
  }, [isOpen]);

  // Refrescar el lead cada 2 segundos mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const refreshLead = async () => {
      try {
        const { data } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (data) {
          setCurrentLead(data);
          // SIEMPRE actualizar el stage basado en el status actual del lead
          // Esto detecta cambios en tiempo real cuando avanza
          setCurrentStageClave(data.status);
        }
      } catch (err) {
        console.error('Error refreshing lead:', err);
      }
    };

    const interval = setInterval(refreshLead, 500);
    return () => clearInterval(interval);
  }, [isOpen, leadId]);

  // Limpiar cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setCurrentStageClave(null);
      setInitialStageSet(false);
      setCurrentLead(lead);
    }
  }, [isOpen]);

  const currentStage = stages.find(s => s.clave === currentStageClave);

  if (!isOpen || !currentStage) return null;

  return (
    <StageModal
      isOpen={isOpen}
      leadId={leadId}
      lead={currentLead}
      stage={currentStage}
      onClose={onClose}
      onSuccess={onRefresh}
    />
  );
}
