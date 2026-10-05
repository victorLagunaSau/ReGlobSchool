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
  website: string;
  municipality_code: string;
  city: string;
  state_name: string;
  notes: string;  // comentario(s) que se guardan como primera nota del lead
  affinity: string;
  public_source: string;
  contact_name: string;
}

type SingleField = Exclude<keyof ParsedLeadRow, 'notes'>;

const HEADER_ALIASES: Record<SingleField, string[]> = {
  business_name: ['nombre', 'nombre_negocio', 'razon_social', 'business_name', 'empresa', 'nom_estab'],
  business_type: ['giro', 'giro_nombre', 'nombre_act', 'business_type', 'actividad', 'categoria'],
  phone: ['telefono', 'phone', 'tel'],
  email: ['correoelec', 'correo', 'email', 'correo_electronico'],
  address: ['direccion', 'address', 'ubicacion'],
  website: ['sitioweb_o_redsocial', 'sitio_web', 'sitioweb', 'website', 'www', 'web', 'red_social'],
  municipality_code: ['cvegeo', 'municipality_code', 'clave_municipio', 'cve_mun'],
  city: ['ciudad', 'municipio', 'city', 'localidad'],
  state_name: ['estado', 'entidad', 'entidad_federativa', 'state'],
  affinity: ['afinidad', 'affinity'],
  public_source: ['fuente_publica', 'fuente'],
  contact_name: ['responsable', 'contacto', 'contact_name'],
};

// Todas las columnas que coincidan se concatenan en la nota inicial.
const NOTE_ALIASES = ['razon_compatibilidad', 'comentarios', 'comentario', 'notas', 'nota', 'observaciones', 'notes'];

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
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
  const columnIndex: Partial<Record<SingleField, number>> = {};

  (Object.keys(HEADER_ALIASES) as SingleField[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    const idx = headers.findIndex((h) => aliases.includes(h));
    if (idx !== -1) columnIndex[field] = idx;
  });

  const noteIndexes = headers
    .map((h, i) => (NOTE_ALIASES.includes(h) ? i : -1))
    .filter((i) => i !== -1);

  const cell = (cells: string[], idx: number | undefined) => (idx != null ? cells[idx] || '' : '').trim();

  return lines.slice(1).map((cells) => ({
    business_name: cell(cells, columnIndex.business_name),
    business_type: cell(cells, columnIndex.business_type),
    phone: cell(cells, columnIndex.phone),
    email: cell(cells, columnIndex.email),
    address: cell(cells, columnIndex.address),
    website: cell(cells, columnIndex.website),
    municipality_code: cell(cells, columnIndex.municipality_code),
    city: cell(cells, columnIndex.city),
    state_name: cell(cells, columnIndex.state_name),
    notes: noteIndexes.map((i) => cell(cells, i)).filter(Boolean).join('\n\n'),
    affinity: cell(cells, columnIndex.affinity),
    public_source: cell(cells, columnIndex.public_source),
    contact_name: cell(cells, columnIndex.contact_name),
  }));
}

// Normaliza un nombre de lugar para compararlo (minúsculas, sin acentos).
export function normalizePlace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
