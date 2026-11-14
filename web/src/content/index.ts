/**
 * Textos y explicaciones de la aplicación (006-guide-content).
 * Las firmas están congeladas por 002; aquí se escribe el contenido.
 *
 * Reglas de la constitución (Principio I y V):
 * - Nunca «no hay cambio» para evidencia insuficiente.
 * - Nunca causalidad ni pronóstico.
 * - Nunca «X años para ser significativo».
 * - Solo cifras que provienen del archivo calculado por 003.
 */
import type { TrendRow, TrendStatus, VariableId } from '../lib/data'

// ---------- Tipos públicos (firma fijada por 002) ----------

export interface ExplainContext {
  regionName: string
  variableId: VariableId
  /** Unidad de la pendiente, p. ej. «°C/década». */
  unit: string
  from: number
  to: number
  alpha: number
  /** `true` si el periodo es el completo del catálogo. */
  fullPeriod: boolean
  smallRegion: boolean
  isSynthetic: boolean
}

export interface Explanation {
  /** Palabra o frase corta del veredicto («Sube», «Sin evidencia suficiente»…). */
  verdict: string
  /** Frase en lenguaje llano, construida solo con cifras del archivo. */
  sentence: string
  /** Avisos adicionales: periodo elegido, región pequeña, datos sintéticos… */
  caveats: string[]
}

export interface VariableCopy {
  label: string
  short: string
  definition: string
}

// ---------- VARIABLE_COPY (FR-C02, FR-C03) ----------

export const VARIABLE_COPY: Record<VariableId, VariableCopy> = {
  air_temperature: {
    label: 'Temperatura del aire',
    short: 'Temperatura',
    definition:
      'La temperatura que mediría un termómetro a 2 metros del suelo. ' +
      'Aquí procede de MERRA-2, un reanálisis de la NASA que combina observaciones ' +
      'de satélites y estaciones con un modelo atmosférico; no es una medición directa.',
  },
  precipitation: {
    label: 'Precipitación',
    short: 'Precipitación',
    definition:
      'Lluvia y nieve acumuladas a lo largo del año, expresadas en milímetros. ' +
      'Procede de GPM IMERG, una observación directa de satélite de la NASA, disponible desde 2001. ' +
      'Su tendencia es menos fiable que la de temperatura: ' +
      'las observaciones de precipitación por satélite tienen mayor incertidumbre en zonas áridas y montañosas.',
  },
}

// ---------- UI_COPY ----------

export const UI_COPY = {
  appName: 'Trend Detective',
  tagline: 'NASA Space Apps 2026 · Earth System Trend Detective',
  welcome: 'Elige un estado para ver cómo ha cambiado su clima en las últimas décadas.',
  searchPlaceholder: 'Buscar un estado…',
  searchNoResults:
    'No hay ningún estado con ese nombre. Prueba con otro o tócalo en el globo.',
  noData: 'No hay datos para esta región.',
  insufficientData:
    'Faltan años. Con menos de 10 años completos no calculamos tendencia.',
  useFullPeriod: 'Usar todo el periodo',
  loadError: 'No pudimos cargar los datos de este estado.',
  retry: 'Reintentar',
  noWebgl:
    'Tu navegador no puede mostrar el globo. Puedes seguir con el buscador y la tabla.',
  synthetic:
    'Datos de ejemplo sintéticos: no son observaciones reales de la NASA.',
  notCause: 'Una tendencia no dice por qué ocurre ni si continuará.',
  periodChosen: (from: number, to: number) =>
    `Estás viendo ${from}–${to}. El resultado depende del periodo elegido.`,
  smallRegion:
    'Este estado es más pequeño que una celda del modelo (~50 km): ' +
    'el valor representa también a sus vecinos.',
  legendNote:
    'El color muestra el cambio estimado por década, no si ese cambio es significativo.',
  methodsCite: (source: string, retrieved: string) =>
    `Fuente: ${source}. Consultado: ${retrieved}.`,
} as const

