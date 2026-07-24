'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import { AuthView } from './page';

interface Country {
  id: string;
  name: string;
}

interface StateOption {
  id: string;
  country_id: string;
  name: string;
}

interface RegisterFormProps {
  setView: (v: AuthView) => void;
  triggerToast: (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function RegisterForm({ setView, triggerToast }: RegisterFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- CAPTURA DE DATA ---
  const [formData, setFormData] = useState({
    fullName: '',
    project: '',
    businessPartner: '',
    personalPhone: '',
    officePhone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // --- REFERENCIAS DE ENFOQUE (DOM NATIVO) ---
  const projectRef = useRef<HTMLInputElement>(null);
  const partnerRef = useRef<HTMLInputElement>(null);
  const personalPhoneRef = useRef<HTMLInputElement>(null);
  const officePhoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // --- PAÍS / ESTADO (opcionales: si el catálogo aún no tiene datos, quedan en null) ---
  const [countries, setCountries] = useState<Country[]>([]);
  const [allStates, setAllStates] = useState<StateOption[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');

  useEffect(() => {
    supabase.from('countries').select('id, name').order('name').then(({ data }) => {
      if (data) setCountries(data);
    });
    supabase.from('states').select('id, country_id, name').order('name').then(({ data }) => {
      if (data) setAllStates(data);
    });
  }, []);

  const filteredStates = allStates.filter((s) => s.country_id === selectedCountryId);

  const totalSteps = 4;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- CONTROL DE NAVEGACIÓN MANUAL ENTRE PASOS ---
  const handleNext = () => {
    if (currentStep === 1 && !formData.fullName.trim()) {
      return triggerToast('Campo Requerido', 'Por favor, escribe tu nombre completo.', 'warning');
    }
    if (currentStep === 2 && !formData.project.trim()) {
      return triggerToast('Campo Requerido', 'Por favor, escribe el nombre del proyecto o empresa.', 'warning');
    }
    if (currentStep === 3 && (!formData.personalPhone.trim() || !formData.officePhone.trim())) {
      return triggerToast('Campos Incompletos', 'Por favor, introduce ambos números de teléfono.', 'warning');
    }

    setCurrentStep((prev) => prev + 1);
  };

  // --- MANEJADOR DE KEYDOWN INTELIGENTE CAMPO POR CAMPO ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Detiene cualquier intento de submit prematuro del navegador

      // PASO 1
      if (currentField === 'fullName') {
        handleNext();
      }

      // PASO 2: Empresa y Socio
      else if (currentField === 'project') {
        partnerRef.current?.focus(); // Pasa al socio comercial
      } else if (currentField === 'businessPartner') {
        handleNext(); // Último del paso 2, avanza al paso 3
      }

      // PASO 3: Teléfonos
      else if (currentField === 'personalPhone') {
        officePhoneRef.current?.focus(); // Pasa al teléfono de oficina
      } else if (currentField === 'officePhone') {
        handleNext(); // Último del paso 3, avanza al paso 4
      }

      // PASO 4: Credenciales
      else if (currentField === 'email') {
        passwordRef.current?.focus();
      } else if (currentField === 'password') {
        confirmPasswordRef.current?.focus();
      } else if (currentField === 'confirmPassword') {
        processFinalSubmit(); // Último campo del formulario, procesa el registro
      }
    }
  };

  // --- PROCESAMIENTO FINAL ---
  const processFinalSubmit = async () => {
    const { email, password, confirmPassword, fullName, project, businessPartner, personalPhone, officePhone } = formData;

    if (!email.trim() || !validateEmail(email.trim())) {
      return triggerToast('Correo Inválido', 'Introduce un correo electrónico válido.', 'warning');
    }
    if (!password.trim() || !confirmPassword.trim()) {
      return triggerToast('Campos Incompletos', 'Las contraseñas no pueden estar vacías.', 'warning');
    }
    if (password.length < 6) {
      return triggerToast('Contraseña Débil', 'Debe tener al menos 6 caracteres.', 'warning');
    }
    if (password !== confirmPassword) {
      return triggerToast('Error de Seguridad', 'Las contraseñas no coinciden.', 'error');
    }

    try {
      setLoading(true);

      // 1. Registro en Supabase Auth (requiere "Confirm email" desactivado en el
      //    proyecto para que devuelva sesión activa de inmediato, igual que antes)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      if (signUpError) throw signUpError;

      const user = signUpData.user;
      if (!user) throw new Error('No se pudo crear el usuario.');

      // 2. Guardar perfil en Postgres (país/estado quedan en null si no se seleccionaron)
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: fullName.trim(),
        project: project.trim(),
        business_partner: businessPartner.trim() ? businessPartner.trim() : null,
        personal_phone: personalPhone.trim(),
        office_phone: officePhone.trim(),
        email: email.trim().toLowerCase(),
        role: 'admin',
        authorized: false,
        country_id: selectedCountryId || null,
        state_id: selectedStateId || null,
      });
      if (profileError) throw profileError;

      triggerToast('Registro Exitoso', 'Tu cuenta fue creada. Espera la autorización del sistema.', 'success');

      setTimeout(() => {
        router.refresh();
        router.push('/');
      }, 2000);

    } catch (err: any) {
      console.error('Error capturado:', err);
      let titleError = 'Error de Registro';
      let messageError = err.message || 'No se pudo completar el registro.';

      if (err.message?.toLowerCase().includes('already registered')) {
        titleError = 'Cuenta Duplicada';
        messageError = 'Este correo electrónico ya está registrado.';
      }

      if (typeof triggerToast === 'function') {
        triggerToast(titleError, messageError, 'error');
      } else {
        alert(`${titleError}: ${messageError}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="text-center pb-2">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Registro de Administrador
        </h2>
        <p className="text-slate-500 text-sm mt-1">Completa tus datos para solicitar acceso.</p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>Progreso</span>
        <span className="text-primary bg-slate-50 px-2 py-0.5 rounded-md">Paso {currentStep} de {totalSteps}</span>
      </div>

      {/* Cambiamos el onSubmit para controlar el flujo nativo del form */}
      <form noValidate onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">

        {/* PASO 1: NOMBRE COMPLETO */}
        {currentStep === 1 && (
          <div className="animate-fade-in-up">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'fullName')}
              placeholder="Escribe tu nombre y apellidos"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* PASO 2: DATOS DE LA EMPRESA */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Nombre del Proyecto *
              </label>
              <input
                ref={projectRef}
                type="text"
                value={formData.project}
                onChange={(e) => updateField('project', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'project')}
                placeholder="Nombre de tu empresa"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Socio Comercial <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                ref={partnerRef}
                type="text"
                value={formData.businessPartner}
                onChange={(e) => updateField('businessPartner', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'businessPartner')}
                placeholder="Nombre de tu socio comercial"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  País <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <select
                  value={selectedCountryId}
                  onChange={(e) => { setSelectedCountryId(e.target.value); setSelectedStateId(''); }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">
                    {countries.length === 0 ? 'Sin países disponibles' : 'Selecciona...'}
                  </option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Estado <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <select
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                  disabled={!selectedCountryId}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                >
                  <option value="">
                    {!selectedCountryId ? 'Elige un país primero' : filteredStates.length === 0 ? 'Sin estados disponibles' : 'Selecciona...'}
                  </option>
                  {filteredStates.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: TELÉFONOS */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Teléfono Personal *
              </label>
              <input
                ref={personalPhoneRef}
                type="tel"
                value={formData.personalPhone}
                onChange={(e) => updateField('personalPhone', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'personalPhone')}
                placeholder="10 dígitos numéricos"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Teléfono de Oficina *
              </label>
              <input
                ref={officePhoneRef}
                type="tel"
                value={formData.officePhone}
                onChange={(e) => updateField('officePhone', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'officePhone')}
                placeholder="Número de oficina o extensión"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        )}

        {/* PASO 4: CORREO Y CONTRASEÑAS */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Correo Electrónico de Acceso *
              </label>
              <input
                ref={emailRef}
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'email')}
                placeholder="usuario@dominio.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-2">Contraseña *</label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'password')}
                    placeholder="Mínimo 6"
                    className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary focus:outline-none"
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
                <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-2">Confirmar *</label>
                <input
                  ref={confirmPasswordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'confirmPassword')}
                  placeholder="Repetir"
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- BOTONES DE CONTROL --- */}
        <div className="flex gap-3 pt-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((p) => p - 1)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
            >
              Atrás
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={processFinalSubmit}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
            >
              {loading ? 'Creando Cuenta...' : 'Registrar Administrador'}
            </button>
          )}
        </div>
      </form>

      {/* Volver al Login */}
      <div className="flex justify-center border-t border-slate-100 pt-4 text-xs font-semibold">
        <button onClick={() => setView('login')} className="text-slate-500 hover:text-slate-800">
          ¿Ya tienes cuenta? <span className="text-primary hover:underline">Inicia Sesión</span>
        </button>
      </div>
    </div>
  );
}