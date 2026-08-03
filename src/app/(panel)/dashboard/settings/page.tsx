'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Calendar } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase/client';
import CalendlyConfigForm from './CalendlyConfigForm';

interface Integration {
  id: string;
  provider: string;
  account_email: string;
  is_active: boolean;
  config: any;
}

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      setUserId(userData.user.id);

      const { data, error: err } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userData.user.id);

      if (err) throw err;
      setIntegrations(data || []);
    } catch (err) {
      console.error('Error loading integrations:', err);
      setError('Error cargando integraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard/leads" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div className="flex items-center gap-2">
            <Settings size={24} className="text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Integraciones Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Integraciones de Calendario</h2>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Calendly Config */}
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Calendly</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {integrations.find((i) => i.provider === 'calendly')?.account_email ||
                        'No configurado'}
                    </p>
                  </div>
                  {integrations.find((i) => i.provider === 'calendly')?.is_active && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      Conectado
                    </span>
                  )}
                </div>

                {/* Formulario */}
                <CalendlyConfigForm
                  userId={userId!}
                  existingConfig={integrations.find((i) => i.provider === 'calendly') || null}
                  onSaved={() => {
                    // Recargar integraciones
                    loadData();
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-3">Sobre estas configuraciones</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>✓ Las integraciones permiten automatizar la creación de eventos en tus calendarios</li>
            <li>✓ Solo tú puedes ver y modificar tus integraciones</li>
            <li>✓ Los datos sensibles (tokens) están encriptados en la base de datos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
