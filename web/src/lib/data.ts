/**
 * Carga tipada de los archivos que produce el pipeline (003).
 * Tipos = contrato de specs/001-trend-explorer-mvp/contracts/data-files.md. Solo 002 edita este archivo;
 * cambiar un tipo exige cambiar antes el contrato y avisar al equipo.
 *
 * El navegador NO calcula estadística: solo lee y elige la fila ya calculada (constitución, principio I).
 */
import { asset } from './assets'

// ---------- Tipos del contrato ----------

export const SCHEMA_VERSION = 1
export const VARIABLE_IDS = ['T2M', 'PRECTOTCORR'] as const
export type VariableId = (typeof VARIABLE_IDS)[number]

export type CountryCode = 'MX' | 'US'
export type TrendStatus = 'increasing' | 'decreasing' | 'inconclusive' | 'insufficient' | 'invalid'
export type TrendFlag = 'autocorr' | 'step' | 'short' | 'ties' | 'small_region'

export interface VariableInfo {
  id: VariableId
  label: string
  definition: string
  kind: 'reanalysis' | 'observation'
  unit_annual: string
  aggregation: 'mean_day_weighted' | 'sum_from_rate'
  relative_change: boolean
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
}

export const WINDOW_COLUMNS = [
  'start', 'end', 'n', 'slope_decade', 'ci_low', 'ci_high', 'p', 'p_uncorrected',
  'r1', 'ols_slope_decade', 'ols_p', 'status', 'flags',
] as const

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
}

export interface MapFile {
  schema_version: number
  variable: VariableId
  unit: string
  regions: string[]
  /** Clave `"desde-hasta"`; `windows[clave][i]` es la pendiente por década de `regions[i]` o `null`. */
  windows: Record<string, (number | null)[]>
  classes: { breaks: number[]; labels: string[] }
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
  try {
    return await res.json()
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
  if (!Array.isArray(out.flags)) out.flags = []
  return out as unknown as TrendRow
}
