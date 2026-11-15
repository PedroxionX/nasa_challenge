/**
 * Carga de la comparación (007 T016): catálogo, las dos series, el índice de `compare/` y el archivo del par.
 * - Una región sin datos (`n_cells: 0` o sin archivo) no es un error: se informa cuál.
 * - Que falte `compare/index.json`, la variable en él o el archivo del par tampoco lo es: la prueba de la
 *   diferencia «aún no está publicada» y se siguen mostrando los dos resultados individuales (FR-K10).
 * - Cualquier otro fallo es un error recuperable con reintento (la caché de lib/data no guarda fallos).
 * Aquí no se calcula nada: solo se piden archivos.
 */
import { useEffect, useState } from 'react'
import {
  isDataError, loadCatalog, loadCompareIndex, loadComparison, loadSeries,
  type Catalog, type CompareFile, type CompareVariableInfo, type SeriesFile, type VariableId,
} from '../../lib/data'

export type CompareLoad =
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
    kind: 'ready'
    catalog: Catalog
    /** Serie de la región principal (A) y de la comparada (B); `null` = esa región no tiene datos. */
    seriesA: SeriesFile | null
    seriesB: SeriesFile | null
    /** Qué hay publicado de la prueba de la diferencia para esta variable; `null` = nada todavía. */
    published: CompareVariableInfo | null
    /** Archivo que contiene el par; `null` si no está publicado. */
    file: CompareFile | null
  }

async function seriesOrNull(catalog: Catalog, variableId: VariableId, regionId: string): Promise<SeriesFile | null> {
  if (catalog.regions.find(r => r.id === regionId)?.n_cells === 0) return null
  try {
    return await loadSeries(variableId, regionId)
  } catch (error) {
    if (isDataError(error) && error.kind === 'not_found') return null
    throw error
  }
}

async function fetchComparison(variableId: VariableId, regionA: string, regionB: string): Promise<CompareLoad> {
  const catalog = await loadCatalog()
  const [seriesA, seriesB, index] = await Promise.all([
    seriesOrNull(catalog, variableId, regionA),
    seriesOrNull(catalog, variableId, regionB),
    loadCompareIndex(),
  ])
  const published = index?.variables[variableId] ?? null
  const file = published && seriesA && seriesB ? await loadComparison(variableId, regionA, regionB) : null
  return { kind: 'ready', catalog, seriesA, seriesB, published, file }
}

export function useCompareData(variableId: VariableId, regionA: string | null, regionB: string | null) {
  const [attempt, setAttempt] = useState(0)
  const key = `${variableId}/${regionA}/${regionB}/${attempt}`
  const [result, setResult] = useState<{ key: string; load: CompareLoad } | null>(null)
  // Mientras la respuesta no corresponda a la petición actual, se muestra «cargando».
  const load: CompareLoad = result?.key === key ? result.load : { kind: 'loading' }

  useEffect(() => {
    if (!regionA || !regionB) return
    let live = true
    fetchComparison(variableId, regionA, regionB)
      .then(next => { if (live) setResult({ key, load: next }) })
      .catch(() => { if (live) setResult({ key, load: { kind: 'error' } }) })
    return () => { live = false }
  }, [variableId, regionA, regionB, key])

  return { load, retry: () => setAttempt(a => a + 1) }
}
