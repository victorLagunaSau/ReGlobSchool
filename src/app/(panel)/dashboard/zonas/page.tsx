'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { ClipboardCopy, LayoutGrid, PlusCircle, Settings } from 'lucide-react';
import TablaZonas from './components/TablaZonas';
import ModalCargaMasiva from './components/ModalCargaMasiva';
import FormRegistrarZona from './components/FormRegistrarZona';
import Config from './components/Config';

interface Country {
  id: string;
  name: string;
}

interface State {
  id: string;
  countryId: string;
  name: string;
}

export default function ZonasPage() {
  // Pestañas activas: 'list' (Matriz de Control), 'config' (Configuración General)
  const [activeTab, setActiveTab] = useState<'list' | 'config'>('list');

  // Controladores de Popups globales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Catálogos dinámicos sincronizados con Firestore en tiempo real
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);

  useEffect(() => {
    const unsubscribeCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      setCountries(snapshot.docs.map(d => d.data() as Country));
    });

    const unsubscribeStates = onSnapshot(collection(db, 'states'), (snapshot) => {
      setStates(snapshot.docs.map(d => d.data() as State));
    });

    return () => {
      unsubscribeCountries();
      unsubscribeStates();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER DE NAVEGACIÓN GENERAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Control Territorial Multi-País</h1>
          <p className="text-xs text-slate-500">Datos y catálogos en tiempo real conectados con Firebase.</p>
        </div>

        {/* Botonera Principal Reducida */}
        <div className="flex flex-wrap border border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-0.5">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'list' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={14} />
            Matriz de Zonas
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'config' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings size={14} />
            Configuración
          </button>

          <div className="w-px h-6 bg-slate-200 self-center mx-1 hidden sm:block" />

          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
          >
            <ClipboardCopy size={14} />
            Carga Excel
          </button>
        </div>
      </div>

      {/* CUERPO DINÁMICO DEL MÓDULO */}
      {activeTab === 'list' && (
        <div className="space-y-4 animate-fade-in">
          {/* BOTÓN "NUEVA ZONA" UBICADO JUSTO ARRIBA DE LA TABLA */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm group"
            >
              <PlusCircle size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
              Nueva Zona Comercial
            </button>
          </div>

          {/* Renderizado de la Tabla de Control */}
          <TablaZonas countries={countries} states={states} />
        </div>
      )}

      {activeTab === 'config' && (
        <Config />
      )}

      {/* POPUP DE REGISTRO INDIVIDUAL DE ZONA SEGMENTADA */}
      <FormRegistrarZona
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        countries={countries}
        states={states}
      />

      {/* POPUP DE CARGA MASIVA */}
      <ModalCargaMasiva
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        states={states}
      />
    </div>
  );
}