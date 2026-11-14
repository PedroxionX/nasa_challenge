/**
 * ESBOZO de 002 (T007). Dueño tras la fusión: 006.
 * Las firmas están congeladas (specs/002-foundation/spec.md); 006 sustituye el contenido.
 * Reglas (constitución): nunca «no hay cambio» por evidencia insuficiente, nunca causa ni pronóstico,
 * nunca «años para ser significativo», y solo cifras que vienen del archivo.
 */
import type { TrendRow, TrendStatus, VariableId } from '../lib/data'

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

export const VARIABLE_COPY: Record<VariableId, VariableCopy> = {
  air_temperature: {
    label: 'Temperatura del aire',
    short: 'Temperatura',
    definition: '[Provisional · 006] La que mediría un termómetro a 2 m del suelo, según el reanálisis MERRA-2 de la NASA.',
  },
  precipitation: {
    label: 'Precipitación',
    short: 'Precipitación',
    definition: '[Provisional · 006] Lluvia y nieve acumuladas en el año, medidas por satélites y pluviómetros (GPM IMERG de la NASA), desde 2001.',
  },
}

export const UI_COPY = {
  appName: 'Trend Detective',
  tagline: 'NASA Space Apps 2026 · Earth System Trend Detective',
  welcome: 'Elige un estado para ver cómo ha cambiado su clima en las últimas décadas.',
  searchPlaceholder: 'Buscar un estado…',
  noData: 'No hay datos para esta región.',
  insufficientData: 'Faltan años. Con menos de 10 años completos no calculamos tendencia.',
  useFullPeriod: 'Usar todo el periodo',
  loadError: 'No pudimos cargar los datos de este estado.',
  retry: 'Reintentar',
  noWebgl: 'Tu navegador no puede mostrar el globo. Puedes seguir con el buscador y la tabla.',
  synthetic: 'Datos de ejemplo sintéticos: no son observaciones de la NASA.',
  notCause: 'Una tendencia no dice por qué ocurre ni si continuará.',
} as const

const VERDICT: Record<TrendStatus, string> = {
  increasing: 'Sube',
  decreasing: 'Baja',
  inconclusive: 'Sin evidencia suficiente',
  insufficient: 'Datos insuficientes',
  invalid: 'Análisis no válido',
}

/** Esbozo: 006 escribe las cinco variantes definitivas y sus pruebas. */
export function explainTrend(row: TrendRow | null, ctx: ExplainContext): Explanation {
  const caveats: string[] = []
  if (ctx.isSynthetic) caveats.push(UI_COPY.synthetic)
  if (!ctx.fullPeriod) caveats.push(`Estás viendo ${ctx.from}–${ctx.to}. El resultado depende del periodo.`)
  if (ctx.smallRegion) caveats.push('Este estado es más pequeño que una celda del modelo: el valor representa también a sus vecinos.')
  if (!row) return { verdict: VERDICT.insufficient, sentence: UI_COPY.insufficientData, caveats }
  const sentence = row.slope_decade === null
    ? '[Texto provisional · 006]'
    : `[Texto provisional · 006] Estimación: ${row.slope_decade} ${ctx.unit} (${row.ci_low} a ${row.ci_high}), ${ctx.from}–${ctx.to}.`
  return { verdict: VERDICT[row.status], sentence, caveats }
}
