/**
 * Lectura de lo que ya trae el archivo (004). Aquí NO se calcula estadística (constitución, principio I):
 * solo se buscan filas y columnas, y se emparejan años con valores.
 */
import {
  pickWindow, variablePeriod,
  type Catalog, type SeriesFile, type TrendRow, type TrendStatus, type VariableId, type VariableInfo,
} from '../../lib/data'

/** Columnas opcionales del contrato (pedidas por 004: FR-A09, FR-A10), ya convertidas en números o `null`. */
export interface Extras {
  lineMid: number | null
  pct: { slope: number; low: number | null; high: number | null } | null
}

const num = (x: number | null | undefined) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

/** Lee `line_mid` y el % (solo con `relative_change`) de la fila; ausentes o nulos → `null`. */
export function readExtras(row: TrendRow | null, variable: VariableInfo | undefined): Extras {
  if (!row) return { lineMid: null, pct: null }
  const slopePct = variable?.relative_change ? num(row.slope_decade_pct) : null
  return {
    lineMid: num(row.line_mid),
    pct: slopePct === null ? null : { slope: slopePct, low: num(row.ci_low_pct), high: num(row.ci_high_pct) },
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

/** ¿Es el periodo completo de esta variable? (cada variable tiene el suyo: contrato revisado 2026-11-14). */
export function isFullPeriod(catalog: Catalog, variableId: VariableId, from: number, to: number): boolean {
  const { firstYear, lastYear } = variablePeriod(catalog, variableId)
  return from === firstYear && to === lastYear
}

/**
 * Años que ofrece cada lista del control de periodo (FR-A06), dentro del periodo de la variable:
 * solo combinaciones de al menos `min_window_years`. Si el periodo actual vino de la URL y es más corto,
 * su año se incluye para que la lista refleje el estado; cualquier cambio desde el control ya es válido.
 */
export function periodOptions(
  catalog: Catalog, variableId: VariableId, from: number, to: number,
): { starts: number[]; ends: number[] } {
  const { firstYear: first, lastYear: last } = variablePeriod(catalog, variableId)
  const min = catalog.period.min_window_years
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
