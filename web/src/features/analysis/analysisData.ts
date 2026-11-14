/**
 * Lectura de lo que ya trae el archivo (004). Aquí NO se calcula estadística (constitución, principio I):
 * solo se buscan filas y columnas, y se emparejan años con valores.
 */
import { pickWindow, type Catalog, type SeriesFile, type TrendRow, type TrendStatus, type VariableInfo } from '../../lib/data'

/** Columnas opcionales que 004 pidió añadir al contrato (FR-A09, FR-A10). Pueden no existir. */
export type ExtraColumn = 'line_mid' | 'slope_decade_pct' | 'ci_low_pct' | 'ci_high_pct'

/** Lee una columna opcional de la fila `start`–`end`; `null` si la columna o la fila no existen. */
export function extraColumn(series: SeriesFile, start: number, end: number, name: ExtraColumn): number | null {
  const { columns, rows } = series.windows
  const col = columns.indexOf(name)
  if (col < 0) return null
  const iStart = columns.indexOf('start')
  const iEnd = columns.indexOf('end')
  const row = rows.find(r => r[iStart] === start && r[iEnd] === end)
  const value = row?.[col]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export interface Extras {
  lineMid: number | null
  pct: { slope: number; low: number | null; high: number | null } | null
}

export function readExtras(series: SeriesFile, row: TrendRow | null, variable: VariableInfo | undefined): Extras {
  if (!row) return { lineMid: null, pct: null }
  const lineMid = extraColumn(series, row.start, row.end, 'line_mid')
  const slopePct = variable?.relative_change ? extraColumn(series, row.start, row.end, 'slope_decade_pct') : null
  return {
    lineMid,
    pct: slopePct === null ? null : {
      slope: slopePct,
      low: extraColumn(series, row.start, row.end, 'ci_low_pct'),
      high: extraColumn(series, row.start, row.end, 'ci_high_pct'),
    },
  }
}

export interface YearPoint { year: number; value: number }

/** Empareja `years` con `values` (listas paralelas del contrato). */
export const yearPoints = (series: SeriesFile): YearPoint[] =>
  series.years.map((year, i) => ({ year, value: series.values[i] })).filter(p => Number.isFinite(p.value))

/** Estados con cifras de tendencia que se pueden mostrar (FR-A05). */
export const HAS_TREND: ReadonlySet<TrendStatus> = new Set(['increasing', 'decreasing', 'inconclusive'])

/** «Hay evidencia de tendencia» / «Sin evidencia suficiente» según `status` (FR-A05); `null` si no aplica. */
export function evidenceLabel(status: TrendStatus): string | null {
  if (status === 'increasing' || status === 'decreasing') return 'Hay evidencia de tendencia'
  if (status === 'inconclusive') return 'Sin evidencia suficiente'
  return null
}

export const isFullPeriod = (catalog: Catalog, from: number, to: number) =>
  from === catalog.period.first_year && to === catalog.period.last_complete_year

/**
 * Años que ofrece cada lista del control de periodo (FR-A06): solo combinaciones de al menos
 * `min_window_years`. Si el periodo actual vino de la URL y es más corto, su año se incluye para que
 * la lista refleje el estado; cualquier cambio desde el control ya produce un periodo válido.
 */
export function periodOptions(catalog: Catalog, from: number, to: number): { starts: number[]; ends: number[] } {
  const { first_year: first, last_complete_year: last, min_window_years: min } = catalog.period
  const range = (a: number, b: number) => (a > b ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i))
  const starts = range(first, Math.max(to - (min - 1), Math.min(from, last)))
  const ends = range(Math.min(from + (min - 1), Math.max(to, first)), last)
  return { starts, ends }
}

/** Filas de `windows` con el año final `end`, ordenadas por año inicial (vista de variación, FR-A07). */
export function windowsEndingAt(series: SeriesFile, end: number): TrendRow[] {
  const { columns, rows } = series.windows
  const iStart = columns.indexOf('start')
  const iEnd = columns.indexOf('end')
  return rows
    .filter(r => r[iEnd] === end)
    .map(r => pickWindow(series, r[iStart] as number, end))
    .filter((r): r is TrendRow => r !== null)
    .sort((a, b) => a.start - b.start)
}

/** Decimales para mostrar según la unidad: °C con 2, cantidades grandes (mm) con 1. */
export const digitsFor = (unit: string) => (unit.includes('°') ? 2 : 1)
