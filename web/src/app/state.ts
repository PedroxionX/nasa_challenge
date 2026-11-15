/**
 * Estado único de la aplicación (región, región de comparación, variable, periodo, WebGL), sincronizado con la URL:
 *   ?region=MX-BCN&vs=US-TX&var=air_temperature&from=1980&to=2025
 * Las variables válidas son las del catálogo (lista abierta, 007 FR-K14); hasta que carga, `var` se acepta por formato.
 * `vs` es la segunda región de la comparación (007): exige `region` y debe ser distinta de ella.
 * El periodo se valida contra el de la variable activa (cada producto tiene el suyo).
 * Los ids anteriores (?var=T2M, ?var=PRECTOTCORR) se traducen sin aviso.
 * Solo 002 edita este archivo. Los componentes no reciben props: leen y escriben con useAppState().
 * Valores inexistentes en la URL se sustituyen por los predeterminados y se avisa (useStateNotice).
 */
import { useSyncExternalStore } from 'react'
import { LEGACY_VARIABLE_IDS, VARIABLE_ID_FORMAT, type VariableId } from '../lib/data'
import { detectWebGL } from './webgl'

export type { VariableId }

export interface AppState {
  regionId: string | null
  /** Segunda región de la comparación (007); `null` si no se compara. Nunca igual a `regionId`. */
  compareId: string | null
  variableId: VariableId
  from: number
  to: number
  webgl: boolean
}

export interface AppActions {
  setRegion(id: string | null): void
  /** Elige o quita (`null`) la segunda región. Se ignora sin región principal o si es la misma. */
  setCompare(id: string | null): void
  setVariable(id: VariableId): void
  setPeriod(from: number, to: number): void
  resetPeriod(): void
}

export interface YearRange { firstYear: number; lastYear: number }

/** Límites que fija el catálogo; hasta que se carga se usan los del contrato. */
export interface StateLimits extends YearRange {
  /** `null` mientras no se conoce el catálogo: entonces solo se comprueba el formato del id. */
  regionIds: ReadonlySet<string> | null
  /** Variables del catálogo; `null` mientras no se conoce: entonces solo se comprueba el formato del id. */
  variableIds?: ReadonlySet<string> | null
  /** Periodo propio de cada variable; si falta, vale firstYear–lastYear. */
  periods?: Partial<Record<VariableId, YearRange>>
}

export const DEFAULT_VARIABLE: VariableId = 'air_temperature'
const CONTRACT_LIMITS: StateLimits = { firstYear: 1980, lastYear: 2025, regionIds: null }
const REGION_ID_FORMAT = /^[A-Z]{2}-[A-Z0-9]{1,3}$/ // ISO 3166-2

type UrlState = Omit<AppState, 'webgl'>

// ---------- Funciones puras (probadas por separado) ----------

function variableOk(id: string, limits: StateLimits): boolean {
  return limits.variableIds ? limits.variableIds.has(id) : VARIABLE_ID_FORMAT.test(id)
}

/** La predeterminada si el catálogo la trae; si no, la primera del catálogo. */
function defaultVariable(limits: StateLimits): VariableId {
  const ids = limits.variableIds
  if (!ids || ids.has(DEFAULT_VARIABLE)) return DEFAULT_VARIABLE
  return ids.values().next().value ?? DEFAULT_VARIABLE
}

/** Periodo válido para una variable. */
export function periodFor(variableId: VariableId, l: StateLimits): YearRange {
  return l.periods?.[variableId] ?? { firstYear: l.firstYear, lastYear: l.lastYear }
}

function regionOk(id: string, limits: StateLimits): boolean {
  return limits.regionIds ? limits.regionIds.has(id) : REGION_ID_FORMAT.test(id)
}

function yearsOk(from: number, to: number, l: YearRange): boolean {
  return Number.isInteger(from) && Number.isInteger(to) && l.firstYear <= from && from <= to && to <= l.lastYear
}

