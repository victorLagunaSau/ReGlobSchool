'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, LogIn } from 'lucide-react';
import { supabase } from '@/src/lib/supabase/client';

interface CalendlyConfigFormProps {
  userId: string;
  existingConfig?: {
    account_email: string;
    config: {
      oauth?: boolean;
      calendly_url?: string;
    };
    tokens: {
      access_token?: string;
    };
    is_active?: boolean;
  } | null;
  onSaved?: () => void;
}

export default function CalendlyConfigForm({
  userId,
  existingConfig,
  onSaved,
}: CalendlyConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isOAuthConnected, setIsOAuthConnected] = useState(
    existingConfig?.config?.oauth === true && existingConfig?.is_active
  );
  const [calendlyUrl, setCalendlyUrl] = useState(
    existingConfig?.config?.calendly_url || ''
  );
  const [editingUrl, setEditingUrl] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);

  // Verificar si hay una URL de callback exitosa
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendly_success') === 'true') {
      // Guardar el token de la cookie en user_integrations
      const saveTokenToDb = async () => {
        try {
          const response = await fetch('/api/auth/calendly/save-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            setSuccess(true);
            setIsOAuthConnected(true);
            onSaved?.();

            // Limpiar URL
            window.history.replaceState({}, '', '/dashboard/settings');

            // Limpiar mensaje después de 3 segundos
            setTimeout(() => setSuccess(false), 3000);
          } else {
            const errData = await response.json();
            console.error('Save token error:', errData);
            setError(errData.error || 'Error guardando token');
          }
        } catch (err) {
          console.error('Error saving token:', err);
          setError('Error al guardar token');
        }
      };

      saveTokenToDb();
    } else if (params.get('calendly_error')) {
      const errorMsg = params.get('calendly_error');
      setError(`Error de OAuth: ${errorMsg}`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [onSaved]);

  const handleOAuthConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Redirigir a la ruta de autorización OAuth
      window.location.href = '/api/auth/calendly/authorize';
    } catch (err) {
      console.error('Error starting OAuth:', err);
      setError('Error iniciando OAuth');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar Calendly?')) return;

    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('user_integrations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'calendly');

      if (err) throw err;

      setIsOAuthConnected(false);
      setSuccess(false);
      onSaved?.();
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError(err instanceof Error ? err.message : 'Error desconectando');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalendlyUrl = async () => {
    if (!calendlyUrl.trim()) {
      setError('La URL de Calendly no puede estar vacía');
      return;
    }

    setSavingUrl(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('user_integrations')
        .update({
          config: {
            ...existingConfig?.config,
            calendly_url: calendlyUrl.trim(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'calendly');

      if (err) throw err;

      setSuccess(true);
      setEditingUrl(false);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving URL:', err);
      setError(err instanceof Error ? err.message : 'Error guardando URL');
    } finally {
      setSavingUrl(false);
    }
  };

  if (isOAuthConnected && existingConfig?.is_active) {
    return (
      <div className="space-y-4">
        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">¡Guardado correctamente!</p>
          </div>
        )}

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-xs font-bold text-blue-900">
            ✓ Conectado a Calendly
          </p>
          <p className="text-xs text-blue-700">
            Email: <span className="font-mono">{existingConfig?.account_email}</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            URL DE TU CALENDARIO CALENDLY
          </label>
          {!editingUrl ? (
            <div className="flex gap-2 items-center">
              <div className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono break-all">
                {calendlyUrl || '(no configurada)'}
              </div>
              <button
                onClick={() => setEditingUrl(true)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Editar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/username/meeting-name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white"
              />
              <p className="text-[10px] text-slate-500">
                Ej: https://calendly.com/pathbooks/victorlagunapathbooks
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCalendlyUrl}
                  disabled={savingUrl}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {savingUrl ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    'Guardar'
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingUrl(false);
                    setCalendlyUrl(existingConfig?.config?.calendly_url || '');
                  }}
                  className="flex-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Desconectando...
            </span>
          ) : (
            'Desconectar de Calendly'
          )}
        </button>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-[10px] text-slate-600">
            ℹ️ Tu token de acceso está encriptado y seguro. Se usa solo para agendar reuniones en Calendly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-bold text-amber-900">Conectar con OAuth</p>
        <p className="text-xs text-amber-800">
          Haz clic abajo para autorizar a ReGlobSchool a acceder a tu calendario de Calendly de forma segura.
        </p>
      </div>

      <button
        onClick={handleOAuthConnect}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <LogIn size={14} />
            Conectar con Calendly
          </>
        )}
      </button>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-[10px] text-blue-700">
          ℹ️ Serás redirigido a Calendly para autorizarte. Tu token de acceso se guardará encriptado.
        </p>
      </div>
    </div>
  );
}
