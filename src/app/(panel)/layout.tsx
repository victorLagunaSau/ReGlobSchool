'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase'; // ◄ Ajustado de acuerdo al nivel de carpetas en tu árbol
import Sidebar from '@/src/components/Sidebar';
import HeaderPanel from '@/src/components/HeaderPanel';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // El guardián del panel: Monitorea si hay un usuario logueado en Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Regla: Si no hay usuario activo, lo expulsa directamente a la Landing (/)
        router.push('/');
      } else {
        // Si todo está en orden, quita la pantalla de carga del Layout
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Regla: Al cerrar sesión, redirige directo a la pantalla de Login
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Spinner de carga limpio mientras validamos los permisos del usuario con Firebase
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Modular */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onLogout={handleLogout}
      />

      {/* Contenedor Principal Ajustable */}
      <div className="flex flex-col min-h-screen lg:pl-64 transition-all duration-300 ease-in-out">

        {/* Header Modular */}
        <HeaderPanel
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
        />

        {/* Área de Trabajo Responsiva */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white py-4 px-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Regoschool. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}