'use client';

import React from 'react';

export interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  buttonText?: string;
}

export default function Toast({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'Entendido'
}: ToastProps) {

  if (!isOpen) return null;

  // Configuración de iconos vectoriales (SVG) y estilos por variante
  const variantStyles = {
    success: {
      titleColor: 'text-success',
      icon: (
        <svg className="w-12 h-12 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      titleColor: 'text-error',
      icon: (
        <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    warning: {
      titleColor: 'text-warning',
      icon: (
        <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      titleColor: 'text-info',
      icon: (
        <svg className="w-12 h-12 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const currentStyle = variantStyles[variant];

  return (
    // Capa trasera que oscurece al 30% y centra todo
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs transition-opacity">

      {/* Caja de alerta simétrica, más grande y cuadrada */}
      <div className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center space-y-5 animate-fade-in-up">

        {/* Icono Grande Centrado */}
        <div className="p-2 bg-slate-50 rounded-full">
          {currentStyle.icon}
        </div>

        {/* Textos Informativos */}
        <div className="space-y-2">
          {title && (
            <h3 className={`text-base font-bold uppercase tracking-wider ${currentStyle.titleColor}`}>
              {title}
            </h3>
          )}
          <p className="text-sm font-medium text-slate-600 leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Botón de Confirmación Principal */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all text-sm active:scale-95 transform shadow-md"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}