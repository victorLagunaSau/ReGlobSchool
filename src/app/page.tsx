'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import PendingAuthorization from '../components/ui/PendingAuthorization'; // ◄ Importación del módulo extraído

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userState, setUserState] = useState<'guest' | 'pending' | 'authorized'>('guest');
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserState('guest');
        setLoading(false);
        router.push('/login');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAdminName(userData.fullName || 'Administrador');

          if (userData.authorized === true) {
            setUserState('authorized');
          } else {
            setUserState('pending');
          }
        } else {
          setUserState('pending');
        }
      } catch (error) {
        console.error("Error al validar autorización:", error);
        setUserState('pending');
      } {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // 1. CARGA (SIN PARPADEO)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 mt-4 uppercase tracking-wider">Verificando Credenciales...</p>
      </div>
    );
  }

  // 2. BLOQUEO PERPETUO POR SEGURIDAD MODULARIZADO
  if (userState === 'pending') {
    return <PendingAuthorization adminName={adminName} onLogout={handleLogout} />;
  }

  // 3. CORE DEL PANEL PRINCIPAL (AQUÍ EMPIEZA REGLOBSCHOOL)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">

      {/* HEADER / TOPBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-primary text-white font-black px-3 py-1.5 rounded-xl tracking-tight text-lg">
            ReGlobSchool
          </div>
          <span className="text-xs font-medium text-slate-400 border-l border-slate-200 pl-3">Panel Admin</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{adminName}</p>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Acceso Autorizado</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-error hover:bg-slate-50 rounded-xl transition-all"
            title="Cerrar Sesión"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* CONTENEDOR DE PRODUCCIÓN */}
      <div className="flex-1 flex flex-col md:flex-row">

        {/* NAVBAR LATERAL */}
        <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-1 flex md:flex-col shrink-0">
          <div className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 hidden md:block">
            Módulos Core
          </div>
          <a href="#dashboard" className="flex items-center space-x-3 bg-primary/5 text-primary font-semibold px-4 py-3 rounded-xl text-sm w-full transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Dashboard Principal</span>
          </a>
          <a href="#schools" className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-4 py-3 rounded-xl text-sm w-full transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Control de Escuelas</span>
          </a>
          <a href="#payments" className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-4 py-3 rounded-xl text-sm w-full transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pagos y Finanzas</span>
          </a>
          <a href="#ia" className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-4 py-3 rounded-xl text-sm w-full transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Automatización IA</span>
          </a>
        </nav>

        {/* WORKSPACE CONTENT */}
        <main className="flex-1 p-6 md:p-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>

            <div className="space-y-2">
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border border-emerald-200">
                Sistema Operativo Activo
              </span>
              <h1 className="text-3xl font-black text-slate-950 tracking-tight pt-2">
                Control de escuelas, pagos y automatización con IA
              </h1>
              <p className="text-sm text-slate-500 max-w-2xl">
                Bienvenido al núcleo de ReGlobSchool. Desde aquí podrás gestionar los proyectos educativos, coordinar la facturación de los centros escolares y configurar los agentes inteligentes de lectura.
              </p>
            </div>
          </div>

          {/* Tarjetas informativas de KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-32 flex flex-col justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escuelas Activas</p>
              <h3 className="text-2xl font-black text-slate-950">---</h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-32 flex flex-col justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eficiencia de Recaudo</p>
              <h3 className="text-2xl font-black text-slate-950">---</h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-32 flex flex-col justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultas IA / Mes</p>
              <h3 className="text-2xl font-black text-slate-950">---</h3>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} ReGlobSchool. Todos los derechos reservados.
      </footer>
    </div>
  );
}