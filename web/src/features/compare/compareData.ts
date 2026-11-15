/**
 * Lectura de lo que ya traen los archivos (007). Aquí NO se calcula estadística (constitución, principio I):
 * solo se buscan filas, se emparejan años con valores y se elige entre opciones publicadas.
 */
import {
  pickWindow, type RegionInfo, type SeriesFile, type TrendRow, type TrendStatus, type VariableInfo,
} from '../../lib/data'

/** Estados individuales con cifras de tendencia que se pueden mostrar (mismo criterio que 004, FR-A05). */
export const HAS_TREND: ReadonlySet<TrendStatus> = new Set(['increasing', 'decreasing', 'inconclusive'])

const num = (x: number | null | undefined) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

export interface Individual {
  row: TrendRow | null
  /** Sin fila para el periodo (más corto que el mínimo o fuera de la serie) = datos insuficientes. */
  status: TrendStatus
  /** Cambio relativo ya calculado por el pipeline; solo en variables con `relative_change`. */
  pct: { slope: number; low: number | null; high: number | null } | null
}

/** Resultado individual de una región en el periodo: la fila de `windows` de su serie, tal cual. */
export function individual(series: SeriesFile, variable: VariableInfo | undefined, from: number, to: number): Individual {
  const row = pickWindow(series, from, to)
  const slopePct = row && variable?.relative_change ? num(row.slope_decade_pct) : null
  return {
    row,
    status: row?.status ?? 'insufficient',
    pct: slopePct === null || !row ? null : { slope: slopePct, low: num(row.ci_low_pct), high: num(row.ci_high_pct) },
  }
}

export interface YearPoint { year: number; value: number }

/** Empareja `years` con `values` (listas paralelas del contrato). */
export const yearPoints = (series: SeriesFile): YearPoint[] =>
  series.years.map((year, i) => ({ year, value: series.values[i] })).filter(p => Number.isFinite(p.value))

/**
 * Año inicial publicado más próximo al elegido, para ofrecer un periodo que sí tiene prueba de la diferencia.
 * Elige entre los años que trae el archivo; no produce ninguna cifra nueva.
 */
export function nearestStart(starts: number[], from: number): number | null {
  if (starts.length === 0) return null
  return starts.reduce((best, s) => (Math.abs(s - from) < Math.abs(best - from) ? s : best), starts[0])
}

/** Extremos de la recta de Sen en la ventana, trazados desde `line_mid` (igual que 004, FR-A10). `null` sin ella. */
export function senSegment(row: TrendRow | null): [YearPoint, YearPoint] | null {
  if (!row || !HAS_TREND.has(row.status)) return null
  const mid = num(row.line_mid)
  const slope = num(row.slope_decade)
  if (mid === null || slope === null) return null
  const center = (row.start + row.end) / 2
  const at = (year: number) => ({ year, value: mid + (slope / 10) * (year - center) })
  return [at(row.start), at(row.end)]
}

/** Id fijo de la lista de la entrada: la vista de comparación le devuelve el foco al cerrarse. */
export const ENTRY_SELECT_ID = 'compare-region'

const COUNTRY_NAMES: Record<string, string> = { MX: 'Mexico', US: 'United States' }

/** Regiones agrupadas por país y ordenadas por nombre; sin la principal. */
export function groupRegions(regions: RegionInfo[], exclude: string | null): [country: string, regions: RegionInfo[]][] {
  const groups = new Map<string, RegionInfo[]>()
  for (const r of regions) {
    if (r.id === exclude) continue
    const list = groups.get(r.country) ?? []
    list.push(r)
    groups.set(r.country, list)
  }
  return [...groups.entries()].map(([country, list]) => [
    COUNTRY_NAMES[country] ?? country,
    list.sort((a, b) => a.name.localeCompare(b.name, 'en')),
  ])
}
