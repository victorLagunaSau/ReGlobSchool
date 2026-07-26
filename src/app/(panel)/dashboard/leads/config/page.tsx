'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';
import LeadsConfig, { PipelineStage } from '../components/LeadsConfig';

export default function LeadsConfigPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('orden', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching stages:', error);
      alert('Error al cargar las etapas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/leads"
          className="p-2 hover:bg-slate-100 rounded-lg transition-all"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Configuración de Leads
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestiona las etapas del pipeline de prospección
          </p>
        </div>
      </div>

      <LeadsConfig stages={stages} onRefresh={fetchStages} />
    </div>
  );
}
