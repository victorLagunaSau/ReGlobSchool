'use client';

import React, { useState } from 'react';
import logoImg from '../../../../public/assets/logos/logo.png';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ResetPasswordForm from './ResetPasswordForm';
import Toast from '../../../components/ui/Toast'; // ◄ Importación con la ruta correcta

export type AuthView = 'login' | 'register' | 'reset';

export default function LoginPage() {
  const [view, setView] = useState<AuthView>('login');

  // Control del Toast administrado desde el nivel superior de la pantalla
  const [toastOpen, setToastOpen] = useState(false);
  const [toastConfig, setToastConfig] = useState<{
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', variant: 'info' });

  const triggerToast = (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info') => {
    setToastConfig({ title, message, variant });
    setToastOpen(true);
  };

  return (
    <main className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4 relative">

      {/* 🌟 Al estar aquí afuera, el fixed abarca la pantalla completa sin restricciones de layouts hijos */}
      <Toast
        isOpen={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastConfig.title}
        message={toastConfig.message}
        variant={toastConfig.variant}
        buttonText="Entendido"
      />

      <div className="w-full max-w-md bg-card rounded-xl border border-card-border p-8 space-y-6 shadow-2xl animate-fade-in-up">

        {/* Logo Fijo Superior */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center justify-center">
            <img
              src={logoImg.src}
              alt="RegoSchol Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-slate-500">Panel Administrativo</p>
        </div>

        {/* Pasamos triggerToast como propiedad a cada uno de los submódulos */}
        {view === 'login' && <LoginForm setView={setView} triggerToast={triggerToast} />}
        {view === 'register' && <RegisterForm setView={setView} />}
        {view === 'reset' && <ResetPasswordForm setView={setView} />}

      </div>
    </main>
  );
}