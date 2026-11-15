/**
 * Textos y explicaciones de la aplicación (006-guide-content).
 * Las firmas están congeladas por 002; aquí se escribe el contenido.
 * Idioma de la interfaz: inglés (decisión del 2026-11-15). Los comentarios de reglas siguen en español.
 *
 * Reglas de la constitución (Principio I y V):
 * - Nunca «no hay cambio» para evidencia insuficiente.
 * - Nunca causalidad ni pronóstico.
 * - Nunca «X años para ser significativo».
 * - Solo cifras que provienen del archivo calculado por 003.
 */
import type {
  CompareBasis, DifferenceRow, NotComparableReason, TrendRow, TrendStatus, VariableId, VariableInfo,
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

// ---------- Display language (English since 2026-11-15) ----------
//
// The data files in public/data/ are written by the pipeline in Spanish and are not edited from the UI.
// These helpers only rename what is shown: they never change, round or compute a value.

export { regionName } from './names'

export const COUNTRY_NAMES: Readonly<Record<string, string>> = { MX: 'Mexico', US: 'United States' }

/** «°C/década» → «°C/decade». Only the words change; the unit is the one in the file. */
export function localizeUnit(unit: string): string {
  return unit
    .replace(/década/g, 'decade')
    .replace(/puntos porcentuales/g, 'percentage points')
    .replace(/adimensional/g, 'unitless')
}

/** Map class labels as written by the pipeline → English. An unknown label is shown as is. */
const CLASS_LABELS: Readonly<Record<string, string>> = {
  'Baja mucho': 'Strong decrease',
  'Baja': 'Decrease',
  'Casi sin cambio': 'Little change',
  'Sube': 'Increase',
  'Sube mucho': 'Strong increase',
}
/** «NASA GES DISC (Earthdata Cloud) vía earthaccess» → «… via earthaccess». */
export const localizeSource = (source: string): string => source.replace(/\bvía\b/g, 'via')

export const localizeClassLabel = (label: string): string => CLASS_LABELS[label] ?? label

// ---------- VARIABLE_COPY (FR-C02, FR-C03) ----------

const MERRA2 =
  'It comes from MERRA-2, a NASA reanalysis that combines observations with an atmospheric model; ' +
  'it is not a direct measurement.'
const GLDAS =
  'It comes from GLDAS Noah, a NASA land surface model driven by observations; ' +
  'it is not a direct measurement. Data exist over land only.'

/** Copy written for each variable. A variable without an entry falls back to the catalog (see `variableCopy`). */
export const VARIABLE_COPY: Partial<Record<VariableId, VariableCopy>> = {
  air_temperature: {
    label: 'Air temperature',
    short: 'Temperature',
    definition:
      'The temperature a thermometer would read 2 meters above the ground. ' +
      'Here it comes from MERRA-2, a NASA reanalysis that combines satellite and station observations ' +
      'with an atmospheric model; it is not a direct measurement.',
  },
  precipitation: {
    label: 'Precipitation',
    short: 'Precipitation',
    definition:
      'Rain and snow accumulated over the year, in millimeters. ' +
      'It comes from GPM IMERG, a direct NASA satellite observation, available since 2001. ' +
      'Its trend is less reliable than the temperature trend: ' +
      'satellite precipitation observations are more uncertain in arid and mountainous areas.',
  },

  // --- GLDAS Noah (land surface model): data over land only ---
  soil_moisture: {
    label: 'Soil moisture',
    short: 'Soil moisture',
    definition:
      'Water in the top 10 centimeters of soil, in kilograms per square meter (yearly mean). ' + GLDAS,
  },
  evapotranspiration: {
    label: 'Evapotranspiration',
    short: 'Evapotranspiration',
    definition:
      'Water that moves from the soil and plants into the atmosphere over the year, in millimeters. ' + GLDAS,
  },
  soil_temperature: {
    label: 'Soil temperature',
    short: 'Soil temp.',
    definition:
      'Temperature of the ground surface, in °C (yearly mean). It is not the air temperature. ' + GLDAS,
  },
  runoff: {
    label: 'Runoff',
    short: 'Runoff',
    definition:
      'Water the soil does not hold, which flows over the surface or drains below it, ' +
      'added up over the year in millimeters. It is the runoff computed by GLDAS Noah, a NASA land surface ' +
      'model driven by observations; it is not streamflow measured in rivers. ' +
      'Data exist over land only. The District of Columbia comes out far above its neighbors ' +
      'because its cells are urban in the model.',
  },
  snow_water_equivalent: {
    label: 'Snowpack',
    short: 'Snow',
    definition:
      'Water held in the snow on the ground, in millimeters: the depth it would have ' +
      'if it melted (yearly mean). ' + GLDAS + ' ' +
      'It is zero in almost all of Mexico; Campeche, Quintana Roo, Tabasco, Yucatán and Puerto Rico ' +
      'have no trend (no data).',
  },

  // --- MERRA-2 M2TMNXSLV (reanalysis) ---
  specific_humidity: {
    label: 'Air humidity',
    short: 'Air humidity',
    definition:
      'Grams of water vapor in each kilogram of air, 2 meters above the ground (specific humidity). ' +
      'It is not relative humidity, which is given as a percentage. ' + MERRA2,
  },
  total_precipitable_water: {
    label: 'Total water vapor',
    short: 'Water vapor',
    definition:
      'All the water vapor in the column of air, from the ground to the top of the atmosphere, ' +
      'expressed as the millimeters of water there would be if it all condensed. It is not the rain that falls. ' +
      MERRA2,
  },
  total_ozone: {
    label: 'Total ozone',
    short: 'Ozone',
    definition:
      'Total amount of ozone in the column of air, in Dobson units (DU), the usual measure of ozone. ' +
      'Almost all of it is in the stratosphere: it is not the ozone breathed at ground level. ' +
      'It comes from MERRA-2, a NASA reanalysis that assimilates satellite measurements; ' +
      'it is not a direct measurement. In 2004 MERRA-2 changes the sensors it assimilates: ' +
      'a trend that crosses that year may be partly due to that change.',
  },

  // --- MERRA-2 M2SMNXSLV (daily statistics of the reanalysis) ---
  max_air_temperature: {
    label: 'Maximum temperature',
    short: 'Max. temp.',
    definition:
      'The highest temperature of each day 2 meters above the ground, averaged over each month and then over the year, in °C. ' +
      'It is the average of the daily highs, not the record of the month. ' +
      'It comes from MERRA-2, a NASA reanalysis that combines observations with an atmospheric model; ' +
      'it is neither a direct measurement nor a station reading.',
  },
  min_air_temperature: {
    label: 'Minimum temperature',
    short: 'Min. temp.',
    definition:
      'The lowest temperature of each day 2 meters above the ground, averaged over each month and then over the year, in °C. ' +
      'It is the average of the daily lows, not the record of the month. ' +
      'It comes from MERRA-2, a NASA reanalysis that combines observations with an atmospheric model; ' +
      'it is neither a direct measurement nor a station reading.',
  },

  // --- MERRA-2 M2TMNXAER (reanalysis aerosols) ---
  aerosol_optical_depth: {
    label: 'Aerosols',
    short: 'Aerosols',
    definition:
      'How much the particles suspended in the air (dust, smoke, sulfates, sea salt) dim sunlight. ' +
      'It is measured as optical depth at 550 nanometers and has no unit: the higher it is, the less light reaches the ground. ' +
      'It counts the whole column of air, not pollution at ground level. ' +
      'It comes from MERRA-2, a NASA reanalysis that assimilates satellite observations; ' +
      'it is not a direct measurement. ' +
      'The series starts in 2003: before that the reanalysis had fewer satellites, ' +
      'and the eruptions of El Chichón (1982) and Pinatubo (1991) raise the early years.',
  },
  dust_optical_depth: {
    label: 'Dust in the air',
    short: 'Dust',
    definition:
      'The part of aerosol optical depth (how much airborne particles dim sunlight, ' +
      'at 550 nanometers and with no unit) that is due to mineral dust. ' +
      'It counts the whole column of air, not pollution at ground level. ' +
      'Where there is almost no dust the value is close to zero, and a change in percent can be large without being relevant. ' +
      'It comes from MERRA-2, a NASA reanalysis that assimilates satellite observations; ' +
      'it is not a direct measurement. ' +
      'The series starts in 2003: in 2000 it jumps when new satellites start being assimilated, ' +
      'and with that jump the trend since 1980 would be an artifact.',
  },
}

/**
 * Citas de los productos de datos, por `product_short_name` del catálogo (pipeline/ATTRIBUTION.md).
 * La hoja de métodos solo muestra las de los productos que publica el catálogo.
 */
export const PRODUCT_CITATIONS: Readonly<Record<string, string>> = {
  M2TMNXSLV:
    'Global Modeling and Assimilation Office, & Pawson, S. (2015). MERRA-2 tavgM_2d_slv_Nx: 2d,Monthly mean,' +
    'Time-Averaged,Single-Level,Assimilation,Single-Level Diagnostics V5.12.4 [Data set]. ' +
    'NASA Goddard Earth Sciences Data and Information Services Center. https://doi.org/10.5067/AP1B0BA5PD2K',
  M2SMNXSLV:
    'Global Modeling and Assimilation Office (GMAO). (2015). MERRA-2 statM_2d_slv_Nx: 2d,Monthly,' +
    'Aggregated Statistics,Single-Level,Assimilation,Single-Level Diagnostics V5.12.4 [Data set]. ' +
    'Goddard Earth Sciences Data and Information Services Center (GES DISC). https://doi.org/10.5067/KVIMOMCUO83U',
  M2TMNXAER:
    'Global Modeling and Assimilation Office (GMAO). (2015). MERRA-2 tavgM_2d_aer_Nx: 2d,Monthly mean,' +
    'Time-averaged,Single-Level,Assimilation,Aerosol Diagnostics V5.12.4 [Data set]. ' +
    'Goddard Earth Sciences Data and Information Services Center (GES DISC). https://doi.org/10.5067/FH9A0MLJPC7N',
  GPM_3IMERGM:
    'Huffman, G. J., Stocker, E. F., Bolvin, D. T., Nelkin, E. J., & Tan, J. (2023). GPM IMERG Final ' +
    'Precipitation L3 1 month 0.1 degree x 0.1 degree V07 [Data set]. NASA Goddard Earth Sciences Data and ' +
    'Information Services Center. https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07',
  GLDAS_NOAH025_M:
    'Beaudoing, H., Rodell, M., & Hydrological Sciences Laboratory (HSL). (2020). GLDAS Noah Land Surface ' +
    'Model L4 monthly 0.25 x 0.25 degree, Version 2.1 [Data set]. NASA Goddard Earth Sciences Data and ' +
    'Information Services Center. https://doi.org/10.5067/SXAVCZFAQLNO',
}

/**
 * Copy for a variable: the one written here if it exists; otherwise the label and definition in the catalog
 * (in the language of the file); without a catalog, a generic one with the id.
 */
export function variableCopy(id: VariableId, info?: Pick<VariableInfo, 'label' | 'definition'> | null): VariableCopy {
  const own = VARIABLE_COPY[id]
  if (own) return own
  if (info) return { label: info.label, short: info.label, definition: info.definition }
  const label = id.replace(/_/g, ' ')
  return { label, short: label, definition: 'Variable from the NASA data catalog.' }
}

// ---------- Citations (FR-C04) ----------

/** Citation of a product; if unknown, only its name and version, without inventing authors or a DOI. */
export function productCitation(shortName: string | undefined, version: string | undefined): string {
  if (!shortName) return 'Product not declared in the catalog.'
  return PRODUCT_CITATIONS[shortName] ?? `${shortName}${version ? ` version ${version}` : ''}.`
}

// ---------- GLOSSARY (FR-C03) ----------

export const GLOSSARY = {
  slope:
    'Slope: how much the variable changes per decade. It is the median of the slopes ' +
    'between every pair of years, so one extreme year barely moves it.',
  ci:
    'Confidence interval (CI): range of slopes compatible with the data. ' +
    'If it is wide, the estimate is imprecise; if it includes zero, the trend could be null.',
  p:
    'p-value: probability of seeing an increasing or decreasing pattern at least this marked ' +
    'if there were actually no trend. The smaller it is, the harder it is to put down to chance.',
  alpha:
    'α (significance level): threshold set before looking at the data. ' +
    'If p is smaller than α, we speak of evidence of a trend.',
} as const

// ---------- UI_COPY ----------

export const UI_COPY = {
  appName: 'Trend Detective',
  tagline: 'Climate trends by state · NASA Space Apps 2026',
  welcome: 'Pick a state to see how its climate has changed over recent decades.',
  searchPlaceholder: 'Search for a state…',
  searchNoResults:
    'No state has that name. Try another one or tap it on the globe.',
  noData: 'There are no data for this region.',
  insufficientData:
    'Years are missing. With fewer than 10 complete years we do not compute a trend.',
  invalidStep:
    'We do not show a trend for this period: the series has an abrupt jump ' +
    '(for example, a change of instrument or of correction) that distorts the calculation.',
  invalidGeneric:
    'We do not show a trend for this period: the series does not meet the conditions of the method.',
  useFullPeriod: 'Use full period',
  loadError: 'We could not load the data for this state.',
  retry: 'Retry',
  close: 'Close',
  recordedInSpanish: 'Recorded by the data pipeline, in Spanish:',
  noWebgl:
    'Your browser cannot show the globe. You can carry on with the search box and the table.',
  synthetic:
    'Synthetic sample data: these are not real NASA observations.',
  notCause: 'A trend does not say why it happens or whether it will continue.',
  /** FR-C01: significance ≠ magnitude ≠ environmental relevance. */
  significanceNote:
    'A significant trend is not necessarily large or important: ' +
    'the p-value says how much evidence there is, the slope says how much it changes, ' +
    'and what that means for a place is a different question.',
  periodChosen: (from: number, to: number) =>
    `You are viewing ${from}–${to}. The result depends on the period chosen.`,
  smallRegion:
    'This state is smaller than one model cell (~50 km): ' +
    'the value also represents its neighbors.',
  legendNote:
    'Color shows the estimated change per decade, not whether that change is significant. ' +
    'With this many states, some will stand out by chance.',
  methodsCite: (source: string, retrieved: string) =>
    `Source: ${source}. Retrieved: ${retrieved}.`,
} as const

// ---------- Verdict copy ----------

const VERDICT_LABEL: Record<TrendStatus, string> = {
  increasing: 'Rising',
  decreasing: 'Falling',
  inconclusive: 'Not enough evidence',
  insufficient: 'Not enough data',
  invalid: 'Analysis not valid',
}

const NBSP = ' '

/** Decimals by unit, same as the panel: two in °C, one elsewhere. Sentence and cards show the same figure. */
function digitsFor(unit: string): number {
  return unit.includes('°') ? 2 : 1
}

/** Signed number with a decimal point: «+1.23» or «−0.45» (U+2212). A value that rounds to zero has no sign. */
function fmt(n: number, digits: number): string {
  const abs = Math.abs(n).toFixed(digits)
  if (Number(abs) === 0) return abs
  return n >= 0 ? `+${abs}` : `−${abs}`
}

/** «p = 0.012»; values below 0.001 are shown as «p < 0.001», never «0.000». */
function fmtP(p: number): string {
  if (p < 0.001) return `p${NBSP}<${NBSP}0.001`
  return `p${NBSP}=${NBSP}${p.toFixed(3)}`
}

/** Subject of the sentence. `plural` picks the verb form. A variable without an entry is named by its label. */
const SUBJECT: Readonly<Record<VariableId, { text: string; plural?: boolean }>> = {
  air_temperature: { text: 'air temperature' },
  precipitation: { text: 'precipitation' },
  soil_moisture: { text: 'soil moisture' },
  evapotranspiration: { text: 'evapotranspiration' },
  soil_temperature: { text: 'soil temperature' },
  runoff: { text: 'runoff' },
  snow_water_equivalent: { text: 'snowpack' },
  specific_humidity: { text: 'air humidity' },
  total_precipitable_water: { text: 'total water vapor' },
  total_ozone: { text: 'total ozone' },
  max_air_temperature: { text: 'maximum temperature' },
  min_air_temperature: { text: 'minimum temperature' },
  aerosol_optical_depth: { text: 'aerosols', plural: true },
  dust_optical_depth: { text: 'dust in the air' },
}

// ---------- explainTrend — four variants (SC-C02) ----------

/**
 * Plain-language explanation of an analysis result.
 *   1. increasing  — rises, with evidence
 *   2. decreasing  — falls, with evidence
 *   3. inconclusive — not enough evidence (no direction, no slope figure)
 *   4. insufficient / invalid / row === null
 * Caveats, in any state: isSynthetic, !fullPeriod, smallRegion.
 */
export function explainTrend(row: TrendRow | null, ctx: ExplainContext): Explanation {
  const caveats: string[] = []

  if (ctx.isSynthetic) caveats.push(UI_COPY.synthetic)
  if (!ctx.fullPeriod) caveats.push(UI_COPY.periodChosen(ctx.from, ctx.to))
  if (ctx.smallRegion) caveats.push(UI_COPY.smallRegion)

  // 4a: analysis not valid (e.g. a step in the series). This is NOT «years are missing».
  if (row && row.status === 'invalid') {
    return {
      verdict: VERDICT_LABEL.invalid,
      sentence: row.flags.includes('step') ? UI_COPY.invalidStep : UI_COPY.invalidGeneric,
      caveats,
    }
  }

  // 4b: no row, or not enough data
  if (!row || row.status === 'insufficient') {
    return {
      verdict: VERDICT_LABEL.insufficient,
      sentence: UI_COPY.insufficientData,
      caveats,
    }
  }

  const { status, slope_decade, ci_low, ci_high, p, n } = row

  // 3: inconclusive — no direction and no slope figure (clarification 2026-11-14)
  if (status === 'inconclusive') {
    const pStr = p !== null ? ` (${fmtP(p)})` : ''
    return {
      verdict: VERDICT_LABEL.inconclusive,
      sentence:
        `Not enough evidence of a trend in ${ctx.regionName} ` +
        `(${ctx.from}–${ctx.to}, ${n}${NBSP}years)${pStr}. ` +
        `This does not prove that there is no change.`,
      caveats,
    }
  }

  // 1 and 2: increasing / decreasing — with full figures. The unit already carries «/decade».
  const digits = digitsFor(ctx.unit)
  const level = Math.round((1 - ctx.alpha) * 100)
  const slopeStr =
    slope_decade !== null ? `${fmt(slope_decade, digits)}${NBSP}${ctx.unit}` : '(slope not available)'
  const ciStr =
    ci_low !== null && ci_high !== null
      ? ` (${level}%${NBSP}CI: ${fmt(ci_low, digits)} to ${fmt(ci_high, digits)}${NBSP}${ctx.unit})`
      : ''
  const pStr = p !== null ? `; ${fmtP(p)}` : ''

  const subject = SUBJECT[ctx.variableId] ?? { text: `the variable “${variableCopy(ctx.variableId).label}”` }
  const verb = status === 'increasing'
    ? (subject.plural ? 'rise by' : 'rises by')
    : (subject.plural ? 'fall by' : 'falls by')
  const sentence =
    `In ${ctx.regionName}, ${subject.text} ${verb} ${slopeStr}${ciStr}` +
    ` from ${ctx.from} to ${ctx.to} (${n}${NBSP}years)${pStr}. ` +
    `A pattern like this would be very unlikely if there were no trend.`

  return {
    verdict: VERDICT_LABEL[status],
    sentence,
    caveats,
  }
}

// ---------- Comparing two regions (007, FR-K08) ----------
//
// Extra rules:
// - «Not enough evidence that they differ» is NEVER worded as the trends being the same.
// - No sentence ranks the regions or judges which one is better off.
// - Opposite signs are not enough to say the trends differ: the test of the difference says that.

export const COMPARE_COPY = {
  entryLabel: 'Compare with another state',
  entryPlaceholder: 'Choose a state…',
  title: (a: string, b: string) => `${a} vs. ${b}`,
  remove: 'Remove comparison',
  differenceHeading: 'Difference between the trends',
  eachHeading: 'Each state on its own',
  chartHeading: 'Yearly values',
  startLabel: 'From',
  until: (end: number) => `to ${end}`,
  /** The pair is stored once and the difference is read in that order; it is not flipped. */
  order: (first: string, second: string) => `${first} − ${second}`,
  commonYears: (n: number) => `${n}\u00a0complete years in common`,
  notPublished:
    'The test of the difference is not published for this variable yet. ' +
    'You can read the result of each state on its own.',
  noWindow: (end: number) =>
    `The test of the difference is only published for periods that end in ${end}. ` +
    'Below is the result of each state for the period chosen.',
  showWindow: (from: number, to: number) => `View ${from}–${to}`,
  missingPair: 'There is no test of the difference for this pair of states.',
  noData: (name: string) => `There are no data for ${name} for this variable.`,
  loadError: 'We could not load the comparison data.',
  notComparable: {
    different_unit: 'Not compared: the two series are in different units.',
    different_product: 'Not compared: the two series come from different products or versions.',
    mixed_synthetic: 'Not compared: one series is a sample (synthetic) and the other is real.',
    identical_series: 'Not compared: the two series have exactly the same values.',
  } satisfies Record<NotComparableReason, string>,
  relativeBasis:
    'The difference is in percentage points: each series is expressed as a percentage of its own mean ' +
    'over the period, so that a state with high values does not weigh more than one with low values.',
  absoluteBasis: 'The difference is measured by subtracting, year by year, the value of one state from the other.',
  oppositeSigns:
    'One slope being positive and the other negative does not prove, on its own, that the trends differ: ' +
    'the test of the difference says that.',
  manyPairs: 'With this many possible pairs of states, some will show differences by chance.',
  notCause: 'A difference between trends does not say why it happens or whether it will continue.',
  method:
    'One series is subtracted from the other over the complete years they have in common, and that series of differences ' +
    'is analyzed with the same method as each state: Theil-Sen slope, Sen interval and Mann-Kendall test ' +
    'corrected for autocorrelation. This accounts for the fact that two nearby states share much of their climate.',
} as const

export interface CompareContext {
  /** Names in file order: the difference is `firstName − secondName`. */
  firstName: string
  secondName: string
  /** Unit of the difference, already with its time base: «°C/decade», «percentage points/decade». */
  unit: string
  basis: CompareBasis
  from: number
  to: number
  alpha: number
  /** Minimum number of common years to compare (`catalog.period.min_window_years`). */
  minYears: number
  /** Individual result of each region for the same period, if known: only to describe the pattern. */
  first: { status: TrendStatus; slope: number | null } | null
  second: { status: TrendStatus; slope: number | null } | null
  smallRegion: boolean
  isSynthetic: boolean
}

export interface ComparisonExplanation {
  /** Short verdict of the difference. */
  verdict: string
  /** Plain-language sentence, only with figures from the file. */
  sentence: string
  /** Description of the two individual results (same or opposite sign; with evidence or not), or `null`. */
  pattern: string | null
  caveats: string[]
}

const DIFFERENCE_VERDICT: Record<DifferenceRow['status'], string> = {
  differ: 'The trends differ',
  inconclusive: 'Not enough evidence that they differ',
  insufficient: 'Not enough data to compare',
  invalid: 'Comparison not valid',
}

const HAS_EVIDENCE: ReadonlySet<TrendStatus> = new Set(['increasing', 'decreasing'])
const DIRECTION: Partial<Record<TrendStatus, string>> = { increasing: 'rises', decreasing: 'falls' }
const DIRECTION_BOTH: Partial<Record<TrendStatus, string>> = { increasing: 'rise', decreasing: 'fall' }

/**
 * Pattern of the two individual results. It only reads their status and the sign of their slope.
 * `opposite` flags opposite signs, to add the caveat that this is not enough.
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
      text: `${ctx.firstName} ${DIRECTION[first.status]} and ${ctx.secondName} ${DIRECTION[second.status]}, ` +
        'each with evidence of a trend.',
    }
  }
  if (both) {
    return { opposite, text: `${ctx.firstName} and ${ctx.secondName} both ${DIRECTION_BOTH[first.status]}, with evidence of a trend.` }
  }
  return {
    opposite,
    text: opposite
      ? 'The estimated slopes have opposite signs, but at least one does not have enough evidence of a trend.'
      : 'The estimated slopes have the same sign, but at least one does not have enough evidence of a trend.',
  }
}

/**
 * Explanation of the test of the difference between the trends of two regions.
 * `row` is the row already computed by the pipeline (`pickComparison`); here it is only put into words.
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
        `Years in common are missing: ${ctx.firstName} and ${ctx.secondName} share ${row.n}${NBSP}complete years ` +
        `from ${ctx.from} to ${ctx.to}. With fewer than ${ctx.minYears} we do not compare trends.`,
      pattern: null,
      caveats,
    }
  }
  if (row.status === 'invalid') {
    return {
      verdict,
      sentence: 'We do not show the difference for this period: the two series do not meet the conditions of the method.',
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
        `Not enough evidence that the trends of ${ctx.firstName} and ${ctx.secondName} differ ` +
        `(${period})${pStr}. This does not prove that they change alike.`,
      pattern: pattern?.text ?? null,
      caveats,
    }
  }

  const level = Math.round((1 - ctx.alpha) * 100)
  // Two decimals, like the figures in the comparison view.
  const digits = 2
  const diffStr = row.diff_decade !== null ? `${fmt(row.diff_decade, digits)}${NBSP}${ctx.unit}` : '(difference not available)'
  const ciStr = row.ci_low !== null && row.ci_high !== null
    ? ` (${level}%${NBSP}CI: ${fmt(row.ci_low, digits)} to ${fmt(row.ci_high, digits)})`
    : ''
  const pStr = row.p !== null ? `; ${fmtP(row.p)}` : ''
  caveats.push(COMPARE_COPY.manyPairs, COMPARE_COPY.notCause)
  return {
    verdict,
    sentence:
      `Difference (${pair}): ${diffStr}${ciStr}; ${period}${pStr}. ` +
      'A divergence like this would be very unlikely if the two trends were the same.',
    pattern: pattern?.text ?? null,
    caveats,
  }
}
