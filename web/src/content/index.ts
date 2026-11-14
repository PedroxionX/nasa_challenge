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
  /**
   * Unidad de la pendiente **ya con la base temporal**, p. ej. «°C/década».
   * explainTrend NO añade «por década»: la unidad lo trae.
   * Si la magnitud es relativa (precipitación con `relative_change`), quien llama pasa «%/década».
   */
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

// ---------- GLOSARIO (FR-C03) ----------
// Definiciones de los términos que aparecen en la frase del análisis.
// Definiciones tomadas de research.md D6. El panel (004) debe ofrecerlas junto a la primera cifra.

export const GLOSSARY = {
  slope:
    'Pendiente: cuánto cambia la variable por década. Es la mediana de las pendientes ' +
    'entre todos los pares de años, así que un año extremo la mueve poco.',
  ci:
    'Intervalo de confianza (IC): rango de pendientes compatibles con los datos. ' +
    'Si es ancho, la estimación es imprecisa; si incluye el cero, la tendencia podría ser nula.',
  p:
    'Valor p: probabilidad de ver un patrón creciente o decreciente al menos así de marcado ' +
    'si en realidad no hubiera tendencia. Cuanto menor, más difícil de atribuir al azar.',
  alpha:
    'α (nivel de significancia): umbral fijado antes de mirar los datos. ' +
    'Si p es menor que α, se habla de evidencia de tendencia.',
} as const

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
  invalidStep:
    'No mostramos tendencia en este periodo: la serie tiene un salto brusco ' +
    '(por ejemplo, un cambio de instrumento o de corrección) que distorsiona el cálculo.',
  invalidGeneric:
    'No mostramos tendencia en este periodo: la serie no cumple las condiciones del método.',
  useFullPeriod: 'Usar todo el periodo',
  loadError: 'No pudimos cargar los datos de este estado.',
  retry: 'Reintentar',
  noWebgl:
    'Tu navegador no puede mostrar el globo. Puedes seguir con el buscador y la tabla.',
  synthetic:
    'Datos de ejemplo sintéticos: no son observaciones reales de la NASA.',
  notCause: 'Una tendencia no dice por qué ocurre ni si continuará.',
  /** FR-C01: significancia ≠ magnitud ≠ relevancia ambiental. */
  significanceNote:
    'Que una tendencia sea significativa no la hace grande ni importante: ' +
    'el valor p dice cuánta evidencia hay, la pendiente dice cuánto cambia, ' +
    'y qué implica para un lugar es otra pregunta.',
  periodChosen: (from: number, to: number) =>
    `Estás viendo ${from}–${to}. El resultado depende del periodo elegido.`,
  smallRegion:
    'Este estado es más pequeño que una celda del modelo (~50 km): ' +
    'el valor representa también a sus vecinos.',
  legendNote:
    'El color muestra el cambio estimado por década, no si ese cambio es significativo. ' +
    'Con tantos estados, algunos destacarán por azar.',
  methodsCite: (source: string, retrieved: string) =>
    `Fuente: ${source}. Consultado: ${retrieved}.`,
} as const

// ---------- Textos de los veredictos ----------

const VERDICT_LABEL: Record<TrendStatus, string> = {
  increasing: 'Sube',
  decreasing: 'Baja',
  inconclusive: 'Sin evidencia suficiente',
  insufficient: 'Datos insuficientes',
  invalid: 'Análisis no válido',
}

const NBSP = '\u00a0'

/** Formatea un número con signo y dos decimales: «+1,23» o «−0,45». */
function fmt(n: number): string {
  const abs = Math.abs(n).toFixed(2).replace('.', ',')
  return n >= 0 ? `+${abs}` : `\u2212${abs}` // − es U+2212, no guion
}

/** «p = 0,012»; los valores menores que 0,001 se muestran como «p < 0,001», nunca como «0,000». */
function fmtP(p: number): string {
  if (p < 0.001) return `p${NBSP}<${NBSP}0,001`
  return `p${NBSP}=${NBSP}${p.toFixed(3).replace('.', ',')}`
}

// ---------- explainTrend — cuatro variantes (SC-C02) ----------

/**
 * Genera la explicación en lenguaje llano para el estado del análisis.
 *
 * Variantes cubiertas (SC-C02):
 *   1. increasing  — sube con evidencia
 *   2. decreasing  — baja con evidencia
 *   3. inconclusive — sin evidencia (no menciona dirección)
 *   4. insufficient / invalid / row === null — datos insuficientes o análisis no válido
 *
 * Avisos (caveats), en cualquier estado:
 *   - isSynthetic, !fullPeriod, smallRegion
 */
export function explainTrend(row: TrendRow | null, ctx: ExplainContext): Explanation {
  const caveats: string[] = []

  if (ctx.isSynthetic) caveats.push(UI_COPY.synthetic)
  if (!ctx.fullPeriod) caveats.push(UI_COPY.periodChosen(ctx.from, ctx.to))
  if (ctx.smallRegion) caveats.push(UI_COPY.smallRegion)

  // Variante 4a: análisis no válido (p. ej. escalón en la serie). NO es «faltan años».
  if (row && row.status === 'invalid') {
    return {
      verdict: VERDICT_LABEL.invalid,
      sentence: row.flags.includes('step') ? UI_COPY.invalidStep : UI_COPY.invalidGeneric,
      caveats,
    }
  }

  // Variante 4b: sin fila o datos insuficientes
  if (!row || row.status === 'insufficient') {
    return {
      verdict: VERDICT_LABEL.insufficient,
      sentence: UI_COPY.insufficientData,
      caveats,
    }
  }

  const { status, slope_decade, ci_low, ci_high, p, n } = row

  // Variante 3: inconclusive — sin dirección, sin cifra de pendiente (clarification 2026-11-14)
  if (status === 'inconclusive') {
    const pStr = p !== null ? ` (${fmtP(p)})` : ''
    return {
      verdict: VERDICT_LABEL.inconclusive,
      sentence:
        `Sin evidencia suficiente de tendencia en ${ctx.regionName} ` +
        `(${ctx.from}–${ctx.to}, ${n}${NBSP}años)${pStr}. ` +
        `Esto no demuestra que no haya cambio.`,
      caveats,
    }
  }

  // Variantes 1 y 2: increasing / decreasing — con cifras completas.
  // La unidad ya trae «/década»; no se repite.
  const level = Math.round((1 - ctx.alpha) * 100)
  const slopeStr =
    slope_decade !== null ? `${fmt(slope_decade)}${NBSP}${ctx.unit}` : '(pendiente no disponible)'
  const ciStr =
    ci_low !== null && ci_high !== null
      ? ` (IC${NBSP}${level}${NBSP}%: de ${fmt(ci_low)} a ${fmt(ci_high)}${NBSP}${ctx.unit})`
      : ''
  const pStr = p !== null ? `; ${fmtP(p)}` : ''

  const dirLabel = status === 'increasing' ? 'Sube' : 'Baja'
  const sentence =
    `${dirLabel}. ${slopeStr}${ciStr}` +
    ` entre ${ctx.from} y ${ctx.to} (${n}${NBSP}años)${pStr}. ` +
    `Hay evidencia de tendencia: un patrón así sería muy raro si no hubiera tendencia.`

  return {
    verdict: VERDICT_LABEL[status],
    sentence,
    caveats,
  }
}