/**
 * Carga del panel (004 T005): catálogo + serie de la región y variable elegidas.
 * - Región con `n_cells: 0` en el catálogo → «sin datos» SIN pedir su archivo (contrato: no existe).
 * - Archivo inexistente (404) → también «sin datos», nunca «error».
 * - Cualquier otro fallo → error recuperable con reintento (la caché de lib/data no guarda fallos).
 */
import { useEffect, useState } from 'react'
import {
  isDataError, loadCatalog, loadSeries,
  type Catalog, type SeriesFile, type VariableId,
} from '../../lib/data'

export type AnalysisLoad =
  | { kind: 'loading' }
  | { kind: 'no-data'; catalog: Catalog | null }
  | { kind: 'error'; error: Error }
  | { kind: 'ready'; series: SeriesFile; catalog: Catalog }

async function fetchAnalysis(variableId: VariableId, regionId: string): Promise<AnalysisLoad> {
  const catalog = await loadCatalog()
  const region = catalog.regions.find(r => r.id === regionId)
  if (region && region.n_cells === 0) return { kind: 'no-data', catalog }
  try {
    return { kind: 'ready', series: await loadSeries(variableId, regionId), catalog }
  } catch (error) {
    if (isDataError(error) && error.kind === 'not_found') return { kind: 'no-data', catalog }
    throw error
  }
}

export function useAnalysisData(regionId: string | null, variableId: VariableId) {
  const [attempt, setAttempt] = useState(0)
  const key = `${variableId}/${regionId}/${attempt}`
  const [result, setResult] = useState<{ key: string; load: AnalysisLoad } | null>(null)
  // Mientras la respuesta no corresponda a la petición actual, se muestra «cargando».
  const load: AnalysisLoad = result?.key === key ? result.load : { kind: 'loading' }

  useEffect(() => {
    if (!regionId) return
    let live = true
    fetchAnalysis(variableId, regionId)
      .then(next => { if (live) setResult({ key, load: next }) })
      .catch((error: unknown) => {
        if (live) setResult({ key, load: { kind: 'error', error: error instanceof Error ? error : new Error(String(error)) } })
      })
    return () => { live = false }
  }, [regionId, variableId, key])

  return { load, retry: () => setAttempt(a => a + 1) }
}
