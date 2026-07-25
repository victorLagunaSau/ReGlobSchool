'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la sesión terminó de cargar y encuentra un usuario activo
    if (!loading && user) {
      // Lo manda directo a su área de trabajo
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    router.replace('/login');
  };

  // Pantalla de carga limpia con tu color oscuro corporativo mientras el contexto de autenticación despierta
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Si no está autenticado, renderiza de forma estática la Landing sin parpadeos
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dark-bg px-4 text-white">
      <div className="w-full max-w-md bg-card rounded-xl border border-card-border p-8 flex flex-col items-center space-y-8 text-center shadow-2xl animate-fade-in-up">

        {/* Logo Fijo Superior */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center justify-center">
            <img
              src="/assets/logos/logo.png"
              alt="Regoschool Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-slate-500">Bienvenido a la Plataforma</p>
        </div>

        {/* Botón de Iniciar sesión limpio */}
        <button
          onClick={handleStart}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg active:scale-98"
        >
          Iniciar Sesión
        </button>
      </div>
    </main>
  );
}