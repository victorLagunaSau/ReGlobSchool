// Parser genérico de CSV para cargas masivas de leads (ej. exportes del
// DENUE de INEGI). No asume un único formato de columnas: normaliza los
// encabezados (minúsculas, sin acentos) y reconoce varios alias por campo,
// para aceptar tanto el CSV nativo del DENUE como uno hecho a mano.

export interface ParsedLeadRow {
  business_name: string;
  business_type: string;
  phone: string;
  email: string;
  address: string;
  municipality_code: string;
}

const HEADER_ALIASES: Record<keyof ParsedLeadRow, string[]> = {
  business_name: ['nombre', 'nombre_negocio', 'razon_social', 'business_name', 'empresa'],
  business_type: ['giro', 'giro_nombre', 'nombre_act', 'business_type', 'actividad'],
  phone: ['telefono', 'phone', 'tel'],
  email: ['correoelec', 'correo', 'email', 'correo_electronico'],
  address: ['direccion', 'address', 'ubicacion'],
  municipality_code: ['cvegeo', 'municipality_code', 'clave_municipio', 'cve_mun'],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}

// Parser RFC4180 mínimo: soporta campos entre comillas con comas y comillas
// escapadas (""), que es lo que rompe un split(',') ingenuo en direcciones.
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export function parseLeadsCsv(text: string): ParsedLeadRow[] {
  const lines = parseCsvLines(text);
  if (lines.length === 0) return [];

  const headers = lines[0].map(normalizeHeader);
  const columnIndex: Partial<Record<keyof ParsedLeadRow, number>> = {};

  (Object.keys(HEADER_ALIASES) as (keyof ParsedLeadRow)[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    const idx = headers.findIndex((h) => aliases.includes(h));
    if (idx !== -1) columnIndex[field] = idx;
  });

  return lines.slice(1).map((cells) => ({
    business_name: (columnIndex.business_name != null ? cells[columnIndex.business_name] : '') || '',
    business_type: (columnIndex.business_type != null ? cells[columnIndex.business_type] : '') || '',
    phone: (columnIndex.phone != null ? cells[columnIndex.phone] : '') || '',
    email: (columnIndex.email != null ? cells[columnIndex.email] : '') || '',
    address: (columnIndex.address != null ? cells[columnIndex.address] : '') || '',
    municipality_code: (columnIndex.municipality_code != null ? cells[columnIndex.municipality_code] : '') || '',
  })).map((row) => ({
    business_name: row.business_name.trim(),
    business_type: row.business_type.trim(),
    phone: row.phone.trim(),
    email: row.email.trim(),
    address: row.address.trim(),
    municipality_code: row.municipality_code.trim(),
  }));
}
