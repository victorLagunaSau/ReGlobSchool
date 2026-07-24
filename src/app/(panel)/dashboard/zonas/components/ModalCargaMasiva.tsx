'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { X, Loader2 } from 'lucide-react';

interface ModalCargaMasivaProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ModalCargaMasiva({ isOpen, onClose, onImported }: ModalCargaMasivaProps) {
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

    const countriesMap = new Map<string, { id: string; name: string }>();
    const statesMap = new Map<string, { id: string; country_id: string; cve_estado: number; cod_estado: string; name: string }>();
    const zoneRows: Array<{
      id: string;
      country_id: string;
      state_id: string;
      cve_municipio: number;
      cvegeo: string;
      city: string;
      assigned_to: string;
      schools_potential: number;
      licenses_censo: number;
    }> = [];

    try {
      // 1. Mapeo de consecución limpia por estado, a partir de lo que ya existe en Supabase
      const { data: existingZones, error: zonesError } = await supabase.from('zones').select('state_id');
      if (zonesError) throw zonesError;

      const currentZonesSizeMap: Record<string, number> = {};
      (existingZones || []).forEach((z) => {
        if (z.state_id) {
          currentZonesSizeMap[z.state_id] = (currentZonesSizeMap[z.state_id] || 0) + 1;
        }
      });

      // 2. Procesamiento de líneas CSV
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Omitir líneas vacías o la cabecera del archivo
        if (!line || line.toLowerCase().includes('cveestado') || line.toLowerCase().includes('país')) continue;

        // Soporte para separación por coma o por tabulación
        const columns = line.includes('\t') ? line.split('\t') : line.split(',');

        if (columns.length >= 11) {
          const rawCveEstado = parseInt(columns[0].trim(), 10) || 0;
          const rawPais = columns[1].trim();
          const rawCodEstado = columns[2].trim().toUpperCase();
          const rawEstado = columns[3].trim();
          const rawCveMunicipio = parseInt(columns[4].trim(), 10) || 0;
          const rawCVEGEO = columns[5].trim();
          const rawCiudad = columns[6].trim();
          const rawAssignedTo = columns[7].trim();
          const rawCountryId = columns[8].trim().toUpperCase();

          // Métricas de Censo
          const rawSchoolsPotential = parseInt(columns[9].trim(), 10) || 0;
          const rawLicensesCenso = parseInt(columns[10].trim(), 10) || 0;

          const stateId = `${rawCountryId}-${rawCodEstado}`;

          // Autocreación/Aseguramiento de Catálogos Padre (deduplicado en memoria)
          if (!countriesMap.has(rawCountryId)) {
            countriesMap.set(rawCountryId, { id: rawCountryId, name: rawPais });
          }
          if (!statesMap.has(stateId)) {
            statesMap.set(stateId, {
              id: stateId,
              country_id: rawCountryId,
              cve_estado: rawCveEstado,
              cod_estado: rawCodEstado,
              name: rawEstado,
            });
          }

          // Generar ID Limpio Consecutivo por Estado (Ej: MX-AGS-001)
          const currentCount = currentZonesSizeMap[stateId] || 0;
          const nextConsecutive = currentCount + 1;
          currentZonesSizeMap[stateId] = nextConsecutive;

          const zoneId = `${stateId}-${String(nextConsecutive).padStart(3, '0')}`;

          zoneRows.push({
            id: zoneId,
            country_id: rawCountryId,
            state_id: stateId,
            cve_municipio: rawCveMunicipio,
            cvegeo: rawCVEGEO,
            city: rawCiudad,
            schools_potential: rawSchoolsPotential,
            licenses_censo: rawLicensesCenso,
            assigned_to: rawAssignedTo || 'Libre',
          });
        }
      }

      if (zoneRows.length > 0) {
        // 3. Aseguramos catálogos padre primero (países y estados referenciados por FK)
        if (countriesMap.size > 0) {
          const { error } = await supabase.from('countries').upsert(Array.from(countriesMap.values()), { onConflict: 'id' });
          if (error) throw error;
        }
        if (statesMap.size > 0) {
          const { error } = await supabase.from('states').upsert(Array.from(statesMap.values()), { onConflict: 'id' });
          if (error) throw error;
        }

        // 4. Inyección de las zonas
        const { error: insertError } = await supabase.from('zones').insert(zoneRows);
        if (insertError) throw insertError;

        setLogMessage({ type: 'success', text: `¡Procesamiento exitoso! Se inyectaron ${zoneRows.length} territorios cartográficos.` });
        setBulkInput('');
        onImported();
        setTimeout(() => { onClose(); }, 2000);
      } else {
        setLogMessage({ type: 'error', text: 'No se detectaron filas válidas. Revisa las 11 columnas de tu CSV.' });
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
            <p className="text-xs text-slate-400">Asimilador masivo: CveEstado, Pais, CodEstado, Estado, CveMunicipio, CVEGEO, Ciudad, Asignado, CountryId, Escuelas Censo, Lic. Censo.</p>
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
            placeholder="CveEstado,Pais,CodEstado,Estado,CveMunicipio,CVEGEO,Ciudad,Asignado,CountryId,Escuelas Censo,Lic. Censo"
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
