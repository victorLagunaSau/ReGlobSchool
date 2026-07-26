'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../../lib/supabase/client';
import { X, Loader2, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseLeadsCsv, type ParsedLeadRow } from '../../../../../lib/denue-parser';
import type { ZoneRow } from '../page';

interface ImportCSVProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ZoneRow[];
  onImported: () => void;
}

interface PreviewRow extends ParsedLeadRow {
  zone: ZoneRow | null;
  error: string | null;
}

export default function ImportCSV({ isOpen, onClose, zones, onImported }: ImportCSVProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  if (!isOpen) return null;

  const buildPreview = (parsed: ParsedLeadRow[]): PreviewRow[] => {
    return parsed.map((row) => {
      const zone = row.municipality_code
        ? zones.find((z) => z.cvegeo.trim() === row.municipality_code.trim()) || null
        : null;

      let error: string | null = null;
      if (!row.business_name) error = 'Falta nombre del negocio';
      else if (!row.business_type) error = 'Falta giro';

      return { ...row, zone, error };
    });
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const parsed = parseLeadsCsv(text);
    setRows(buildPreview(parsed));
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

      const stagingRows = rows.map((r) => ({
        upload_batch_id: batchId,
        business_name: r.business_name,
        business_type: r.business_type || null,
        phone: r.phone || null,
        email: r.email || null,
        address: r.address || null,
        municipality_code: r.municipality_code || null,
        status: r.error ? 'error' : r.zone ? 'mapped' : 'pending',
        error_message: r.error,
        zone_id: r.zone?.id || null,
      }));

      const { data: insertedStaging, error: stagingError } = await supabase
        .from('lead_imports')
        .insert(stagingRows)
        .select('id, business_name, business_type, phone, email, address, municipality_code, zone_id, status');

      if (stagingError) throw stagingError;

      const importableRows = (insertedStaging || []).filter((r) => r.status !== 'error');

      let importedCount = 0;
      for (const staged of importableRows) {
        const zone = zones.find((z) => z.id === staged.zone_id);
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            business_name: staged.business_name,
            business_type: staged.business_type || 'Sin clasificar',
            phone: staged.phone,
            email: staged.email,
            address: staged.address,
            municipality_code: staged.municipality_code,
            zone_id: zone?.id || null,
            state_id: zone?.state_id || null,
            country_id: zone?.country_id || null,
            source: 'csv',
          })
          .select('id')
          .single();

        if (!leadError && newLead) {
          await supabase.from('lead_imports').update({ status: 'imported', lead_id: newLead.id }).eq('id', staged.id);
          await supabase.from('lead_tasks').insert({
            lead_id: newLead.id,
            task_type: 'contacto_inicial',
            channel: 'ambos',
            description: 'Contacto inicial',
            scheduled_for: new Date().toISOString(),
            status: 'pendiente',
          });
          importedCount++;
        }
      }

      setResult({ imported: importedCount, skipped: rows.length - importedCount });
      onImported();
    } catch (error) {
      console.error('Error al importar CSV de leads:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-3xl relative flex flex-col max-h-[95vh] overflow-y-auto animate-fade-in-up">

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-950 tracking-tight">Importar Leads desde CSV</h2>
            <p className="text-[11px] text-slate-400">Acepta exportes del DENUE u otro CSV con columnas nombre/giro/telefono/correo/direccion/cvegeo.</p>
          </div>
          <button onClick={handleClose} disabled={isImporting} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {rows.length === 0 ? (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-10 cursor-pointer hover:bg-slate-50 transition-colors">
            <UploadCloud size={28} className="text-slate-300" />
            <span className="text-xs font-semibold text-slate-500">Selecciona un archivo .csv para continuar</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileInput} className="hidden" />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">{fileName}</span>
              <button onClick={handleReset} className="text-blue-600 hover:underline font-semibold">Elegir otro archivo</button>
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
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Negocio</th>
                      <th className="py-2 px-3">Giro</th>
                      <th className="py-2 px-3">Zona</th>
                      <th className="py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.error ? 'bg-rose-50/40' : ''}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.business_name || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{row.business_type || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{row.zone ? row.zone.city : row.municipality_code ? 'Sin coincidencia' : '—'}</td>
                        <td className="py-2 px-3">
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
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
          <button type="button" onClick={handleClose} disabled={isImporting} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
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
    </div>
  );
}
