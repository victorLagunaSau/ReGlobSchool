'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';
import Sidebar from '@/src/components/Sidebar';
import HeaderPanel from '@/src/components/HeaderPanel';
import Footer from '@/src/components/Footer';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  // ◄ ESTOS ESTADOS DEBEN ESTAR AQUÍ ADENTRO:
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = async (userId: string) => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, role, authorized')
          .eq('id', userId)
          .single();

        if (error || !profile) {
          setIsAuthorized(false);
        } else {
          setAdminName(profile.full_name || 'Administrador');
          setAdminRole(profile.role || 'Administrador');
          setIsAuthorized(profile.authorized === true);
        }
      } catch (error) {
        console.error("Error al validar autorización:", error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      checkAuthorization(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      checkAuthorization(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 mt-4 uppercase tracking-wider">Verificando Credenciales...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    // ... Tu vista de Cuenta en Espera que ya definimos
    return (
      <main className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full border border-card-border bg-card rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <h2 className="text-xl font-bold text-white mb-2">Cuenta en Espera de Autorización</h2>
          <p className="text-sm text-slate-400 mb-6">Hola {adminName}, tu usuario requiere activación.</p>
          <button onClick={handleLogout} className="text-xs font-semibold text-slate-400 hover:text-white py-2 px-4 rounded-lg hover:bg-slate-800">
            Regresar al Inicio de Sesión
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onLogout={handleLogout} />

      <div className="flex flex-col min-h-screen lg:pl-64 transition-all duration-300 ease-in-out">
        <HeaderPanel
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
          adminName={adminName}
          adminRole={adminRole}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
