'use client';

import React, { useState } from 'react';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { X, Loader2 } from 'lucide-react';

interface ModalCargaMasivaProps {
  isOpen: boolean;
  onClose: () => void;
  states?: Array<{ id: string; countryId: string; name: string }>;
}

export default function ModalCargaMasiva({ isOpen, onClose }: ModalCargaMasivaProps) {
  const [bulkInput, setBulkInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logMessage, setLogMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleBulkLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;

    setIsProcessing(true);
    setLogMessage(null);

    const lines = bulkInput.split('\n');
    const batch = writeBatch(db);

    let currentZonesSizeMap: Record<string, number> = {};
    let countriesCreated: Record<string, boolean> = {};
    let statesCreated: Record<string, boolean> = {};

    let addedCount = 0;

    try {
      // 1. Mapeo de consecución limpia por estado
      const zonesSnapshot = await getDocs(collection(db, 'zones'));
      zonesSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.stateId) {
          currentZonesSizeMap[data.stateId] = (currentZonesSizeMap[data.stateId] || 0) + 1;
        }
      });

      // 2. Procesamiento de líneas CSV
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Omitir líneas vacías o la cabecera del archivo
        if (!line || line.toLowerCase().includes('cveestado') || line.toLowerCase().includes('país')) continue;

        // Soporte para separación por coma o por tabulación
        const columns = line.includes('\t') ? line.split('\t') : line.split(',');

        if (columns.length >= 19) {
          const rawCveEstado = parseInt(columns[0].trim(), 10) || 0;
          const rawPais = columns[1].trim();
          const rawCodEstado = columns[2].trim().toUpperCase();
          const rawEstado = columns[3].trim();
          const rawCveMunicipio = parseInt(columns[4].trim(), 10) || 0;
          const rawCVEGEO = columns[5].trim();
          const rawCiudad = columns[6].trim();

          // Métricas de Censo
          const rawSchoolsPotential = parseInt(columns[8].trim(), 10) || 0;
          const rawLicensesCenso = parseInt(columns[9].trim(), 10) || 0;

          const rawAssignedTo = columns[17].trim();
          const rawCountryId = columns[18].trim().toUpperCase();

          const stateId = `${rawCountryId}-${rawCodEstado}`;

          // Autocreación/Aseguramiento de Catálogos Padre
          if (!countriesCreated[rawCountryId]) {
            batch.set(doc(db, 'countries', rawCountryId), {
              id: rawCountryId,
              name: rawPais
            }, { merge: true });
            countriesCreated[rawCountryId] = true;
          }

          if (!statesCreated[stateId]) {
            batch.set(doc(db, 'states', stateId), {
              id: stateId,
              countryId: rawCountryId,
              Pais: rawPais,
              CveEstado: rawCveEstado,
              CodEstado: rawCodEstado,
              name: rawEstado,
              Estado: rawEstado
            }, { merge: true });
            statesCreated[stateId] = true;
          }

          // Generar ID Limpio Consecutivo por Estado (Ej: MX-AGS-001)
          const currentCount = currentZonesSizeMap[stateId] || 0;
          const nextConsecutive = currentCount + 1;
          currentZonesSizeMap[stateId] = nextConsecutive;

          const zoneId = `${stateId}-${String(nextConsecutive).padStart(3, '0')}`;
          const zoneDocRef = doc(collection(db, 'zones'), zoneId);

          // Inyección atómica a Firestore
          batch.set(zoneDocRef, {
            id: zoneId,
            countryId: rawCountryId,
            stateId: stateId,
            CveEstado: rawCveEstado,
            Pais: rawPais,
            CodEstado: rawCodEstado,
            Estado: rawEstado,
            CveMunicipio: rawCveMunicipio,
            CVEGEO: rawCVEGEO,
            Ciudad: rawCiudad,
            city: rawCiudad, // Retrocompatibilidad
            schoolsPotential: rawSchoolsPotential,
            licensesCenso: rawLicensesCenso,
            assignedTo: rawAssignedTo || 'Libre'
          });

          addedCount++;
        }
      }

      if (addedCount > 0) {
        await batch.commit();
        setLogMessage({ type: 'success', text: `¡Procesamiento exitoso! Se inyectaron ${addedCount} territorios cartográficos.` });
        setBulkInput('');
        setTimeout(() => { onClose(); }, 2000);
      } else {
        setLogMessage({ type: 'error', text: 'No se detectaron filas válidas. Revisa las 19 columnas de tu CSV.' });
      }

    } catch (error) {
      console.error('Error al importar CSV:', error);
      setLogMessage({ type: 'error', text: 'Error crítico de procesamiento. Verifica el formato de tus comas.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-2xl relative">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-950">Importador Geopolítico y Censal (CSV)</h3>
            <p className="text-xs text-slate-400">Asimilador masivo ajustado a la estructura de 19 columnas INEGI.</p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleBulkLoad} className="space-y-4 pt-4">
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            disabled={isProcessing}
            rows={10}
            className="w-full font-mono text-[10px] p-4 border border-slate-200 rounded-xl bg-slate-50 focus:outline-blue-600 resize-none"
            placeholder="CveEstado,Pais,CodEstado,Estado,CveMunicipio,CVEGEO,Ciudad,Canal,Escuelas Censo,Lic. Censo,..."
          />

          {logMessage && (
            <div className={`p-3 text-xs font-bold rounded-lg border ${
              logMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
              {logMessage.text}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBulkInput('')}
              disabled={isProcessing}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={isProcessing || !bulkInput.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Cargar CSV Geopolítico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}