/** Lógica pura del buscador (004 T001), separada del componente para probarla sola. */
import type { CountryCode, RegionInfo } from '../../lib/data'

/** Id estable del campo: el panel (004 T006) le devuelve el foco al cerrarse con Escape. */
export const REGION_SEARCH_ID = 'region-search'

export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'MX', label: 'México' },
  { code: 'US', label: 'Estados Unidos' },
]

export const NO_MATCH = 'No hay ningún estado con ese nombre. Prueba con otro o tócalo en el globo.'

/** Minúsculas y sin acentos: «Nuevo León» ≈ «nuevo leon». */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Filtra por nombre o por clave (BCN, MX-BCN); primero los que empiezan por el texto. */
export function filterRegions(regions: RegionInfo[], query: string): RegionInfo[] {
  const q = normalize(query)
  if (!q) return regions
  const hits = regions.filter(r => normalize(r.name).includes(q) || normalize(r.id).includes(q))
  const starts = (r: RegionInfo) => (normalize(r.name).startsWith(q) ? 0 : 1)
  return [...hits].sort((a, b) => starts(a) - starts(b))
}
