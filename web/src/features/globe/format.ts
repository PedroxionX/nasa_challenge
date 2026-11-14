/** Formato de cifras y ordenación de la tabla de regiones (005 T005). */

const signed = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' })
const plain = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
const minus = (s: string) => s.replace('-', '−')

/** Pendiente con signo y dos decimales: «+0,25», «−0,10», «0,00». */
export const formatSlope = (v: number) => minus(signed.format(v))
/** Corte de la leyenda, sin signo positivo: «−0,4», «0,1». */
export const formatBreak = (v: number) => minus(plain.format(v))

export interface RegionRow {
  id: string
  name: string
  country: string
  /** Pendiente por década, o `null` si no hay datos. */
  value: number | null
  /** Etiqueta de la clase («Sube», «Baja mucho»…), o `null` si no hay datos. */
  label: string | null
}

export type SortKey = 'name' | 'value'

/** Ordena sin mutar. Las regiones sin datos van siempre al final. */
export function sortRows(rows: RegionRow[], key: SortKey, dir: 1 | -1): RegionRow[] {
  const byName = (a: RegionRow, b: RegionRow) => a.name.localeCompare(b.name, 'es')
  return [...rows].sort((a, b) => {
    if (key === 'name') return dir * byName(a, b)
    if (a.value === null && b.value === null) return byName(a, b)
    if (a.value === null) return 1
    if (b.value === null) return -1
    return dir * (a.value - b.value) || byName(a, b)
  })
}
