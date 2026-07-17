'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Key,
  Settings,
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, onLogout }: SidebarProps) {
  const pathname = usePathname();

  // Configuración de los links de navegación del panel
  const navigationOptions = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clientes / Distritos', href: '/dashboard/clientes', icon: Users },
    { name: 'Licencias', href: '/dashboard/licencias', icon: Key },
    { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop de fondo en móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Contenedor del Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 transition-transform duration-300 ease-in-out w-64
        border-r border-slate-800 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Header del Sidebar: Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="relative h-8 w-36">
            <Image
              src="/assets/logos/logo.png"
              alt="Regoschool Logo"
              fill
              className="object-contain object-left invert brightness-200" // Invertimos colores si el logo es oscuro para que resalte
              priority
            />
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links de navegación */}
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
                onClick={() => setIsOpen(false)} // Cierra el sidebar en móviles al hacer click
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer del Sidebar: Botón de Cerrar Sesión fijo abajo */}
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