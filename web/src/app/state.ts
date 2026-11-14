/**
 * Estado único de la aplicación (región, variable, periodo, WebGL), sincronizado con la URL:
 *   ?region=MX-BCN&var=air_temperature&from=1980&to=2025
 * El periodo se valida contra el de la variable activa (cada producto tiene el suyo).
 * Los ids anteriores (?var=T2M, ?var=PRECTOTCORR) se traducen sin aviso.
 * Solo 002 edita este archivo. Los componentes no reciben props: leen y escriben con useAppState().
 * Valores inexistentes en la URL se sustituyen por los predeterminados y se avisa (useStateNotice).
 */
import { useSyncExternalStore } from 'react'
import { LEGACY_VARIABLE_IDS, VARIABLE_IDS, type VariableId } from '../lib/data'
import { detectWebGL } from './webgl'

export type { VariableId }

export interface AppState {
  regionId: string | null
  variableId: VariableId
  from: number
  to: number
  webgl: boolean
}

export interface AppActions {
  setRegion(id: string | null): void
  setVariable(id: VariableId): void
  setPeriod(from: number, to: number): void
  resetPeriod(): void
}

export interface YearRange { firstYear: number; lastYear: number }

/** Límites que fija el catálogo; hasta que se carga se usan los del contrato. */
export interface StateLimits extends YearRange {
  /** `null` mientras no se conoce el catálogo: entonces solo se comprueba el formato del id. */
  regionIds: ReadonlySet<string> | null
  /** Periodo propio de cada variable; si falta, vale firstYear–lastYear. */
  periods?: Partial<Record<VariableId, YearRange>>
}

export const DEFAULT_VARIABLE: VariableId = 'air_temperature'
const CONTRACT_LIMITS: StateLimits = { firstYear: 1980, lastYear: 2025, regionIds: null }
const REGION_ID_FORMAT = /^[A-Z]{2}-[A-Z0-9]{1,3}$/ // ISO 3166-2

type UrlState = Omit<AppState, 'webgl'>

// ---------- Funciones puras (probadas por separado) ----------

const isVariable = (v: string | null): v is VariableId => VARIABLE_IDS.includes(v as VariableId)

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
    notices.push(`La región «${regionId}» no existe; elige otra.`)
    regionId = null
  }

  const rawVar = q.get('var')
  let variableId: VariableId = DEFAULT_VARIABLE
  if (rawVar !== null) {
    if (isVariable(rawVar)) variableId = rawVar
    else if (rawVar in LEGACY_VARIABLE_IDS) variableId = LEGACY_VARIABLE_IDS[rawVar]
    else notices.push(`La variable «${rawVar}» no existe; se muestra la predeterminada.`)
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
    else notices.push(`El periodo ${rawFrom ?? '…'}–${rawTo ?? '…'} no es válido; se muestra ${from}–${to}.`)
  }

  return { state: { regionId, variableId, from, to }, notices }
}

/** Escribe el estado en la query conservando otros parámetros. */
export function toSearch(s: UrlState, current = ''): string {
  const q = new URLSearchParams(current)
  if (s.regionId) q.set('region', s.regionId)
  else q.delete('region')
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
    next.regionId === state.regionId && next.variableId === state.variableId &&
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
    update({ regionId: id })
  },
  setVariable(id) {
    if (!isVariable(id)) {
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
  periods?: Partial<Record<VariableId, YearRange>>
}): void {
  limits = { firstYear: next.firstYear, lastYear: next.lastYear, regionIds: new Set(next.regionIds), periods: next.periods }
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
