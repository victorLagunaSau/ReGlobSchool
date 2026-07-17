'use client';

import React from 'react';
import { Menu, Bell, ChevronDown } from 'lucide-react';

interface HeaderPanelProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function HeaderPanel({ onMenuToggle, onLogout }: HeaderPanelProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 sticky top-0 z-30 shadow-sm">

      {/* Lado Izquierdo: Gatillo del Menú en Móvil */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu size={22} />
        </button>

        {/* Título o indicador de sección */}
        <div className="hidden sm:block">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Workspace</span>
          <h1 className="text-sm font-medium text-gray-700">Consola de Administración</h1>
        </div>
      </div>

      {/* Lado Derecho: Notificaciones y Perfil */}
      <div className="flex items-center gap-4">

        {/* Botón de Notificaciones */}
        <button className="relative rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
        </button>

        {/* Divisor Visual */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Menú de Perfil de Usuario */}
        <div className="group relative flex items-center gap-3 cursor-pointer p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-sm">
            V
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-gray-800 leading-tight">Víctor Laguna</p>
            <p className="text-xs text-gray-400">Administrador</p>
          </div>
          <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />

          {/* Dropdown simple al hacer hover o clic (opcional) */}
          <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-xl border border-gray-100 bg-white p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50/50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}