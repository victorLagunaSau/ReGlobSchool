'use client';

import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { Loader2, UploadCloud, CheckCircle2, AlertCircle, MessageSquareText } from 'lucide-react';
import { parseLeadsCsv, normalizePlace, type ParsedLeadRow } from '@/src/lib/denue-parser';
import { saveInitialNote } from '../utils/initialNote';
import type { StateRow, ZoneRow } from '../page';

interface ImportCSVProps {
  states: StateRow[];
  statusClave: string;
  onClose: () => void;
  onImported: () => void;
}

interface PreviewRow extends ParsedLeadRow {
  state: StateRow | null;
  zone: ZoneRow | null;
  error: string | null;
}

// "Veracruz" debe coincidir con "Veracruz de Ignacio de la Llave".
function findState(name: string, states: StateRow[]): StateRow | null {
  const target = normalizePlace(name);
  if (!target) return null;
  return (
    states.find((s) => normalizePlace(s.name) === target) ||
    states.find((s) => normalizePlace(s.name).startsWith(`${target} `)) ||
    null
  );
}

// "Veracruz puerto" debe coincidir con la zona "Veracruz"; se prefiere la
// coincidencia exacta y, si no, el nombre de zona más largo contenido.
function findZone(city: string, zones: ZoneRow[]): ZoneRow | null {
  const target = normalizePlace(city);
  if (!target) return null;
  const exact = zones.find((z) => normalizePlace(z.city) === target);
  if (exact) return exact;
  const partial = zones
    .filter((z) => {
      const zc = normalizePlace(z.city);
      return zc && (target.startsWith(`${zc} `) || zc.startsWith(`${target} `));
    })
    .sort((a, b) => b.city.length - a.city.length);
  return partial[0] || null;
}