// ---------- Textos de los cuatro veredictos ----------

const VERDICT_LABEL: Record<TrendStatus, string> = {
  increasing: 'Sube',
  decreasing: 'Baja',
  inconclusive: 'Sin evidencia suficiente',
  insufficient: 'Datos insuficientes',
  invalid: 'Análisis no válido',
}

/** Formatea un número con signo y dos decimales: «+1,23» o «−0,45». */
function fmt(n: number): string {
  const abs = Math.abs(n).toFixed(2).replace('.', ',')
  return n >= 0 ? `+${abs}` : `\u2212${abs}` // − es U+2212, no guion
}

// ---------- explainTrend — cuatro variantes (SC-C02) ----------

/**
 * Genera la explicación en lenguaje llano para el estado del análisis.
 *
 * Variantes cubiertas (SC-C02):
 *   1. increasing  — sube con evidencia
 *   2. decreasing  — baja con evidencia
 *   3. inconclusive — sin evidencia (no menciona dirección)
 *   4. insufficient / invalid / row === null — datos insuficientes
 *
 * Avisos (caveats):
 *   - isSynthetic  → siempre
 *   - !fullPeriod  → siempre
 *   - smallRegion  → siempre (en cualquier estado, clarification 2026-11-14)
 */
export function explainTrend(row: TrendRow | null, ctx: ExplainContext): Explanation {
  const caveats: string[] = []

  // Los avisos se acumulan independientemente del estado
  if (ctx.isSynthetic) caveats.push(UI_COPY.synthetic)
  if (!ctx.fullPeriod) caveats.push(UI_COPY.periodChosen(ctx.from, ctx.to))
  if (ctx.smallRegion) caveats.push(UI_COPY.smallRegion)

  // Sin fila o estado inválido/insuficiente → variante 4
  if (!row || row.status === 'insufficient' || row.status === 'invalid') {
    return {
      verdict: VERDICT_LABEL[row?.status ?? 'insufficient'],
      sentence: UI_COPY.insufficientData,
      caveats,
    }
  }

  const { status, slope_decade, ci_low, ci_high, p } = row
  const years = ctx.to - ctx.from

  // Variante 3: inconclusive — sin dirección, sin cifra principal (clarification 2026-11-14)
  if (status === 'inconclusive') {
    const pStr = p !== null ? ` (p\u00a0=\u00a0${p.toFixed(3).replace('.', ',')})` : ''
    return {
      verdict: VERDICT_LABEL.inconclusive,
      sentence:
        `Sin evidencia suficiente de tendencia en ${ctx.regionName} ` +
        `(${ctx.from}–${ctx.to}, ${years}\u00a0años)${pStr}. ` +
        `Esto no demuestra que no haya cambio.`,
      caveats,
    }
  }

  // Variantes 1 y 2: increasing / decreasing — con cifras completas
  const slopeStr =
    slope_decade !== null ? `${fmt(slope_decade)}\u00a0${ctx.unit}` : '(pendiente no disponible)'
  const ciStr =
    ci_low !== null && ci_high !== null
      ? ` (IC\u00a095\u00a0%: de ${fmt(ci_low)} a ${fmt(ci_high)}\u00a0${ctx.unit})`
      : ''
  const pStr =
    p !== null ? `; p\u00a0=\u00a0${p.toFixed(3).replace('.', ',')}` : ''
  const evidenceStr = p !== null && p < ctx.alpha ? 'fuerte' : 'moderada'

  const dirLabel = status === 'increasing' ? 'Sube' : 'Baja'
  const sentence =
    `${dirLabel}. ${slopeStr} por década${ciStr}` +
    ` entre ${ctx.from} y ${ctx.to} (${years}\u00a0años)${pStr}. ` +
    `La evidencia es ${evidenceStr}: ` +
    `un patrón así sería muy raro si no hubiera tendencia.`

  return {
    verdict: VERDICT_LABEL[status],
    sentence,
    caveats,
  }
}
