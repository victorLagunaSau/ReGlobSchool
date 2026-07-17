'use client';

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { AuthView } from './page';

export default function ResetPasswordForm({ setView }: { setView: (v: AuthView) => void }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
    } catch (err: any) {
      console.error(err);
      setError('No se pudo enviar el correo de recuperación. Verifica el remitente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recuperar Acceso</h3>
      </div>

      {error && (
        <div className="bg-error-light border border-error/10 text-error rounded-xl p-4 text-xs font-medium text-center">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-success-light border border-success/10 text-success rounded-xl p-4 text-xs font-medium text-center">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@reglobschool.com"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-medium rounded-xl shadow-sm transition-all text-sm active:scale-[0.98] transform"
        >
          {loading ? 'Enviando...' : 'Enviar Enlace'}
        </button>
      </form>

      <div className="flex justify-center pt-2 text-xs font-semibold">
        <button onClick={() => setView('login')} className="text-primary hover:underline">
          Volver al Inicio de Sesión
        </button>
      </div>
    </div>
  );
}