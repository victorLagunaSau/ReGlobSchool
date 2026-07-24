'use client';

import React, {useState} from 'react';
import {supabase} from '../../../lib/supabase/client';
import {AuthView} from './page';

interface LoginFormProps {
    setView: (v: AuthView) => void;
    triggerToast: (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info') => void; // ◄ Recibimos la función global
}

export default function LoginForm({setView, triggerToast}: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateEmail = (inputEmail: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail);
    };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiamos espacios vacíos accidentales al inicio o final
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Debug opcional: Ver en consola qué está leyendo el código
    console.log("Validando campos -> Email:", cleanEmail, "Password Length:", cleanPassword.length);

    // 1. VALIDACIÓN: ¿Están realmente vacíos?
    if (cleanEmail === '' || cleanPassword === '') {
      triggerToast(
        'Campos Incompletos',
        'Por favor, rellena todos los campos obligatorios.',
        'warning'
      );
      return; // Detiene la ejecución aquí
    }

    // 2. VALIDACIÓN: Si no están vacíos, ¿el formato de email es correcto?
    if (!validateEmail(cleanEmail)) {
      triggerToast(
        'Formato Inválido',
        'El correo electrónico no cumple con la estructura correcta (ejemplo@dominio.com).',
        'error'
      );
      return; // Detiene la ejecución aquí
    }

    // 3. INTENTO DE AUTENTICACIÓN: Si pasó lo anterior, va a Supabase
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        console.error("Error capturado desde Supabase:", error);

        let message = 'Credenciales incorrectas. Revisa tu correo o activa el icono del ojo para verificar tu contraseña.';
        if (error.message === 'Email not confirmed') {
          message = 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.';
        } else if (error.message && error.message !== 'Invalid login credentials') {
          message = error.message;
        }

        triggerToast('Error de Acceso', message, 'error');
        return;
      }

      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

    return (
        <div className="space-y-4">
            <form noValidate onSubmit={handleSubmit} className="space-y-4">
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

                <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Contraseña
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                            disabled={loading}
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200 focus:outline-none p-1 rounded ${
                                showPassword ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            tabIndex={-1}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                 strokeWidth={2}>
                                {showPassword ? (
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.62 9.62a3 3 0 004.24 4.24M1 1l22 22"/>
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-medium rounded-xl shadow-sm transition-all text-sm active:scale-[0.98] transform"
                >
                    {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
            </form>

            <div
                className="flex flex-col items-center justify-center space-y-2 pt-2 text-xs font-semibold text-primary">
                <button onClick={() => setView('reset')} className="hover:underline">
                    ¿Olvidaste tu contraseña?
                </button>
                <button onClick={() => setView('register')} className="text-slate-500 hover:text-slate-800">
                    ¿No tienes cuenta? <span className="text-primary hover:underline">Regístrate</span>
                </button>
            </div>
        </div>
    );
}