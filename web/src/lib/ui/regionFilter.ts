import type { CountryCode, RegionInfo } from '../data'
import { COUNTRY_NAMES } from '../../content'

/** Países en el orden en que se agrupan los estados. */
export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'MX', label: COUNTRY_NAMES.MX },
  { code: 'US', label: COUNTRY_NAMES.US },
]

export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Filtra por nombre o clave, sin acentos ni mayúsculas; primero los que empiezan por el texto. */
export function filterRegions(regions: RegionInfo[], query: string): RegionInfo[] {
  const q = normalize(query)
  if (!q) return regions
  const hits = regions.filter(r => normalize(r.name).includes(q) || normalize(r.id).includes(q))
  const starts = (r: RegionInfo) => (normalize(r.name).startsWith(q) ? 0 : 1)
  return [...hits].sort((a, b) => starts(a) - starts(b))
}
