'use client';

import React, { useState } from 'react';
import MapView from '../../../../components/ui/MapView';

// El arreglo de cobertura vive aquí o vendrá de tu BD/consultas
const coberturaData = [
    { stateId: "MX-AGS", nombre: "Aguascalientes", inegi: "01", licensesCenso: 45000, licensesSold: 4000 },
    { stateId: "MX-DUR", nombre: "Durango", inegi: "10", licensesCenso: 1440, licensesSold: 0 },
    { stateId: "MX-TAM", nombre: "Tamaulipas", inegi: "28", licensesCenso: 50000, licensesSold: 45000 },
    { stateId: "MX-JAL", nombre: "Jalisco", inegi: "14", licensesCenso: 60000, licensesSold: 30000 },
    { stateId: "MX-NLE", nombre: "Nuevo León", inegi: "19", licensesCenso: 30000, licensesSold: 22500 },
    { stateId: "MX-OAX", nombre: "Oaxaca", inegi: "20", licensesCenso: 20000, licensesSold: 0 },
];

export default function MapsPage() {
    // Estado que recibe la información del estado seleccionado desde MapView
    const [selectedState, setSelectedState] = useState<any | null>(null);

    const getPercentage = (sold: number, total: number) => total === 0 ? 0 : (sold / total) * 100;

    return (
        <div className="h-full flex flex-col gap-8 pb-10">
            <header>
                <h1 className="text-3xl font-black text-slate-950 tracking-tight">Geolocalización de Cobertura</h1>
                <p className="text-slate-500 mt-2">Visualización centralizada de todas las zonas asignadas.</p>
            </header>

            {/* Contenedor principal en dos columnas (Mapa a la izquierda, Panel de datos a la derecha) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl">

                {/* Columna del Mapa (ocupa 2 espacios) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Mapa de Cobertura - México</h2>
                    <MapView
                        geoUrl="/data/maps/mexico.json"
                        data={coberturaData}
                        onStateHover={(stateInfo) => setSelectedState(stateInfo)}
                    />
                </div>

                {/* Columna del Panel Lateral de Información (ocupa 1 espacio) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-bold mb-4">Detalle de Zona</h2>

                        {selectedState ? (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900">
                                        {selectedState.nombre || selectedState.geoName}
                                        {selectedState.stateId ? ` (${selectedState.stateId.split('-')[1]})` : ""}
                                    </h3>
                                    <p className="text-sm text-slate-500">INEGI: {selectedState.inegi}</p>
                                </div>

                                {selectedState.sinAsignar ? (
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <p className="text-slate-500 italic text-sm">Este estado no cuenta con datos de licencias asignadas actualmente.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 bg-blue-50/50 p-4 border border-blue-100 rounded-xl">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Licencias Deseadas:</span>
                                            <span className="font-semibold text-slate-900">{selectedState.licensesCenso?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Licencias Atendidas:</span>
                                            <span className="font-semibold text-slate-900">{selectedState.licensesSold?.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                                            <span className="text-slate-700 font-medium">Progreso Global:</span>
                                            <span className="text-lg font-bold text-blue-600">
                                                {getPercentage(selectedState.licensesSold, selectedState.licensesCenso).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-sm text-slate-400">Pasa el cursor sobre cualquier estado del mapa para consultar su información detallada.</p>
                            </div>
                        )}
                    </div>

                    {/* Botón de acción inferior */}
                    {selectedState && !selectedState.sinAsignar && (
                        <button className="mt-6 w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm">
                            Ver Resumen Completo
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}