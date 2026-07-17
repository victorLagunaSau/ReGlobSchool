'use client';

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { AuthView } from './page';

interface RegisterFormProps {
  setView: (v: AuthView) => void;
  triggerToast: (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function RegisterForm({ setView, triggerToast }: RegisterFormProps) {
  // --- ESTADOS DEL FORMULARIO ---
  const [names, setNames] = useState('');
  const [lastNames, setLastNames] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [project, setProject] = useState('');
  const [businessPartner, setBusinessPartner] = useState(''); // Opcional
  const [personalPhone, setPersonalPhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');

  // Autenticación básica
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Interfaz
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auxiliar para validar estructura de correo
  const validateEmail = (inputEmail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpieza de espacios en blanco
    const cleanNames = names.trim();
    const cleanLastNames = lastNames.trim();
    const cleanState = stateRegion.trim();
    const cleanProject = project.trim();
    const cleanPartner = businessPartner.trim();
    const cleanPersonalPhone = personalPhone.trim();
    const cleanOfficePhone = officePhone.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    // 1. VALIDACIÓN: Campos obligatorios vacíos (dejando fuera al socio comercial que es opcional)
    if (
      !cleanNames ||
      !cleanLastNames ||
      !cleanState ||
      !cleanProject ||
      !cleanPersonalPhone ||
      !cleanOfficePhone ||
      !cleanEmail ||
      !cleanPassword ||
      !cleanConfirmPassword
    ) {
      triggerToast('Campos Incompletos', 'Por favor, rellena todos los campos obligatorios marcados con (*).', 'warning');
      return;
    }

    // 2. VALIDACIÓN: Formato de correo electrónico
    if (!validateEmail(cleanEmail)) {
      triggerToast('Formato Inválido', 'El correo electrónico no tiene una estructura válida (ejemplo@dominio.com).', 'error');
      return;
    }

    // 3. VALIDACIÓN: Largo de la contraseña (Firebase exige mínimo 6 caracteres)
    if (cleanPassword.length < 6) {
      triggerToast('Contraseña Débil', 'Por seguridad, la contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    // 4. VALIDACIÓN: Coincidencia de contraseñas
    if (cleanPassword !== cleanConfirmPassword) {
      triggerToast('Error de Seguridad', 'Las contraseñas ingresadas no coinciden. Verifícalas bien.', 'error');
      return;
    }

    try {
      setLoading(true);

      // Registro en Firebase Auth
      await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

      // Nota: Los datos adicionales como cleanNames, cleanProject, etc. los guardaremos
      // en Firestore en el siguiente paso de la arquitectura.

      triggerToast('Registro Exitoso', 'La cuenta administrativa ha sido creada correctamente.', 'success');

      // Redirección al panel principal
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (err: any) {
      console.error('Error en el registro de Firebase:', err);

      let errorMessage = 'Ocurrió un error inesperado al registrar la cuenta administrativa.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'El correo electrónico ya está registrado en el sistema. Intenta iniciar sesión.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico no es aceptado por el servidor.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de red. Revisa tu conexión a internet.';
      }

      triggerToast('Error de Registro', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Registro de Nuevo Administrador</h3>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-4 text-left">

        {/* Fila: Nombre y Apellidos */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Nombre(s) <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder="Víctor Jovani"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Apellido(s) <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={lastNames}
              onChange={(e) => setLastNames(e.target.value)}
              placeholder="Laguna Saucedo"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila: Estado y Proyecto */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Estado/Región <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={stateRegion}
              onChange={(e) => setStateRegion(e.target.value)}
              placeholder="Nuevo León"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Proyecto <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Edukans, computación avanzada..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        {/* Campo: Socio Comercial (Opcional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Socio Comercial <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <input
            type="text"
            value={businessPartner}
            onChange={(e) => setBusinessPartner(e.target.value)}
            placeholder="Ejemplo: Educare Montenegro"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
            disabled={loading}
          />
        </div>

        {/* Fila: Teléfonos */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Teléfono Personal <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              value={personalPhone}
              onChange={(e) => setPersonalPhone(e.target.value)}
              placeholder="8110002233"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Teléfono Oficina <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              value={officePhone}
              onChange={(e) => setOfficePhone(e.target.value)}
              placeholder="8180004455"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        <hr className="border-slate-100 my-2" />

        {/* Campo: Correo Electrónico */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Correo Electrónico de Acceso <span className="text-error">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@regobschool.com"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
            disabled={loading}
          />
        </div>

        {/* Fila: Contraseñas con botón de ojo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Contraseña <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none p-1 rounded ${
                  showPassword ? 'text-primary' : 'text-slate-400'
                }`}
                tabIndex={-1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.62 9.62a3 3 0 004.24 4.24M1 1l22 22" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Confirmar Contraseña <span className="text-error">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-medium rounded-xl shadow-sm transition-all text-sm active:scale-[0.98] transform"
        >
          {loading ? 'Procesando registro...' : 'Registrar Cuenta'}
        </button>
      </form>

      {/* Volver al login */}
      <div className="flex justify-center pt-2 text-xs font-semibold">
        <button onClick={() => setView('login')} className="text-primary hover:underline">
          ¿Ya tienes cuenta? Inicia Sesión
        </button>
      </div>
    </div>
  );
}