export default function ImportCSV({ states, statusClave, onClose, onImported }: ImportCSVProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const buildPreview = async (parsed: ParsedLeadRow[]): Promise<PreviewRow[]> => {
    // Estado: por nombre, o por los 2 primeros dígitos del CVEGEO (DENUE).
    const withState = parsed.map((row) => {
      let state = findState(row.state_name, states);
      if (!state && row.municipality_code.length >= 2) {
        const cve = Number(row.municipality_code.slice(0, 2));
        state = states.find((s) => s.cve_estado === cve) || null;
      }
      return { row, state };
    });

    // Las zonas se consultan por estado: el listado global viene truncado a
    // 1000 filas y no alcanza para cubrir todos los municipios.
    const stateIds = [...new Set(withState.map((r) => r.state?.id).filter(Boolean))] as string[];
    const zonesByState: Record<string, ZoneRow[]> = {};
    await Promise.all(
      stateIds.map(async (stateId) => {
        const { data } = await supabase
          .from('zones')
          .select('id, country_id, state_id, cve_municipio, cvegeo, city')
          .eq('state_id', stateId);
        zonesByState[stateId] = (data as ZoneRow[]) || [];
      }),
    );

    return withState.map(({ row, state }) => {
      const stateZones = state ? zonesByState[state.id] || [] : [];
      const zone =
        (row.municipality_code && stateZones.find((z) => z.cvegeo?.trim() === row.municipality_code)) ||
        findZone(row.city, stateZones);

      let error: string | null = null;
      if (!row.business_name) error = 'Falta nombre del negocio';
      else if (!row.business_type) error = 'Falta giro';

      return { ...row, state, zone: zone || null, error };
    });
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setIsParsing(true);
    try {
      const text = await file.text();
      setRows(await buildPreview(parseLeadsCsv(text)));
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  const handleReset = () => {
    setFileName('');
    setRows([]);
    setResult(null);
  };

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);

    try {
      const batchId = crypto.randomUUID();

      const { data: insertedStaging, error: stagingError } = await supabase
        .from('lead_imports')
        .insert(rows.map((r) => ({
          upload_batch_id: batchId,
          business_name: r.business_name,
          business_type: r.business_type || null,
          phone: r.phone || null,
          email: r.email || null,
          address: r.address || null,
          municipality_code: r.municipality_code || r.zone?.cvegeo || null,
          status: r.error ? 'error' : r.zone ? 'mapped' : 'pending',
          error_message: r.error,
          zone_id: r.zone?.id || null,
        })))
        .select('id');

      if (stagingError) throw stagingError;

      let importedCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.error) continue;

        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            business_name: row.business_name,
            business_type: row.business_type,
            phone: row.phone || null,
            email: row.email || null,
            address: row.address || null,
            website: row.website || null,
            municipality_code: row.municipality_code || row.zone?.cvegeo || null,
            zone_id: row.zone?.id || null,
            state_id: row.state?.id || null,
            country_id: row.state?.country_id || null,
            status: statusClave,
            source: 'csv',
          })
          .select('id')
          .single();

        if (leadError || !newLead) {
          console.error(`Error al importar "${row.business_name}":`, leadError);
          continue;
        }

        const stagingId = insertedStaging?.[i]?.id;
        if (stagingId) {
          await supabase.from('lead_imports').update({ status: 'imported', lead_id: newLead.id }).eq('id', stagingId);
        }
        await supabase.from('lead_tasks').insert({
          lead_id: newLead.id,
          task_type: 'contacto_inicial',
          channel: 'ambos',
          description: 'Contacto inicial',
          scheduled_for: new Date().toISOString(),
          status: 'pendiente',
        });
        await saveInitialNote(newLead.id, row.notes, {
          origen: 'csv',
          archivo: fileName,
          afinidad: row.affinity || null,
          fuente: row.public_source || null,
          responsable: row.contact_name || null,
          ciudad: row.city || null,
        });
        importedCount++;
      }

      setResult({ imported: importedCount, skipped: rows.length - importedCount });
      onImported();
    } catch (error) {
      console.error('Error al importar CSV de leads:', error);
      alert('No se pudo completar la importación. Revisa la consola para más detalle.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-10 cursor-pointer hover:bg-slate-50 transition-colors">
          {isParsing ? <Loader2 size={28} className="text-slate-300 animate-spin" /> : <UploadCloud size={28} className="text-slate-300" />}
          <span className="text-xs font-semibold text-slate-500">
            {isParsing ? 'Leyendo archivo…' : 'Selecciona un archivo .csv para continuar'}
          </span>
          <span className="text-[10px] text-slate-400 text-center max-w-md">
            Columnas reconocidas: Empresa/Nombre, Categoria/Giro, Telefono, Correo, Direccion, SitioWeb, Ciudad, Estado, CVEGEO y
            Razon_Compatibilidad/Notas/Comentarios (se guardan como primera nota).
          </span>
          <input type="file" accept=".csv,text/csv" onChange={handleFileInput} disabled={isParsing} className="hidden" />
        </label>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">{fileName}</span>
            {!result && (
              <button onClick={handleReset} disabled={isImporting} className="text-blue-600 hover:underline font-semibold">Elegir otro archivo</button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-[9px] font-bold uppercase text-slate-400">Filas Totales</p>
              <p className="text-sm font-black text-slate-800">{rows.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-[9px] font-bold uppercase text-emerald-500">Válidas</p>
              <p className="text-sm font-black text-emerald-700">{validRows.length}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 text-center">
              <p className="text-[9px] font-bold uppercase text-rose-400">Con Errores</p>
              <p className="text-sm font-black text-rose-700">{errorRows.length}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Negocio</th>
                    <th className="py-2 px-3">Giro</th>
                    <th className="py-2 px-3">Ubicación</th>
                    <th className="py-2 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, i) => (
                    <tr key={i} className={row.error ? 'bg-rose-50/40' : ''}>
                      <td className="py-2 px-3 align-top">
                        <p className="font-semibold text-slate-800">{row.business_name || '—'}</p>
                        {row.notes && (
                          <p className="mt-0.5 flex items-start gap-1 text-[10px] text-slate-400 line-clamp-2" title={row.notes}>
                            <MessageSquareText size={10} className="flex-shrink-0 mt-0.5" /> {row.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top text-slate-600">{row.business_type || '—'}</td>
                      <td className="py-2 px-3 align-top text-slate-600">
                        {row.zone ? (
                          `${row.zone.city}, ${row.state?.name}`
                        ) : row.state ? (
                          <span>{row.state.name} <span className="text-amber-600">· sin zona{row.city ? ` (${row.city})` : ''}</span></span>
                        ) : row.state_name || row.city || row.municipality_code ? (
                          <span className="text-amber-600">Sin coincidencia</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {row.error ? (
                          <span className="flex items-center gap-1 text-rose-600 font-semibold"><AlertCircle size={11} /> {row.error}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 size={11} /> Lista</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-bold text-emerald-800">
              Importación completa: {result.imported} leads creados, {result.skipped} filas omitidas.
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <button type="button" onClick={onClose} disabled={isImporting} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
          {result ? 'Cerrar' : 'Cancelar'}
        </button>
        {rows.length > 0 && !result && (
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isImporting || validRows.length === 0}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : `Importar ${validRows.length} Leads`}
          </button>
        )}
      </div>
    </div>
  );
}
