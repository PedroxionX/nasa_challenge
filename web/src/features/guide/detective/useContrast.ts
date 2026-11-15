/**
 * «Un lugar donde pasó lo contrario» (008 T030, FR-E19, research R9).
 *
 * Devuelve el otro lugar del par curado solo si los dos archivos publicados tienen evidencia de tendencia en
 * direcciones opuestas en el periodo completo. Lee filas ya calculadas (`pickWindow`): no calcula nada.
 * La lista de pares por sí sola no basta, porque la frase afirma un hecho.
 */
import { useEffect, useState } from 'react'
import { loadCatalog, loadSeries, pickWindow, variablePeriod, type VariableId } from '../../../lib/data'
import { contrastFor } from './options'

const EVIDENCE = new Set(['increasing', 'decreasing'])

export function useContrast(variableId: string | null, regionId: string | null): string | null {
  const other = variableId && regionId ? contrastFor(variableId, regionId) : null
  const key = other ? `${variableId}:${regionId}:${other}` : null
  const [result, setResult] = useState<{ key: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!key || !variableId || !regionId || !other) return
    let alive = true
    ;(async () => {
      try {
        const catalog = await loadCatalog()
        const { firstYear, lastYear } = variablePeriod(catalog, variableId as VariableId)
        const [a, b] = await Promise.all([
          loadSeries(variableId as VariableId, regionId),
          loadSeries(variableId as VariableId, other),
        ])
        const ra = pickWindow(a, firstYear, lastYear)
        const rb = pickWindow(b, firstYear, lastYear)
        const ok = !!ra && !!rb && EVIDENCE.has(ra.status) && EVIDENCE.has(rb.status) && ra.status !== rb.status
        if (alive) setResult({ key, ok })
      } catch {
        if (alive) setResult({ key, ok: false })
      }
    })()
    return () => { alive = false }
  }, [key, variableId, regionId, other])

  return result && result.key === key && result.ok ? other : null
}
