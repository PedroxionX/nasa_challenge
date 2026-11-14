/**
 * ESBOZO de 002 (T007). Dueño tras la fusión: 004.
 * Solo muestra lo que viene en el archivo; no calcula estadística.
 */
import { useEffect, useState } from 'react'
import { getLimits, useAppState } from '../../app/state'
import {
  isDataError, loadCatalog, loadSeries, pickWindow,
  type Catalog, type DataError, type SeriesFile,
} from '../../lib/data'
import { explainTrend, UI_COPY, VARIABLE_COPY } from '../../content'

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; series: SeriesFile; catalog: Catalog }
  | { kind: 'error'; error: DataError | Error }

export default function AnalysisPanel() {
  const { regionId, variableId, from, to, setRegion, resetPeriod } = useAppState()
  const [attempt, setAttempt] = useState(0)
  const key = `${variableId}/${regionId}/${attempt}`
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null)
  // Mientras la respuesta no corresponda a la petición actual, se muestra «cargando».
  const load: Load = result?.key === key ? result.load : { kind: 'loading' }

  useEffect(() => {
    if (!regionId) return
    let live = true
    Promise.all([loadSeries(variableId, regionId), loadCatalog()])
      .then(([series, catalog]) => live && setResult({ key, load: { kind: 'ready', series, catalog } }))
      .catch((error: unknown) => live && setResult({
        key, load: { kind: 'error', error: error instanceof Error ? error : new Error(String(error)) },
      }))
    return () => { live = false }
  }, [regionId, variableId, key])

  if (!regionId) return null

  return (
    <div className="stub stub-analysis">
      <div className="stub-row">
        <span className="stub-tag">Esbozo · 004</span>
        <button type="button" onClick={() => setRegion(null)}>Cerrar</button>
      </div>
      <h2>{regionId}</h2>
      <p>{VARIABLE_COPY[variableId].label} · {from}–{to}</p>
      <Body load={load} from={from} to={to} onRetry={() => setAttempt(a => a + 1)} onReset={resetPeriod} />
    </div>
  )
}

function Body({ load, from, to, onRetry, onReset }: {
  load: Load; from: number; to: number; onRetry: () => void; onReset: () => void
}) {
  if (load.kind === 'loading') return <p aria-busy="true">Cargando…</p>
  if (load.kind === 'error') {
    if (isDataError(load.error) && load.error.kind === 'not_found') return <p>{UI_COPY.noData}</p>
    return <p>{UI_COPY.loadError} <button type="button" onClick={onRetry}>{UI_COPY.retry}</button></p>
  }
  const { series, catalog } = load
  const region = catalog.regions.find(r => r.id === series.region)
  const row = pickWindow(series, from, to)
  const limits = getLimits()
  const text = explainTrend(row, {
    regionName: region?.name ?? series.region,
    variableId: series.variable,
    unit: `${series.unit}/década`,
    from, to,
    alpha: catalog.alpha,
    fullPeriod: from === limits.firstYear && to === limits.lastYear,
    smallRegion: region?.small_region ?? false,
    isSynthetic: series.provenance.is_synthetic,
  })
  return (
    <>
      <p><strong>{text.verdict}</strong> — {text.sentence}</p>
      {text.caveats.map(c => <p key={c} className="stub-muted">{c}</p>)}
      {!row && <button type="button" onClick={onReset}>{UI_COPY.useFullPeriod}</button>}
      {row && (
        <dl className="stub-dl">
          <dt>Método</dt><dd>{catalog.method.slope} · {catalog.method.test}</dd>
          <dt>Años (n)</dt><dd>{row.n}</dd>
          <dt>α</dt><dd>{catalog.alpha}</dd>
          <dt>p</dt><dd>{row.p ?? '—'}</dd>
          <dt>Fuente</dt><dd>{series.provenance.source}</dd>
        </dl>
      )}
    </>
  )
}
