'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import logoImg from '../../../../public/assets/logos/logo.png';
import Toast from '../../../components/ui/Toast';

type Status = 'validating' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('validating');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastConfig, setToastConfig] = useState<{
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', variant: 'info' });

  const triggerToast = (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info') => {
    setToastConfig({ title, message, variant });
    setToastOpen(true);
  };

  useEffect(() => {
    // Al dar clic en el link del correo, Supabase abre una sesión temporal de
    // recuperación y dispara este evento con el token ya validado.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready');
      }
    });

    // Si la página se recarga después del evento, la sesión de recuperación ya existe.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready');
    });

    // Enlace inválido, expirado, o entraste a esta página sin pasar por el correo.
    const timeout = setTimeout(() => {
      setStatus((current) => (current === 'validating' ? 'invalid' : current));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPassword || !cleanConfirm) {
      return triggerToast('Campos Incompletos', 'Ingresa y confirma tu nueva contraseña.', 'warning');
    }
    if (cleanPassword.length < 6) {
      return triggerToast('Contraseña Débil', 'Debe tener al menos 6 caracteres.', 'warning');
    }
    if (cleanPassword !== cleanConfirm) {
      return triggerToast('Error de Seguridad', 'Las contraseñas no coinciden.', 'error');
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: cleanPassword });
      if (error) throw error;

      triggerToast('Contraseña Actualizada', 'Tu contraseña fue cambiada con éxito. Inicia sesión de nuevo.', 'success');
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      triggerToast('Error', err.message || 'No se pudo actualizar la contraseña.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4 relative">
      <Toast
        isOpen={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastConfig.title}
        message={toastConfig.message}
        variant={toastConfig.variant}
        buttonText="Entendido"
      />

      <div className="w-full max-w-md bg-card rounded-xl border border-card-border p-8 space-y-6 shadow-2xl animate-fade-in-up">

        {/* Logo Fijo Superior, igual al de login */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center justify-center">
            <img
              src={logoImg.src}
              alt="RegoSchol Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-slate-500">Panel Administrativo</p>
        </div>

        {status === 'validating' && (
          <div className="text-center py-6">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-sm text-slate-500">Validando enlace de recuperación...</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center py-4 space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900">Enlace Inválido o Expirado</h2>
            <p className="text-sm text-slate-500">
              Este enlace de recuperación ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-sm transition-all shadow-md"
            >
              Volver al Inicio de Sesión
            </button>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-6">
            <div className="text-center pb-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Nueva Contraseña
              </h2>
              <p className="text-slate-500 text-sm mt-1">Elige una nueva contraseña para tu cuenta.</p>
            </div>

            <form noValidate onSubmit={handleSubmit} className="space-y-5 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200 focus:outline-none p-1 rounded ${
                      showPassword ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    tabIndex={-1}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.62 9.62a3 3 0 004.24 4.24M1 1l22 22" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-medium rounded-xl shadow-sm transition-all text-sm active:scale-[0.98] transform"
              >
                {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
