/**
 * Carga tipada de los archivos que produce el pipeline (003).
 * Tipos = contrato de specs/001-trend-explorer-mvp/contracts/data-files.md. Solo 002 edita este archivo
 * (007 añadió, avisando, la lista abierta de variables y los lectores de `compare/`);
 * cambiar un tipo exige cambiar antes el contrato y avisar al equipo.
 *
 * El navegador NO calcula estadística: solo lee y elige la fila ya calculada (constitución, principio I).
 */
import { asset } from './assets'

// ---------- Tipos del contrato ----------

export const SCHEMA_VERSION = 1
/**
 * Id neutral y estable de una variable (contrato, revisión 2026-11-14), p. ej. `air_temperature`.
 * La lista de variables NO está en el código: sale de `catalog.variables[].id` (ver `variableIds`),
 * así una variable nueva del pipeline aparece en la web sin tocarla.
 */
export type VariableId = string
/** Forma de un id de variable; sirve para validar la URL antes de que llegue el catálogo. */
export const VARIABLE_ID_FORMAT = /^[a-z][a-z0-9_]*$/
/** Ids anteriores (nombres de NASA POWER) que pueden llegar en enlaces viejos: ?var=T2M. */
export const LEGACY_VARIABLE_IDS: Readonly<Record<string, VariableId>> = {
  T2M: 'air_temperature',
  PRECTOTCORR: 'precipitation',
}

export type CountryCode = 'MX' | 'US'
export type TrendStatus = 'increasing' | 'decreasing' | 'inconclusive' | 'insufficient' | 'invalid'
export type TrendFlag = 'autocorr' | 'step' | 'short' | 'ties' | 'small_region'

export interface VariableInfo {
  id: VariableId
  label: string
  definition: string
  /** Hoy `reanalysis` u `observation`; una variable nueva puede traer otro valor y se muestra tal cual. */
  kind: string
  unit_annual: string
  /** Hoy `mean_day_weighted` o `sum_from_rate`; igual que `kind`, lista abierta. */
  aggregation: string
  relative_change: boolean
  /** Periodo propio de la variable (primer y último año completos). Si falta, vale `catalog.period`. */
  first_year?: number
  last_complete_year?: number
  /** Producto de origen, p. ej. «M2TMNXSLV» / «5.12.4» o «GPM_3IMERGM» / «07». */
  product_short_name?: string
  product_version?: string
}

export interface RegionInfo {
  id: string
  name: string
  country: CountryCode
  n_cells: number
  small_region: boolean
}

export interface Catalog {
  schema_version: number
  built_at_utc: string
  alpha: number
  /** Envolvente de los periodos de todas las variables (para lectores anteriores). Usar `variablePeriod`. */
  period: { first_year: number; last_complete_year: number; min_window_years: number }
  method: { slope: string; test: string; interval: string; contrast: string }
  variables: VariableInfo[]
  regions: RegionInfo[]
}

export interface Provenance {
  source: string
  product: string
  api_version: string
  parameter: string
  unit_declared: string
  grid: string
  spatial_method: string
  n_cells: number
  retrieved_at_utc: string
  requests: string
  transformations: string[]
  is_synthetic: boolean
  /** Revisión 2026-11-14: los escribe siempre el pipeline con fuentes de GES DISC; ausentes en archivos anteriores. */
  short_name?: string
  version?: string
  doi?: string | null
  /** Número de gránulos leídos para esta serie. */
  granules?: number
}

export const WINDOW_COLUMNS = [
  'start', 'end', 'n', 'slope_decade', 'ci_low', 'ci_high', 'p', 'p_uncorrected',
  'r1', 'ols_slope_decade', 'ols_p', 'status', 'flags',
] as const

/** Columnas opcionales al final de `windows.columns` (pedido de 004, publicadas por 003): las cuatro o ninguna. */
export const OPTIONAL_WINDOW_COLUMNS = ['line_mid', 'slope_decade_pct', 'ci_low_pct', 'ci_high_pct'] as const

