'use client';

import React from 'react';

interface PendingAuthorizationProps {
  adminName: string;
  onLogout: () => void;
}

export default function PendingAuthorization({ adminName, onLogout }: PendingAuthorizationProps) {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="max-w-md w-full border border-amber-200 bg-amber-50/50 rounded-2xl p-8 shadow-sm flex flex-col items-center">

        {/* Icono de Alerta Amarilla */}
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Mensajes */}
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Cuenta en Espera de Autorización
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Hola <span className="font-semibold text-slate-800">{adminName}</span>, tu usuario ha sido registrado correctamente en el sistema, pero requiere la activación manual de un administrador global.
        </p>

        {/* Banner Informativo */}
        <div className="w-full bg-white border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-800 space-y-1 mb-6 shadow-sm">
          <p className="font-bold uppercase tracking-wider text-[10px]">¿Qué debes hacer?</p>
          <p>Por favor, ponte en contacto con el equipo de soporte técnico o con tu director comercial para habilitar tus accesos inmediatos.</p>
        </div>

        {/* Botón de salida segura corregido */}
        <button
          onClick={onLogout}
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100/50 hover:bg-amber-100 transition-colors py-2.5 px-5 rounded-xl flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </main>
  );
}