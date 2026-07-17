'use client';

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { AuthView } from './page';

interface ResetPasswordFormProps {
  setView: (v: AuthView) => void;
  triggerToast: (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ResetPasswordForm({ setView, triggerToast }: ResetPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const processResetSubmit = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      return triggerToast('Campo Requerido', 'Por favor, ingresa tu correo electrónico para continuar.', 'warning');
    }

    // Validación de formato básico de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return triggerToast('Formato Inválido', 'El formato del correo electrónico no es correcto.', 'error');
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, cleanEmail);

      triggerToast(
        'Enlace Enviado',
        'Se ha enviado un correo electrónico con las instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.',
        'success'
      );

      // Regresa al login automáticamente para mejorar la UX después del éxito
      setTimeout(() => {
        setView('login');
      }, 3000);

    } catch (err: any) {
      console.error('Error en recuperación:', err);

      let titleError = 'Error de Recuperación';
      let messageError = 'No se pudo enviar el correo de recuperación en este momento.';

      // Mapeo de errores de Firebase Auth
      if (err.code === 'auth/user-not-found') {
        titleError = 'Usuario No Encontrado';
        messageError = 'No existe ninguna cuenta registrada con este correo electrónico.';
      } else if (err.code === 'auth/invalid-email') {
        titleError = 'Correo Inválido';
        messageError = 'El servidor no reconoce este correo electrónico como válido.';
      } else if (err.code === 'auth/network-request-failed') {
        titleError = 'Error de Red';
        messageError = 'Revisa tu conexión a internet e inténtalo de nuevo.';
      }

      if (typeof triggerToast === 'function') {
        triggerToast(titleError, messageError, 'error');
      } else {
        alert(`${titleError}: ${messageError}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processResetSubmit();
    }
  };

  return (
    <div className="space-y-6">

      {/* Título de la sección */}
      <div className="text-center pb-2">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Recuperar Acceso
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Ingresa tu correo para restablecer tu cuenta.
        </p>
      </div>

      <form noValidate onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Correo Electrónico de Acceso
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="usuario@dominio.com"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
            disabled={loading}
            autoFocus
          />
        </div>

        <button
          type="button"
          onClick={processResetSubmit}
          disabled={loading}
          className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-semibold rounded-xl text-sm transition-all shadow-md active:scale-[0.98] transform"
        >
          {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
        </button>
      </form>

      {/* Volver al login */}
      <div className="flex justify-center border-t border-slate-100 pt-4 text-xs font-semibold">
        <button onClick={() => setView('login')} className="text-slate-500 hover:text-slate-800">
          ¿Recordaste tus datos? <span className="text-primary hover:underline">Volver al Inicio de Sesión</span>
        </button>
      </div>
    </div>
  );
}