export interface SeriesFile {
  schema_version: number
  region: string
  variable: VariableId
  unit: string
  years: number[]
  values: number[]
  excluded_years: number[]
  partial_year?: { year: number; months_valid: number } | null
  provenance: Provenance
  diagnostics: { step_year: number | null; autocorr_significant: boolean }
  windows: { columns: string[]; rows: unknown[][] }
}

/** Una fila de `windows` ya convertida en objeto. Los nulos significan «no evaluable». */
export interface TrendRow {
  start: number
  end: number
  n: number
  slope_decade: number | null
  ci_low: number | null
  ci_high: number | null
  p: number | null
  p_uncorrected: number | null
  r1: number | null
  ols_slope_decade: number | null
  ols_p: number | null
  status: TrendStatus
  flags: TrendFlag[]
  /**
   * Opcionales: `undefined` si el archivo no publica la columna; `null` si no es evaluable.
   * line_mid: recta de Theil-Sen en el año central, en la unidad de la serie.
   * *_pct: % por década respecto a la media de la ventana (solo variables con relative_change).
   */
  line_mid?: number | null
  slope_decade_pct?: number | null
  ci_low_pct?: number | null
  ci_high_pct?: number | null
}

export interface MapFile {
  schema_version: number
  variable: VariableId
  unit: string
  regions: string[]
  /**
   * Clave `"desde-hasta"`; `windows[clave][i]` es el cambio por década de `regions[i]` o `null`:
   * `slope_decade` si la variable no tiene relative_change; `slope_decade_pct` (unit «%/década») si lo tiene.
   */
  windows: Record<string, (number | null)[]>
  classes: { breaks: number[]; labels: string[] }
}

// ---------- Comparación de dos regiones (007; contrato en specs/007-region-comparison/contracts/compare-files.md) ----------

export type DifferenceStatus = 'differ' | 'inconclusive' | 'insufficient' | 'invalid'
export type NotComparableReason = 'different_unit' | 'different_product' | 'mixed_synthetic' | 'identical_series'
/** `absolute`: diferencia en `unit_annual` por década. `relative`: series en % de su media; puntos porcentuales por década. */
export type CompareBasis = 'absolute' | 'relative'

export interface CompareVariableInfo {
  basis: CompareBasis
  unit: string
  /** Año final de todas las ventanas publicadas (el último año completo de la variable). */
  end: number
  /** Años iniciales con fila. */
  starts: number[]
  n_pairs: number
  series_sha256: string
}

export interface CompareIndex {
  schema_version: number
  built_at_utc: string
  alpha: number
  method: { series: string; slope: string; test: string; interval: string }
  /** Una variable del catálogo puede faltar aquí: su prueba de la diferencia aún no se ha publicado. */
  variables: Record<VariableId, CompareVariableInfo>
}

export const COMPARE_COLUMNS = ['n', 'diff_decade', 'ci_low', 'ci_high', 'p', 'status'] as const

export interface CompareFile {
  schema_version: number
  variable: VariableId
  /** Región del archivo: la primera del par. La diferencia es siempre `region − asociada`. */
  region: string
  basis: CompareBasis
  unit: string
  end: number
  starts: number[]
  columns: string[]
  /** `partners[id][i]` es la fila de la ventana `starts[i]`–`end`. Solo regiones con id posterior a `region`. */
  partners: Record<string, unknown[][]>
  not_comparable?: Record<string, NotComparableReason>
}

/** Fila de la prueba de la diferencia ya convertida en objeto. Los nulos significan «no evaluable». */
export interface DifferenceRow {
  start: number
  end: number
  /** Años completos comunes de la ventana. */
  n: number
  diff_decade: number | null
  ci_low: number | null
  ci_high: number | null
  p: number | null
  status: DifferenceStatus
}

// ---------- Errores ----------

export type DataErrorKind = 'not_found' | 'network' | 'parse' | 'schema_version' | 'invalid'

