'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Escucha el estado de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Si ya está autenticado, lo redirigimos directo al panel
        router.push('/dashboard');
      } else {
        // Si no está autenticado, apagamos la carga para mostrar la landing
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    router.replace('/login');
  };

  // Mientras Firebase determina si hay un usuario activo, mostramos una pantalla de carga limpia
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dark-bg px-4 text-white">
      <div className="w-full max-w-md bg-card rounded-xl border border-card-border p-8 flex flex-col items-center space-y-8 text-center shadow-2xl animate-fade-in-up">

        {/* Logo Fijo Superior utilizando la ruta absoluta de la carpeta public */}
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

        {/* Botón de Iniciar estilo App */}
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