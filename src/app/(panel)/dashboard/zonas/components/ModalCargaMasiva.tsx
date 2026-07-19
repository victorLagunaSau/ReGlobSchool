'use client';

import React, { useState } from 'react';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { X, ShieldAlert, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ModalCargaMasivaProps {
  isOpen: boolean;
  onClose: () => void;
  states: Array<{ id: string; countryId: string; name: string }>;
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
      const zonesSnapshot = await getDocs(collection(db, 'zones'));
      zonesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const key = `${data.stateId}-${data.channel}`;
        currentZonesSizeMap[key] = (currentZonesSizeMap[key] || 0) + 1;
      });

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Omitimos la primera línea si parece encabezado (contiene la palabra clave "País")
        if (!line || line.toLowerCase().includes('país')) continue;

        // Separación por Coma (CSV)
        const columns = line.split(',');

        if (columns.length >= 12) {
          const rawCountryId = columns[0].trim().toUpperCase();
          const rawCountryName = columns[1].trim();
          const rawStateCode = columns[2].trim().toUpperCase();
          const rawStateName = columns[3].trim();
          const rawCity = columns[4].trim();
          const rawChannel = columns[5].trim().toUpperCase();

          const rawSchoolsPotential = parseInt(columns[6].trim(), 10) || 0;
          const rawLicensesCenso = parseInt(columns[7].trim(), 10) || 0;
          const rawUneMinLimit = parseInt(columns[8].trim(), 10) || 0;
          const rawUneLicenses = parseInt(columns[9].trim(), 10) || 0;

          const rawPrice = parseFloat(columns[10].trim()) || 450;
          const rawCommission = parseFloat(columns[11].trim().replace('%', '')) || 30;

          const stateId = `${rawCountryId}-${rawStateCode}`;

          if (!countriesCreated[rawCountryId]) {
            batch.set(doc(db, 'countries', rawCountryId), { id: rawCountryId, name: rawCountryName });
            countriesCreated[rawCountryId] = true;
          }

          if (!statesCreated[stateId]) {
            batch.set(doc(db, 'states', stateId), { id: stateId, countryId: rawCountryId, name: rawStateName });
            statesCreated[stateId] = true;
          }

          const sizeKey = `${stateId}-${rawChannel}`;
          const currentCount = currentZonesSizeMap[sizeKey] || 0;
          const nextConsecutive = currentCount + 1;
          currentZonesSizeMap[sizeKey] = nextConsecutive;

          const zoneId = `${stateId}-${rawChannel}-${String(nextConsecutive).padStart(3, '0')}`;

          batch.set(doc(collection(db, 'zones'), zoneId), {
            id: zoneId,
            countryId: rawCountryId,
            stateId: stateId,
            city: rawCity,
            channel: rawChannel,
            schoolsPotential: rawSchoolsPotential,
            licensesCenso: rawLicensesCenso,
            uneMinLimit: rawUneMinLimit,
            uneLicenses: rawUneLicenses,
            averageLicensePrice: rawPrice,
            commissionPercentage: rawCommission,
            licensesSold: 0,
            schoolsOccupied: 0,
            assignedTo: 'Libre'
          });

          addedCount++;
        }
      }

      await batch.commit();
      setLogMessage({ type: 'success', text: `¡Procesamiento CSV finalizado! ${addedCount} territorios agregados.` });
      setBulkInput('');
      setTimeout(() => { onClose(); }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setLogMessage({ type: 'error', text: 'Error en el formato del CSV. Revisa tus comas.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-2xl relative">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-950">Importador de Territorios (CSV)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleBulkLoad} className="space-y-4 pt-4">
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={10}
            className="w-full font-mono text-[10px] p-4 border border-slate-200 rounded-xl bg-slate-50 focus:outline-blue-600"
            placeholder="CodEstado,Pais,CodEstado,Estado,Ciudad,Canal,Escuelas Censo,Lic. Censo,Mínimo UNE,Licencias UNE,Valor comercial,Comision"
          />
          {logMessage && <div className="p-3 text-xs font-bold rounded-lg bg-blue-50 text-blue-800">{logMessage.text}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={isProcessing} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
              {isProcessing ? 'Procesando...' : 'Cargar CSV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}