/** Error recuperable: la interfaz lo muestra y puede reintentar (la caché no guarda fallos). */
export class DataError extends Error {
  readonly kind: DataErrorKind
  readonly url: string
  constructor(kind: DataErrorKind, url: string, message: string) {
    super(message)
    this.name = 'DataError'
    this.kind = kind
    this.url = url
  }
}

export const isDataError = (e: unknown): e is DataError => e instanceof DataError

// ---------- Carga ----------

const cache = new Map<string, Promise<unknown>>()

/** Vacía la caché (para pruebas o para forzar una recarga). */
export function clearDataCache(): void {
  cache.clear()
}

async function fetchJson(url: string): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new DataError('network', url, `No se pudo descargar ${url}`)
  }
  if (res.status === 404) throw new DataError('not_found', url, `No existe ${url}`)
  if (!res.ok) throw new DataError('network', url, `${url} respondió ${res.status}`)
  // Vite (dev y preview) y los alojamientos de SPA (Vercel, Netlify…) no dan 404 a un archivo ausente:
  // responden 200 con index.html. Eso es «no existe», no un JSON roto (aviso de 004, 2026-11-14).
  if ((res.headers.get('content-type') ?? '').includes('text/html')) {
    throw new DataError('not_found', url, `No existe ${url} (el servidor devolvió una página HTML)`)
  }
  let text: string
  try {
    text = await res.text()
  } catch {
    throw new DataError('network', url, `No se pudo leer ${url}`)
  }
  if (/^\s*</.test(text)) throw new DataError('not_found', url, `No existe ${url} (el servidor devolvió una página HTML)`)
  try {
    return JSON.parse(text)
  } catch {
    throw new DataError('parse', url, `${url} no es JSON válido`)
  }
}

