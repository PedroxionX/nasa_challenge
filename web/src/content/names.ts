/**
 * Nombres para mostrar de las regiones (interfaz en inglés). Archivo aparte, sin dependencias, para que
 * lib/data.ts pueda usarlo sin importar todo content/.
 */

/** US state names in English, by ISO 3166-2 id. Mexican states keep their own names. */
const REGION_NAMES: Readonly<Record<string, string>> = {
  'US-DC': 'District of Columbia', 'US-HI': 'Hawaii', 'US-LA': 'Louisiana', 'US-MI': 'Michigan',
  'US-MO': 'Missouri', 'US-MS': 'Mississippi', 'US-NC': 'North Carolina', 'US-ND': 'North Dakota',
  'US-NH': 'New Hampshire', 'US-NJ': 'New Jersey', 'US-NM': 'New Mexico', 'US-NY': 'New York',
  'US-OR': 'Oregon', 'US-PA': 'Pennsylvania', 'US-SC': 'South Carolina', 'US-SD': 'South Dakota',
  'US-WV': 'West Virginia',
  'MX-CMX': 'Mexico City', 'MX-MEX': 'State of Mexico',
}

/** Display name of a region: the English name when there is one, otherwise the name in the file. */
export const regionName = (id: string, fallback: string): string => REGION_NAMES[id] ?? fallback
