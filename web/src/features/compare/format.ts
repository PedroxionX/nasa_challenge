/**
 * Formato de cifras de la comparación (007 FR-K09): el mismo criterio que 004 (FR-A08), repetido aquí porque
 * las carpetas de features/ no se importan entre sí. es-MX: punto decimal, sin separador de miles, signo
 * explícito y menos tipográfico (U+2212). Solo redondea para mostrar: nunca cambia ni calcula valores.
 */

export const MINUS = '−'
export const MISSING = '—'

const usable = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x)

function format(x: number | null | undefined, digits: number, signed: boolean): string {
  if (!usable(x)) return MISSING
  const text = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(x).replace('-', MINUS)
  // Un valor que redondea a cero se muestra sin signo.
  return /^[+−]?0(\.0+)?$/.test(text) ? text.replace(/^[+−]/, '') : text
}

/**
 * Decimales para un grupo de cifras que se leen juntas (pendiente e intervalo), según su tamaño y no según
 * la unidad: así vale para cualquier variable. Cifras grandes llevan menos decimales; las pequeñas, más.
 */
export function digitsFor(...values: (number | null | undefined)[]): number {
  const size = Math.max(0, ...values.filter(usable).map(Math.abs))
  if (size >= 100) return 0
  if (size >= 10) return 1
  if (size >= 0.1 || size === 0) return 2
  if (size >= 0.01) return 3
  return 4
}

export const fmtSigned = (x: number | null | undefined, digits = 2) => format(x, digits, true)

export const fmtNumber = (x: number | null | undefined, digits = 2) => format(x, digits, false)

/** Valor tal como viene en el archivo, sin ceros de relleno. */
export function fmtValue(x: number | null | undefined, maxDigits = 3): string {
  if (!usable(x)) return MISSING
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: maxDigits, useGrouping: false }).format(x).replace('-', MINUS)
}

export const fmtYears = (from: number, to: number) => `${from}–${to}`

export function fmtP(p: number | null | undefined): string {
  if (!usable(p)) return 'p not available'
  if (p < 0.001) return 'p < 0.001'
  return `p = ${fmtNumber(p, 3)}`
}

export function fmtAlpha(alpha: number): string {
  return `α = ${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3, useGrouping: false }).format(alpha)}`
}

/** «de −0.10 a +0.30». */
export const fmtInterval = (low: number | null | undefined, high: number | null | undefined, digits = 2) =>
  usable(low) && usable(high) ? `${fmtSigned(low, digits)} to ${fmtSigned(high, digits)}` : MISSING

/** «°C/década» → «°C por década», para leerlo en una frase. */
export const perDecade = (unit: string) => unit.replace(/\/decade$/, ' per decade')

/** Etiquetas de eje: tantos decimales como pida el paso entre marcas. */
export function fmtTick(x: number, step: number): string {
  const digits = step > 0 ? Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9))) : 0
  return fmtNumber(x, digits)
}