function load<T>(path: string, validate: (raw: unknown, url: string) => T): Promise<T> {
  const url = asset(path)
  let pending = cache.get(url) as Promise<T> | undefined
  if (!pending) {
    pending = fetchJson(url).then(raw => validate(raw, url))
    pending.catch(() => cache.delete(url)) // un fallo no se queda en caché: se puede reintentar
    cache.set(url, pending)
  }
  return pending
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function checkHeader(raw: unknown, url: string, fields: string[]): Record<string, unknown> {
  if (!isObj(raw)) throw new DataError('invalid', url, `${url}: se esperaba un objeto`)
  if (raw.schema_version !== SCHEMA_VERSION) {
    throw new DataError('schema_version', url, `${url}: schema_version ${String(raw.schema_version)} no admitida (se espera ${SCHEMA_VERSION})`)
  }
  for (const f of fields) {
    if (!(f in raw)) throw new DataError('invalid', url, `${url}: falta el campo «${f}»`)
  }
  return raw
}

function validateCatalog(raw: unknown, url: string): Catalog {
  const c = checkHeader(raw, url, ['alpha', 'period', 'method', 'variables', 'regions'])
  if (!Array.isArray(c.variables) || !Array.isArray(c.regions)) {
    throw new DataError('invalid', url, `${url}: «variables» y «regions» deben ser listas`)
  }
  return c as unknown as Catalog
}

function validateSeries(raw: unknown, url: string): SeriesFile {
  const s = checkHeader(raw, url, ['region', 'variable', 'years', 'values', 'provenance', 'windows'])
  if (!Array.isArray(s.years) || !Array.isArray(s.values) || s.years.length !== s.values.length) {
    throw new DataError('invalid', url, `${url}: «years» y «values» deben ser listas de igual longitud`)
  }
  if (!isObj(s.provenance) || typeof s.provenance.is_synthetic !== 'boolean') {
    throw new DataError('invalid', url, `${url}: falta la procedencia o «is_synthetic»`)
  }
  const w = s.windows
  if (!isObj(w) || !Array.isArray(w.columns) || !Array.isArray(w.rows)) {
    throw new DataError('invalid', url, `${url}: «windows» mal formado`)
  }
  const missing = WINDOW_COLUMNS.filter(col => !(w.columns as string[]).includes(col))
  if (missing.length) throw new DataError('invalid', url, `${url}: faltan columnas ${missing.join(', ')}`)
  return s as unknown as SeriesFile
}

function validateMap(raw: unknown, url: string): MapFile {
  const m = checkHeader(raw, url, ['variable', 'regions', 'windows', 'classes'])
  if (!Array.isArray(m.regions) || !isObj(m.windows)) {
    throw new DataError('invalid', url, `${url}: «regions» o «windows» mal formados`)
  }
  for (const [key, values] of Object.entries(m.windows)) {
    if (!Array.isArray(values) || values.length !== m.regions.length) {
      throw new DataError('invalid', url, `${url}: la ventana ${key} no tiene un valor por región`)
    }
  }
  return m as unknown as MapFile
}

export function loadCatalog(): Promise<Catalog> {
  return load('data/trends/catalog.json', validateCatalog)
}

export function loadSeries(variableId: VariableId, regionId: string): Promise<SeriesFile> {
  return load(`data/trends/series/${variableId}/${encodeURIComponent(regionId)}.json`, validateSeries)
}

export function loadMap(variableId: VariableId): Promise<MapFile> {
  return load(`data/trends/map/${variableId}.json`, validateMap)
}

// ---------- Comparación (007) ----------

function validateCompareIndex(raw: unknown, url: string): CompareIndex {
  const c = checkHeader(raw, url, ['alpha', 'method', 'variables'])
  if (!isObj(c.variables)) throw new DataError('invalid', url, `${url}: «variables» debe ser un objeto`)
  for (const [id, v] of Object.entries(c.variables)) {
    if (!isObj(v) || !Array.isArray(v.starts) || typeof v.end !== 'number' || typeof v.unit !== 'string') {
      throw new DataError('invalid', url, `${url}: la variable ${id} está mal formada`)
    }
  }
  return c as unknown as CompareIndex
}

function validateCompareFile(raw: unknown, url: string): CompareFile {
  const c = checkHeader(raw, url, ['variable', 'region', 'basis', 'unit', 'end', 'starts', 'columns', 'partners'])
  if (!Array.isArray(c.starts) || !Array.isArray(c.columns) || !isObj(c.partners)) {
    throw new DataError('invalid', url, `${url}: «starts», «columns» o «partners» mal formados`)
  }
  const missing = COMPARE_COLUMNS.filter(col => !(c.columns as string[]).includes(col))
  if (missing.length) throw new DataError('invalid', url, `${url}: faltan columnas ${missing.join(', ')}`)
  for (const [id, rows] of Object.entries(c.partners)) {
    if (!Array.isArray(rows) || rows.length !== c.starts.length) {
      throw new DataError('invalid', url, `${url}: ${id} no tiene una fila por año inicial`)
    }
  }
  return c as unknown as CompareFile
}

/** «No existe» significa «aún no publicado», no un error: se devuelve `null`. */
const nullIfMissing = <T>(pending: Promise<T>): Promise<T | null> =>
  pending.catch((e: unknown) => {
    if (isDataError(e) && e.kind === 'not_found') return null
    throw e
  })

/** Qué variables tienen publicada la prueba de la diferencia; `null` si no se ha publicado ninguna. */
export function loadCompareIndex(): Promise<CompareIndex | null> {
  return nullIfMissing(load('data/trends/compare/index.json', validateCompareIndex))
}

/** Orden en que se guarda un par: primero el id que va antes alfabéticamente (ids ASCII). */
export function pairOrder(a: string, b: string): [first: string, second: string] {
  return a < b ? [a, b] : [b, a]
}

/** Archivo que contiene el par, sea cual sea el orden en que se pidan las regiones; `null` si no está publicado. */
export function loadComparison(variableId: VariableId, regionA: string, regionB: string): Promise<CompareFile | null> {
  const [first] = pairOrder(regionA, regionB)
  return nullIfMissing(load(`data/trends/compare/${variableId}/${encodeURIComponent(first)}.json`, validateCompareFile))
}

export type PairLookup =
  /** Hay fila para el periodo. La diferencia es `first − second`, en el orden del archivo; no se invierte. */
  | { kind: 'row'; first: string; second: string; row: DifferenceRow }
  | { kind: 'not_comparable'; first: string; second: string; reason: NotComparableReason }
  /** El par existe, pero ese periodo no tiene prueba publicada (solo `starts`–`end`). */
  | { kind: 'no_window'; first: string; second: string }
  /** El par no figura en el archivo (p. ej. una región sin serie). */
  | { kind: 'missing' }

/**
 * Busca la fila ya calculada del par para `from`–`to`. No calcula nada ni cambia el signo:
 * `second` es la región asociada dentro del archivo de `first`.
 */
export function pickComparison(file: CompareFile, regionA: string, regionB: string, from: number, to: number): PairLookup {
  const [first, second] = pairOrder(regionA, regionB)
  if (file.region !== first) return { kind: 'missing' }
  const reason = file.not_comparable?.[second]
  if (reason) return { kind: 'not_comparable', first, second, reason }
  const rows = file.partners[second]
  if (!rows) return { kind: 'missing' }
  const i = to === file.end ? file.starts.indexOf(from) : -1
  if (i < 0) return { kind: 'no_window', first, second }
  const raw = rows[i]
  const cell = (col: (typeof COMPARE_COLUMNS)[number]) => raw[file.columns.indexOf(col)] ?? null
  return {
    kind: 'row', first, second,
    row: {
      start: from, end: to,
      n: cell('n') as number,
      diff_decade: cell('diff_decade') as number | null,
      ci_low: cell('ci_low') as number | null,
      ci_high: cell('ci_high') as number | null,
      p: cell('p') as number | null,
      status: cell('status') as DifferenceStatus,
    },
  }
}

/** Periodo de cada variable del catálogo, para `configureState`. */
export function variablePeriods(catalog: Catalog): Record<VariableId, { firstYear: number; lastYear: number }> {
  return Object.fromEntries(catalog.variables.map(v => [v.id, variablePeriod(catalog, v.id)]))
}

// ---------- Selección de ventana ----------

/** Clave de `MapFile.windows` para un periodo. */
export const windowKey = (from: number, to: number) => `${from}-${to}`

/**
 * Devuelve la fila ya calculada para `from`–`to`, o `null` si no existe
 * (periodo de menos de 10 años o fuera de la serie) ⇒ la interfaz muestra «datos insuficientes».
 */
export function pickWindow(series: SeriesFile, from: number, to: number): TrendRow | null {
  const { columns, rows } = series.windows
  const iStart = columns.indexOf('start')
  const iEnd = columns.indexOf('end')
  const row = rows.find(r => r[iStart] === from && r[iEnd] === to)
  if (!row) return null
  const out: Record<string, unknown> = {}
  for (const col of WINDOW_COLUMNS) out[col] = row[columns.indexOf(col)] ?? null
  for (const col of OPTIONAL_WINDOW_COLUMNS) {
    const i = columns.indexOf(col)
    if (i >= 0) out[col] = row[i] ?? null
  }
  if (!Array.isArray(out.flags)) out.flags = []
  return out as unknown as TrendRow
}

/** Ids de las variables que publica el catálogo, en su orden. */
export function variableIds(catalog: Catalog): VariableId[] {
  return catalog.variables.map(v => v.id)
}

/** Periodo de una variable: el suyo si el catálogo lo declara; si no, el global. */
export function variablePeriod(catalog: Catalog, variableId: VariableId): { firstYear: number; lastYear: number } {
  const v = catalog.variables.find(x => x.id === variableId)
  return {
    firstYear: v?.first_year ?? catalog.period.first_year,
    lastYear: v?.last_complete_year ?? catalog.period.last_complete_year,
  }
}
