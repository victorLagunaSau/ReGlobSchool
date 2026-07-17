'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-4 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 font-medium shadow-sm">
      <div className="flex items-center gap-2 mb-2 sm:mb-0">
        <img
          src="/assets/logos/logo.png"
          alt="Regoschool Logo"
          className="h-4 w-auto object-contain grayscale opacity-60"
        />
        <span>&copy; {new Date().getFullYear()} ReGlobSchool. Todos los derechos reservados.</span>
      </div>
      <div>
        <span>Desarrollado por </span>
        <span className="font-semibold text-gray-600">Víctor J. Laguna Saucedo</span>
      </div>
    </footer>
  );
}