/** Lee la URL; lo inválido vuelve al predeterminado y se describe en `notices`. */
export function parseSearch(search: string, limits: StateLimits): { state: UrlState; notices: string[] } {
  const q = new URLSearchParams(search)
  const notices: string[] = []

  let regionId = q.get('region')
  if (regionId !== null && !regionOk(regionId, limits)) {
    notices.push(`The region “${regionId}” does not exist; choose another one.`)
    regionId = null
  }

  // Segunda región (007): solo tiene sentido con una región principal distinta.
  let compareId = q.get('vs')
  if (compareId !== null) {
    if (!regionOk(compareId, limits)) {
      notices.push(`The region “${compareId}” does not exist; the comparison was removed.`)
      compareId = null
    } else if (regionId === null) {
      compareId = null
    } else if (compareId === regionId) {
      notices.push('Comparing needs two different regions; the comparison was removed.')
      compareId = null
    }
  }

  const rawVar = q.get('var')
  let variableId = defaultVariable(limits)
  if (rawVar !== null) {
    const legacy = Object.hasOwn(LEGACY_VARIABLE_IDS, rawVar) ? LEGACY_VARIABLE_IDS[rawVar] : null
    if (legacy !== null && variableOk(legacy, limits)) variableId = legacy
    else if (variableOk(rawVar, limits)) variableId = rawVar
    else notices.push(`The variable “${rawVar}” does not exist; showing the default one.`)
  }

  const period = periodFor(variableId, limits)
  let from = period.firstYear
  let to = period.lastYear
  const rawFrom = q.get('from')
  const rawTo = q.get('to')
  if (rawFrom !== null || rawTo !== null) {
    const f = rawFrom === null ? from : Number(rawFrom)
    const t = rawTo === null ? to : Number(rawTo)
    if (yearsOk(f, t, period)) { from = f; to = t }
    else notices.push(`The period ${rawFrom ?? '…'}–${rawTo ?? '…'} is not valid; showing ${from}–${to}.`)
  }

  return { state: { regionId, compareId, variableId, from, to }, notices }
}

/** Escribe el estado en la query conservando otros parámetros. Sin `compareId` el enlace no lleva comparación. */
export function toSearch(s: Omit<UrlState, 'compareId'> & { compareId?: string | null }, current = ''): string {
  const q = new URLSearchParams(current)
  if (s.regionId) q.set('region', s.regionId)
  else q.delete('region')
  if (s.regionId && s.compareId && s.compareId !== s.regionId) q.set('vs', s.compareId)
  else q.delete('vs')
  q.set('var', s.variableId)
  q.set('from', String(s.from))
  q.set('to', String(s.to))
  return `?${q.toString()}`
}

// ---------- Almacén ----------

let limits: StateLimits = CONTRACT_LIMITS
let state: AppState
let notice: string | null = null
/** ¿El periodo vino de la URL o lo eligió el usuario? Si no, sigue los límites del catálogo. */
let periodChosen = false
const listeners = new Set<() => void>()

function init() {
  const parsed = parseSearch(window.location.search, limits)
  state = { ...parsed.state, webgl: detectWebGL() }
  notice = parsed.notices[0] ?? null
  const q = new URLSearchParams(window.location.search)
  periodChosen = q.has('from') || q.has('to')
}
init()

function emit() {
  for (const l of listeners) l()
}

function writeUrl() {
  const search = toSearch(state, window.location.search)
  if (search !== window.location.search) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }
}

function update(patch: Partial<AppState>) {
  const next = { ...state, ...patch }
  if (
    next.regionId === state.regionId && next.compareId === state.compareId && next.variableId === state.variableId &&
    next.from === state.from && next.to === state.to && next.webgl === state.webgl
  ) return
  state = next
  writeUrl()
  emit()
}

const currentPeriod = () => periodFor(state.variableId, limits)
const clampTo = (y: number, p: YearRange) => Math.min(p.lastYear, Math.max(p.firstYear, Math.round(y)))

