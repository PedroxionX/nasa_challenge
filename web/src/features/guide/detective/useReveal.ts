/**
 * Carga la fila del periodo completo para la revelación (008 T006). No calcula estadística: lee la fila
 * ya calculada por el pipeline con `pickWindow`, igual que el análisis completo con el periodo completo.
 */
import { useEffect, useState } from 'react'
import {
  loadCatalog, loadSeries, pickWindow, variablePeriod,
  type Catalog, type TrendRow, type VariableId,
} from '../../../lib/data'
import { DETECTIVE_COPY, localizeUnit, type RevealContext } from '../../../content'

export type RevealData =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'ready'; row: TrendRow | null; ctx: RevealContext }

/**
 * Unidad y pendiente como las muestra el panel (004): la cifra absoluta en `unit_annual`/década y, si la variable
 * tiene `relative_change`, el % publicado entre paréntesis (research R4, T019).
 */
export function revealInputs(catalog: Catalog, variableId: string, regionId: string, row: TrendRow | null) {
  const info = catalog.variables.find(v => v.id === variableId)
  const region = catalog.regions.find(r => r.id === regionId)
  const relative = info?.relative_change ?? false
  const { firstYear, lastYear } = variablePeriod(catalog, variableId as VariableId)
  const ctx: RevealContext = {
    regionName: region?.name ?? regionId,
    topic: DETECTIVE_COPY.topicNoun(variableId, info?.label ?? variableId),
    plural: DETECTIVE_COPY.topicPlural(variableId),
    dimensionless: (info?.unit_annual ?? '') === 'adimensional',
    unit: `${localizeUnit(info?.unit_annual ?? '')}/decade`,
    pct: relative ? row?.slope_decade_pct ?? null : null,
    from: firstYear,
    to: lastYear,
    alpha: catalog.alpha,
    method: DETECTIVE_COPY.method(catalog.method.slope, catalog.method.test),
    smallRegion: region?.small_region ?? false,
  }
  return { ctx, row, from: firstYear, to: lastYear }
}

export function useReveal(variableId: string | null, regionId: string | null): RevealData {
  const [attempt, setAttempt] = useState(0)
  // El resultado se guarda con la clave de la petición: si la clave cambió, se está cargando (sin setState síncrono).
  const key = variableId && regionId ? `${variableId}:${regionId}:${attempt}` : null
  const [result, setResult] = useState<{ key: string; data: RevealData } | null>(null)

  useEffect(() => {
    if (!key || !variableId || !regionId) return
    let alive = true
    ;(async () => {
      try {
        const catalog = await loadCatalog()
        const series = await loadSeries(variableId as VariableId, regionId)
        const { from, to } = revealInputs(catalog, variableId, regionId, null)
        const { ctx, row } = revealInputs(catalog, variableId, regionId, pickWindow(series, from, to))
        if (alive) setResult({ key, data: { state: 'ready', row, ctx } })
      } catch {
        if (alive) setResult({ key, data: { state: 'error', retry: () => setAttempt(a => a + 1) } })
      }
    })()
    return () => { alive = false }
  }, [key, variableId, regionId])

  return result && result.key === key ? result.data : { state: 'loading' }
}
