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
import type {
  CompareBasis, DifferenceRow, NotComparableReason, TrendRow, TrendStatus, VariableId,
} from '../lib/data'

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

/**
 * Textos propios de 006 para una variable. Son opcionales: una variable nueva del catálogo que aún no tenga
 * entrada aquí se muestra con su `label` y `definition` del catálogo (ver `variableCopy`, 007 FR-K14).
 */
export const VARIABLE_COPY: Partial<Record<VariableId, VariableCopy>> = {
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

/**
 * Textos de una variable: los de 006 si existen; si no, los que publica el catálogo.
 * `info` es la entrada de `catalog.variables[]`; mientras el catálogo no ha cargado puede faltar.
 */
export function variableCopy(
  variableId: VariableId,
  info?: { label: string; definition: string } | null,
): VariableCopy {
  const own = VARIABLE_COPY[variableId]
  if (own) return own
  if (info) return { label: info.label, short: info.label, definition: info.definition }
  return { label: 'Variable', short: 'Variable', definition: '' }
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
  const abs = Math.abs(n).toFixed(2)
  return n >= 0 ? `+${abs}` : `\u2212${abs}` // − es U+2212, no guion
}

/** «p = 0.012»; los valores menores que 0,001 se muestran como «p < 0.001», nunca como «0.000». */
function fmtP(p: number): string {
  if (p < 0.001) return `p${NBSP}<${NBSP}0.001`
  return `p${NBSP}=${NBSP}${p.toFixed(3)}`
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

  const sentence =
    `${slopeStr}${ciStr}` +
    ` entre ${ctx.from} y ${ctx.to} (${n}${NBSP}años)${pStr}. ` +
    `Un patrón así sería muy raro si no hubiera tendencia.`

  return {
    verdict: VERDICT_LABEL[status],
    sentence,
    caveats,
  }
}

// ---------- Comparación de dos regiones (007, FR-K08) ----------
//
// Reglas propias, además de las de arriba:
// - «Sin evidencia de que difieran» NUNCA se redacta como que las tendencias coinciden.
// - Ninguna frase ordena las regiones ni valora cuál está en mejor situación.
// - Signos opuestos no bastan para afirmar que las tendencias difieren: lo dice la prueba de la diferencia.
// Nada de esto depende de la variable: sirve para cualquiera que publique el catálogo.

export const COMPARE_COPY = {
  entryLabel: 'Comparar con otro estado',
  entryPlaceholder: 'Elige un estado…',
  title: (a: string, b: string) => `${a} frente a ${b}`,
  remove: 'Quitar comparación',
  differenceHeading: 'Diferencia entre las tendencias',
  eachHeading: 'Cada estado por separado',
  chartHeading: 'Valores anuales',
  startLabel: 'Desde',
  until: (end: number) => `hasta ${end}`,
  /** El par se guarda una sola vez y la diferencia se lee en ese orden; no se invierte. */
  order: (first: string, second: string) => `${first} − ${second}`,
  commonYears: (n: number) => `${n} años completos comunes`,
  notPublished:
    'La prueba de la diferencia todavía no está publicada para esta variable. ' +
    'Puedes leer el resultado de cada estado por separado.',
  noWindow: (end: number) =>
    `La prueba de la diferencia solo está publicada para periodos que terminan en ${end}. ` +
    'Abajo tienes el resultado de cada estado en el periodo elegido.',
  showWindow: (from: number, to: number) => `Ver ${from}–${to}`,
  missingPair: 'No hay prueba de la diferencia para este par de estados.',
  noData: (name: string) => `No hay datos de ${name} para esta variable.`,
  loadError: 'No pudimos cargar los datos de la comparación.',
  notComparable: {
    different_unit: 'No se comparan: las dos series están en unidades distintas.',
    different_product: 'No se comparan: las dos series vienen de productos o versiones distintos.',
    mixed_synthetic: 'No se comparan: una serie es de ejemplo (sintética) y la otra es real.',
    identical_series: 'No se comparan: las dos series tienen exactamente los mismos valores.',
  } satisfies Record<NotComparableReason, string>,
  relativeBasis:
    'La diferencia va en puntos porcentuales: cada serie se expresa como porcentaje de su propia media ' +
    'en el periodo, para que un estado con valores altos no pese más que otro con valores bajos.',
  absoluteBasis: 'La diferencia se mide restando, año por año, el valor de un estado al del otro.',
  oppositeSigns:
    'Que una pendiente sea positiva y la otra negativa no demuestra, por sí solo, que las tendencias difieran: ' +
    'eso lo dice la prueba de la diferencia.',
  manyPairs: 'Con tantos pares de estados posibles, algunos mostrarán diferencias por azar.',
  notCause: 'Una diferencia entre tendencias no dice por qué ocurre ni si continuará.',
  method:
    'Se resta una serie de la otra en los años completos que tienen en común y se analiza esa serie de diferencias ' +
    'con el mismo método que cada estado: pendiente de Theil-Sen, intervalo de Sen y prueba de Mann-Kendall ' +
    'corregida por autocorrelación. Así se tiene en cuenta que dos estados cercanos comparten buena parte de su clima.',
} as const

export interface CompareContext {
  /** Nombres en el orden del archivo: la diferencia es `firstName − secondName`. */
  firstName: string
  secondName: string
  /** Unidad de la diferencia, ya con la base temporal: «°C/década», «puntos porcentuales/década». */
  unit: string
  basis: CompareBasis
  from: number
  to: number
  alpha: number
  /** Mínimo de años comunes para comparar (`catalog.period.min_window_years`). */
  minYears: number
  /** Resultado individual de cada región en el mismo periodo, si se conoce: solo para describir el patrón. */
  first: { status: TrendStatus; slope: number | null } | null
  second: { status: TrendStatus; slope: number | null } | null
  smallRegion: boolean
  isSynthetic: boolean
}

export interface ComparisonExplanation {
  /** Frase corta del veredicto de la diferencia. */
  verdict: string
  /** Frase en lenguaje llano, solo con cifras del archivo. */
  sentence: string
  /** Descripción de los dos resultados individuales (mismo signo u opuesto; con evidencia o no), o `null`. */
  pattern: string | null
  caveats: string[]
}

const DIFFERENCE_VERDICT: Record<DifferenceRow['status'], string> = {
  differ: 'Las tendencias difieren',
  inconclusive: 'Sin evidencia suficiente de que difieran',
  insufficient: 'Datos insuficientes para comparar',
  invalid: 'Comparación no válida',
}

const HAS_EVIDENCE: ReadonlySet<TrendStatus> = new Set(['increasing', 'decreasing'])
const DIRECTION: Partial<Record<TrendStatus, string>> = { increasing: 'sube', decreasing: 'baja' }

/**
 * Patrón de los dos resultados individuales. Solo lee su estado y el signo de su pendiente: no calcula nada.
 * `opposite` indica signos opuestos, para añadir el aviso de que eso no basta.
 */
function describePattern(ctx: CompareContext): { text: string; opposite: boolean } | null {
  const { first, second } = ctx
  if (!first || !second || first.slope === null || second.slope === null) return null
  const signs = [Math.sign(first.slope), Math.sign(second.slope)]
  if (signs[0] === 0 || signs[1] === 0) return null
  const opposite = signs[0] !== signs[1]
  const both = HAS_EVIDENCE.has(first.status) && HAS_EVIDENCE.has(second.status)
  if (both && opposite) {
    return {
      opposite,
      text: `${ctx.firstName} ${DIRECTION[first.status]} y ${ctx.secondName} ${DIRECTION[second.status]}, ` +
        'cada uno con evidencia de tendencia.',
    }
  }
  if (both) {
    return { opposite, text: `${ctx.firstName} y ${ctx.secondName}: en los dos ${DIRECTION[first.status]}, con evidencia de tendencia.` }
  }
  return {
    opposite,
    text: opposite
      ? 'Las pendientes estimadas tienen signo opuesto, pero al menos una no tiene evidencia suficiente de tendencia.'
      : 'Las pendientes estimadas tienen el mismo signo, pero al menos una no tiene evidencia suficiente de tendencia.',
  }
}

/**
 * Explicación de la prueba de la diferencia entre las tendencias de dos regiones.
 * `row` es la fila ya calculada por el pipeline (`pickComparison`); aquí solo se redacta.
 */
export function explainComparison(row: DifferenceRow, ctx: CompareContext): ComparisonExplanation {
  const caveats: string[] = []
  if (ctx.isSynthetic) caveats.push(UI_COPY.synthetic)
  if (ctx.smallRegion) caveats.push(UI_COPY.smallRegion)

  const verdict = DIFFERENCE_VERDICT[row.status]
  const pair = COMPARE_COPY.order(ctx.firstName, ctx.secondName)

  if (row.status === 'insufficient') {
    return {
      verdict,
      sentence:
        `Faltan años en común: ${ctx.firstName} y ${ctx.secondName} comparten ${row.n}${NBSP}años completos ` +
        `entre ${ctx.from} y ${ctx.to}. Con menos de ${ctx.minYears} no comparamos tendencias.`,
      pattern: null,
      caveats,
    }
  }
  if (row.status === 'invalid') {
    return {
      verdict,
      sentence: 'No mostramos la diferencia en este periodo: las dos series no cumplen las condiciones del método.',
      pattern: null,
      caveats,
    }
  }

  const pattern = describePattern(ctx)
  const period = `${ctx.from}–${ctx.to}, ${COMPARE_COPY.commonYears(row.n)}`
  caveats.unshift(ctx.basis === 'relative' ? COMPARE_COPY.relativeBasis : COMPARE_COPY.absoluteBasis)

  if (row.status === 'inconclusive') {
    if (pattern?.opposite) caveats.push(COMPARE_COPY.oppositeSigns)
    caveats.push(COMPARE_COPY.manyPairs)
    const pStr = row.p !== null ? ` (${fmtP(row.p)})` : ''
    return {
      verdict,
      sentence:
        `Sin evidencia suficiente de que las tendencias de ${ctx.firstName} y ${ctx.secondName} difieran ` +
        `(${period})${pStr}. Esto no demuestra que cambien igual.`,
      pattern: pattern?.text ?? null,
      caveats,
    }
  }

  const level = Math.round((1 - ctx.alpha) * 100)
  const diffStr = row.diff_decade !== null ? `${fmt(row.diff_decade)}${NBSP}${ctx.unit}` : '(diferencia no disponible)'
  const ciStr = row.ci_low !== null && row.ci_high !== null
    ? ` (IC${NBSP}${level}${NBSP}%: de ${fmt(row.ci_low)} a ${fmt(row.ci_high)})`
    : ''
  const pStr = row.p !== null ? `; ${fmtP(row.p)}` : ''
  caveats.push(COMPARE_COPY.manyPairs, COMPARE_COPY.notCause)
  return {
    verdict,
    sentence:
      `Diferencia (${pair}): ${diffStr}${ciStr}; ${period}${pStr}. ` +
      'Una divergencia así sería muy rara si las dos tendencias fueran iguales.',
    pattern: pattern?.text ?? null,
    caveats,
  }
}
