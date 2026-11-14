/**
 * Panel de análisis (004 T004–T006, T011). Lo coloca el armazón (002) sin props; lee useAppState().
 * Orden (ux.md §6): veredicto y cambio → gráfica → cifras → «En palabras» → desplegables.
 * Estados: cargando (esqueleto) · error con reintento · sin datos · resultado.
 * No calcula estadística: elige la fila con pickWindow y presenta lo que trae el archivo.
 */
import { useEffect } from 'react'
import { useAppState } from '../../app/state'
import { pickWindow, type Catalog, type SeriesFile, type CountryCode, type TrendRow } from '../../lib/data'
import { explainTrend, UI_COPY, VARIABLE_COPY } from '../../content'
import { HAS_TREND, digitsFor, isFullPeriod, readExtras } from './analysisData'
import { fmtSlope, fmtYears } from './format'
import { InWords, ProvenanceDetails, ResultFacts, TechnicalDetails, Verdict } from './ResultCards'
import PeriodControl from './PeriodControl'
import PeriodVariation from './PeriodVariation'
import TrendChart from './TrendChart'
import { useAnalysisData } from './useAnalysisData'
import './analysis.css'

/** Id del buscador de 004 (features/query/search.ts). Se usa por id: las carpetas de features no se importan entre sí. */
const SEARCH_INPUT_ID = 'region-search'

const COUNTRY: Record<CountryCode, string> = { MX: 'México', US: 'Estados Unidos' }

function focusSearch() {
  requestAnimationFrame(() => document.getElementById(SEARCH_INPUT_ID)?.focus())
}

export default function AnalysisPanel() {
  const { regionId, variableId, from, to, setRegion, resetPeriod } = useAppState()
  const { load, retry } = useAnalysisData(regionId, variableId)

  // FR-A02: Escape cierra el panel (deselecciona la región) y devuelve el foco al buscador.
  useEffect(() => {
    if (!regionId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('dialog[open]')) return // el diálogo de métodos se cierra solo
      setRegion(null)
      focusSearch()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [regionId, setRegion])

  if (!regionId) return null

  const catalog = load.kind === 'ready' || load.kind === 'no-data' ? load.catalog : null
  const region = catalog?.regions.find(r => r.id === regionId)
  const regionName = region?.name ?? regionId
  const variable = VARIABLE_COPY[variableId]

  const close = () => { setRegion(null); focusSearch() }

  return (
    <article className="analysis" aria-busy={load.kind === 'loading'}>
      <div className="analysis-header">
        <div className="analysis-title">
          <h2>{regionName}</h2>
          <p className="analysis-meta">
            {region && `${COUNTRY[region.country]} · `}{variable.label} · {fmtYears(from, to)}
          </p>
        </div>
        <button type="button" className="analysis-close" onClick={close} aria-label="Cerrar análisis">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>
      </div>

      {load.kind === 'loading' && <Skeleton />}

      {load.kind === 'error' && (
        <div className="analysis-state" role="alert">
          <p>{UI_COPY.loadError}</p>
          <button type="button" onClick={retry}>{UI_COPY.retry}</button>
        </div>
      )}

      {load.kind === 'no-data' && (
        <div className="analysis-state">
          <p>{UI_COPY.noData}</p>
          <p className="analysis-muted">Puedes elegir otro estado en el buscador o en el globo.</p>
        </div>
      )}

      {load.kind === 'ready' && (
        <Result
          series={load.series}
          catalog={load.catalog}
          regionName={regionName}
          from={from}
          to={to}
          onReset={resetPeriod}
        />
      )}
    </article>
  )
}

function Skeleton() {
  return (
    <div className="analysis-skeleton">
      <span className="analysis-vh">Cargando…</span>
      <div className="sk sk-verdict" />
      <div className="sk sk-chart" />
      <div className="sk sk-line" />
      <div className="sk sk-line sk-short" />
      <div className="sk sk-line" />
    </div>
  )
}

function Result({ series, catalog, regionName, from, to, onReset }: {
  series: SeriesFile
  catalog: Catalog
  regionName: string
  from: number
  to: number
  onReset: () => void
}) {
  const variableInfo = catalog.variables.find(v => v.id === series.variable)
  const region = catalog.regions.find(r => r.id === series.region)
  const unit = variableInfo?.unit_annual ?? series.unit
  const digits = digitsFor(unit)
  const row = pickWindow(series, from, to)
  const status = row?.status ?? 'insufficient'
  const extras = readExtras(series, row, variableInfo)
  const isSynthetic = series.provenance.is_synthetic
  const fullPeriod = isFullPeriod(catalog, from, to)

  const explanation = explainTrend(row, {
    regionName,
    variableId: series.variable,
    unit: `${unit}/década`,
    from,
    to,
    alpha: catalog.alpha,
    fullPeriod,
    smallRegion: region?.small_region ?? false,
    isSynthetic,
  })
  // El aviso de datos sintéticos va arriba y el de periodo junto al control (PeriodVariation): no se repiten.
  const caveats = explanation.caveats.filter(c => c !== UI_COPY.synthetic && !c.startsWith('Estás viendo'))
  const verdictOf = (r: TrendRow) => explainTrend(r, {
    regionName,
    variableId: series.variable,
    unit: `${unit}/década`,
    from: r.start,
    to: r.end,
    alpha: catalog.alpha,
    fullPeriod: false,
    smallRegion: region?.small_region ?? false,
    isSynthetic,
  }).verdict
  const trend = row !== null && HAS_TREND.has(status)

  const announcement = trend
    ? `${regionName}, ${VARIABLE_COPY[series.variable].label.toLowerCase()} ${fmtYears(from, to)}: ${explanation.verdict}, ${fmtSlope(row.slope_decade, unit, digits)}.`
    : `${regionName}, ${VARIABLE_COPY[series.variable].label.toLowerCase()} ${fmtYears(from, to)}: ${explanation.verdict}.`

  return (
    <div className="analysis-result">
      <p className="analysis-vh" role="status" aria-live="polite">{announcement}</p>

      {isSynthetic && (
        <p className="analysis-synthetic">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 3 L18 17 H2 Z M10 8 V12 M10 14.5 V14.6" /></svg>
          {UI_COPY.synthetic}
        </p>
      )}

      <Verdict status={status} explanation={explanation} row={row} unit={unit} digits={digits} extras={extras} />

      {!row && (
        <div className="analysis-state analysis-state--inline">
          <p>{UI_COPY.insufficientData}</p>
          <button type="button" onClick={onReset}>{UI_COPY.useFullPeriod}</button>
        </div>
      )}

      <TrendChart
        series={series}
        row={row}
        from={from}
        to={to}
        unit={unit}
        variableLabel={VARIABLE_COPY[series.variable].label}
        regionName={regionName}
        lineMid={extras.lineMid}
      />

      <PeriodControl catalog={catalog} showReset={row !== null} />
      {!fullPeriod && (
        <PeriodVariation series={series} from={from} to={to} unit={unit} digits={digits} verdictOf={verdictOf} />
      )}

      <ResultFacts
        status={status}
        row={row}
        from={from}
        to={to}
        unit={unit}
        digits={digits}
        extras={extras}
        catalog={catalog}
        series={series}
      />

      <InWords
        sentence={row ? explanation.sentence : null}
        caveats={caveats}
        notCause={trend ? UI_COPY.notCause : null}
      />

      <TechnicalDetails row={row} status={status} catalog={catalog} series={series} digits={digits} unit={unit} />
      <ProvenanceDetails series={series} />
    </div>
  )
}
