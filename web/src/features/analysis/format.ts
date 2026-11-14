/**
 * Formateador único de cifras de 004 (FR-A08). Ningún otro archivo de 004 formatea números.
 * es-MX: punto decimal, sin separador de miles, signo explícito en pendientes y menos tipográfico (U+2212).
 * Solo redondea para mostrar: nunca cambia ni calcula valores.
 */

export const MINUS = '−'
const MISSING = '—'

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(digits: number, signed: boolean): Intl.NumberFormat {
  const key = `${digits}/${signed}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: false,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    formatters.set(key, f)
  }
  return f
}

const usable = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x)

function format(x: number | null | undefined, digits: number, signed: boolean): string {
  if (!usable(x)) return MISSING
  const text = formatter(digits, signed).format(x).replace('-', MINUS)
  // «−0.00» no aporta: un valor que redondea a cero se muestra sin signo.
  return /^[+−]?0(\.0+)?$/.test(text) ? text.replace(/^[+−]/, '') : text
}

export const fmtNumber = (x: number | null | undefined, digits = 2) => format(x, digits, false)

export const fmtSigned = (x: number | null | undefined, digits = 2) => format(x, digits, true)

export const fmtYear = (year: number) => String(year)

export const fmtYears = (from: number, to: number) => `${fmtYear(from)}–${fmtYear(to)}`

export function fmtP(p: number | null | undefined): string {
  if (!usable(p)) return 'p no evaluable'
  if (p < 0.001) return 'p < 0.001'
  return `p = ${fmtNumber(p, 3)}`
}

export function fmtAlpha(alpha: number): string {
  const text = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3, useGrouping: false }).format(alpha)
  return `α = ${text}`
}

/** «+0.46 °C por década». `unit` es `unit_annual` del catálogo. */
export const fmtSlope = (x: number | null | undefined, unit: string, digits = 2) =>
  usable(x) ? `${fmtSigned(x, digits)} ${unit} por década` : MISSING

/** «de −0.10 a +0.30». */
export const fmtInterval = (low: number | null | undefined, high: number | null | undefined, digits = 2) =>
  usable(low) && usable(high) ? `de ${fmtSigned(low, digits)} a ${fmtSigned(high, digits)}` : MISSING

/** Porcentaje ya calculado por el pipeline (FR-A09): «+3.1 %». */
export const fmtPercent = (x: number | null | undefined, digits = 1) =>
  usable(x) ? `${fmtSigned(x, digits)} %` : MISSING
