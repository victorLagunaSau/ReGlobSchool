'use client';

import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">¡Bienvenido de vuelta a Regoschool!</h2>
        <p className="mt-2 text-gray-600">
          Este es tu espacio de trabajo principal. Aquí comenzaremos a construir los módulos hoy.
        </p>
      </div>

      {/* Grid de ejemplo para ver cómo reacciona el layout */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-400">Licencias Activas</div>
          <div className="mt-2 text-3xl font-semibold text-gray-800">9,030</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-400">Entornos Activos</div>
          <div className="mt-2 text-3xl font-semibold text-gray-800">3</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-400">Estado del Sistema</div>
          <div className="mt-2 text-3xl font-semibold text-green-500">Operacional</div>
        </div>
      </div>
    </div>
  );
}