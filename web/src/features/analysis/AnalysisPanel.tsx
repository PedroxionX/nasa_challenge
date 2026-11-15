/**
 * Panel de análisis (004 T004–T006, T011). Lo coloca el armazón (002) sin props; lee useAppState().
 * Orden: veredicto (dirección, cuánto, evidencia) → gráfica → periodo → «In words» → método y procedencia.
 * Cada dato aparece una sola vez.
 * Estados: cargando (esqueleto) · error con reintento · sin datos · resultado.
 * No calcula estadística: elige la fila con pickWindow y presenta lo que trae el archivo.
 */
import { useEffect, useState } from 'react'
import { useAppState } from '../../app/state'
import { loadCatalog, pickWindow, type Catalog, type SeriesFile, type CountryCode, type TrendRow } from '../../lib/data'
import { explainTrend, localizeUnit, UI_COPY, variableCopy } from '../../content'
import { HAS_TREND, isFullPeriod, readExtras } from './analysisData'
import { digitsFor, fmtPercent, fmtSlope, fmtYears } from '../../lib/format'
import CloseButton from '../../lib/ui/CloseButton'
import { WarningIcon } from '../../lib/ui/icons'
import { InWords, ProvenanceDetails, TechnicalDetails, Verdict } from './ResultCards'
import PeriodControl from './PeriodControl'
import PeriodVariation from './PeriodVariation'
import TrendChart from './TrendChart'
import { useAnalysisData } from './useAnalysisData'
import './analysis.css'

/** Id del buscador de 004 (features/query/search.ts). Se usa por id: las carpetas de features no se importan entre sí. */
const SEARCH_INPUT_ID = 'region-search'

const COUNTRY: Record<CountryCode, string> = { MX: 'Mexico', US: 'United States' }

/**
 * El buscador vive en la cabecera y nunca se desmonta: se enfoca en el acto, sin esperar a que el panel
 * desaparezca (con requestAnimationFrame el navegador podía retrasarlo y el foco caía en <body>).
 */
function focusSearch() {
  document.getElementById(SEARCH_INPUT_ID)?.focus()
}

export default function AnalysisPanel() {
  const { regionId, variableId, from, to, setRegion, resetPeriod } = useAppState()
  const { load, retry } = useAnalysisData(regionId, variableId)
  // El catálogo se guarda aparte (lib/data lo tiene en caché): así la cabecera muestra el nombre del estado
  // también mientras carga o si la serie falla, en vez de su clave («MX-CHH»).
  const [known, setKnown] = useState<Catalog | null>(null)
  useEffect(() => {
    let live = true
    loadCatalog().then(c => { if (live) setKnown(c) }).catch(() => {})
    return () => { live = false }
  }, [])

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

  const catalog = (load.kind === 'ready' || load.kind === 'no-data' ? load.catalog : null) ?? known
  const region = catalog?.regions.find(r => r.id === regionId)
  const regionName = region?.name ?? regionId
  const variable = variableCopy(variableId, catalog?.variables.find(v => v.id === variableId))

  const close = (restoreFocus: boolean) => { setRegion(null); if (restoreFocus) focusSearch() }

  return (
    <article className="analysis" aria-busy={load.kind === 'loading'}>
      <div className="panel-header">
        <div className="panel-title">
          <h2>{regionName}</h2>
          <p className="panel-meta">
            {region && `${COUNTRY[region.country]} · `}{variable.label} · {fmtYears(from, to)}
          </p>
        </div>
        <CloseButton label="Close analysis" onClick={e => close(e.detail === 0)} />
      </div>

      {load.kind === 'loading' && <Skeleton />}

      {load.kind === 'error' && (
        <div className="notice notice--error" role="alert">
          <p>{UI_COPY.loadError}</p>
          <button type="button" onClick={retry}>{UI_COPY.retry}</button>
        </div>
      )}

      {load.kind === 'no-data' && (
        <div className="notice">
          <p>{UI_COPY.noData}</p>
          <p className="muted">You can choose another state in the search box or on the globe.</p>
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
    <div className="skeleton">
      <span className="vh">Loading…</span>
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
  const variableLabel = variableCopy(series.variable, variableInfo).label
  const region = catalog.regions.find(r => r.id === series.region)
  const unit = localizeUnit(variableInfo?.unit_annual ?? series.unit)
  const row = pickWindow(series, from, to)
  const digits = digitsFor(unit, row?.slope_decade, row?.ci_low, row?.ci_high)
  const status = row?.status ?? 'insufficient'
  const extras = readExtras(row, variableInfo)
  const isSynthetic = series.provenance.is_synthetic
  const fullPeriod = isFullPeriod(catalog, series.variable, from, to)

  const explanation = explainTrend(row, {
    regionName,
    variableId: series.variable,
    unit: `${unit}/decade`,
    from,
    to,
    alpha: catalog.alpha,
    fullPeriod,
    smallRegion: region?.small_region ?? false,
    isSynthetic,
  })
  // El aviso de datos sintéticos va arriba y el de periodo junto al control (PeriodVariation): no se repiten.
  const caveats = explanation.caveats.filter(c => c !== UI_COPY.synthetic && !c.startsWith('You are viewing'))
  const verdictOf = (r: TrendRow) => explainTrend(r, {
    regionName,
    variableId: series.variable,
    unit: `${unit}/decade`,
    from: r.start,
    to: r.end,
    alpha: catalog.alpha,
    fullPeriod: false,
    smallRegion: region?.small_region ?? false,
    isSynthetic,
  }).verdict
  const trend = row !== null && HAS_TREND.has(status)

  const announcement = trend
    ? `${regionName}, ${variableLabel.toLowerCase()} ${fmtYears(from, to)}: ${explanation.verdict}, ${extras.pct ? `${fmtPercent(extras.pct.slope)} per decade, ` : ''}${fmtSlope(row.slope_decade, unit, digits)}.`
    : `${regionName}, ${variableLabel.toLowerCase()} ${fmtYears(from, to)}: ${explanation.verdict}.`

  return (
    <div className="analysis-result">
      <p className="vh" role="status" aria-live="polite">{announcement}</p>

      {isSynthetic && (
        <p className="notice notice--icon notice--synthetic"><WarningIcon size={18} />{UI_COPY.synthetic}</p>
      )}

      <Verdict status={status} explanation={explanation} row={row} unit={unit} digits={digits} extras={extras} alpha={catalog.alpha} />

      {!row && (
        <div className="notice">
          <p>{UI_COPY.insufficientData}</p>
          <button type="button" onClick={onReset}>{UI_COPY.useFullPeriod}</button>
        </div>
      )}

      <div className="analysis-chart">
        <TrendChart
          series={series}
          row={row}
          from={from}
          to={to}
          unit={unit}
          variableLabel={variableLabel}
          regionName={regionName}
          lineMid={extras.lineMid}
        />
        {/* El periodo va pegado a la gráfica que modifica. */}
        <PeriodControl catalog={catalog} showReset={row !== null} />
        {!fullPeriod && (
          <PeriodVariation series={series} from={from} to={to} unit={unit} digits={digits} verdictOf={verdictOf} />
        )}
      </div>

      {/* La frase repite las cifras del veredicto en palabras: va después de la gráfica, no pegada a él. */}
      <InWords
        sentence={row ? explanation.sentence : null}
        caveats={caveats}
        notCause={trend ? UI_COPY.notCause : null}
      />

      <div className="analysis-more">
        <TechnicalDetails row={row} status={status} catalog={catalog} series={series} digits={digits} unit={unit} from={from} to={to} />
        <ProvenanceDetails series={series} />
      </div>
    </div>
  )
}