const actions: AppActions = {
  setRegion(id) {
    if (id !== null && !regionOk(id, limits)) {
      console.warn(`setRegion: id desconocido «${id}»`)
      return
    }
    // Sin región principal no hay comparación; si la nueva principal es la comparada, la comparación se quita.
    update({ regionId: id, compareId: id === null || id === state.compareId ? null : state.compareId })
  },
  setCompare(id) {
    if (id !== null && (!regionOk(id, limits) || state.regionId === null || id === state.regionId)) {
      console.warn(`setCompare: «${id}» no se puede comparar con «${String(state.regionId)}»`)
      return
    }
    update({ compareId: id })
  },
  setVariable(id) {
    if (!variableOk(id, limits)) {
      console.warn(`setVariable: variable desconocida «${String(id)}»`)
      return
    }
    const p = periodFor(id, limits)
    // Sin periodo elegido: el completo de la nueva variable. Con periodo elegido: se recorta al de la variable.
    if (!periodChosen) update({ variableId: id, from: p.firstYear, to: p.lastYear })
    else update({ variableId: id, from: clampTo(state.from, p), to: clampTo(state.to, p) })
  },
  setPeriod(from, to) {
    const p = currentPeriod()
    const [a, b] = [clampTo(from, p), clampTo(to, p)]
    periodChosen = true
    update({ from: Math.min(a, b), to: Math.max(a, b) })
  },
  resetPeriod() {
    periodChosen = false
    const p = currentPeriod()
    update({ from: p.firstYear, to: p.lastYear })
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  // Atrás/adelante del navegador: volver a leer la URL.
  window.addEventListener('popstate', () => {
    const parsed = parseSearch(window.location.search, limits)
    state = { ...parsed.state, webgl: state.webgl }
    notice = parsed.notices[0] ?? notice
    emit()
  })
}

// ---------- API pública ----------

/** Estado compartido + acciones. Cualquier componente puede usarlo sin props. */
export function useAppState(): AppState & AppActions {
  const s = useSyncExternalStore(subscribe, () => state)
  return { ...s, ...actions }
}

/** Aviso pendiente por un valor de URL inválido, o `null`. Lo muestra el armazón. */
export function useStateNotice(): string | null {
  return useSyncExternalStore(subscribe, () => notice)
}

export function dismissStateNotice(): void {
  if (notice === null) return
  notice = null
  emit()
}

/**
 * Lo llama el armazón cuando carga el catálogo: fija años (globales y por variable) y regiones válidos
 * y vuelve a validar lo que vino en la URL.
 */
export function configureState(next: {
  firstYear: number
  lastYear: number
  regionIds: Iterable<string>
  /** Ids de `catalog.variables`; si faltan se usan las claves de `periods`. */
  variableIds?: Iterable<VariableId>
  periods?: Partial<Record<VariableId, YearRange>>
}): void {
  const variableIds = next.variableIds ?? (next.periods ? Object.keys(next.periods) : null)
  limits = {
    firstYear: next.firstYear,
    lastYear: next.lastYear,
    regionIds: new Set(next.regionIds),
    variableIds: variableIds ? new Set(variableIds) : null,
    periods: next.periods,
  }
  // Si el periodo no lo eligió nadie, no se valida (era el predeterminado): se adopta el de la variable sin avisar.
  const q = new URLSearchParams(toSearch(state))
  if (!periodChosen) { q.delete('from'); q.delete('to') }
  const parsed = parseSearch(`?${q.toString()}`, limits)
  notice = parsed.notices[0] ?? notice
  state = { ...parsed.state, webgl: state.webgl }
  const p = currentPeriod()
  if (!periodChosen) state = { ...state, from: p.firstYear, to: p.lastYear }
  writeUrl()
  emit()
}

/** El globo (005) lo llama si WebGL falla después de arrancar (p. ej. contexto perdido o texturas). */
export function markWebglUnavailable(): void {
  update({ webgl: false })
}

/**
 * Periodo completo de la variable activa (para «restablecer» y controles de rango) y regiones válidas.
 * `firstYear`/`lastYear` ya son los de la variable activa.
 */
export function getLimits(): Readonly<StateLimits> {
  return { ...limits, ...currentPeriod() }
}
