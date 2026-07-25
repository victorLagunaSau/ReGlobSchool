'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, MapPin, LogOut, X, Map, Users } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, onLogout }: SidebarProps) {
  const pathname = usePathname();

  // Las 3 únicas opciones requeridas para la navegación
  const navigationOptions = [
    { name: 'HomePanel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'UNES', href: '/dashboard/unes', icon: GraduationCap },
    { name: 'Zonas', href: '/dashboard/zonas', icon: MapPin },
    { name: 'Mapas', href: '/dashboard/maps', icon: Map },
    { name: 'Leads', href: '/dashboard/leads', icon: Users },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 transition-transform duration-300 ease-in-out w-64
        border-r border-slate-800 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <img
              src="/assets/logos/logo.png"
              alt="Regoschool Logo"
              className="h-6 w-auto object-contain invert brightness-200"
            />
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationOptions.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }
                `}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors duration-200"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}