/**
 * Tarjetas del resultado (004 T004, T011). Solo presentan cifras del archivo, formateadas con format.ts.
 * - Veredicto: icono dibujado + palabra + color; nunca solo color.
 * - Evidencia sin calificativos de fuerza (FR-A05); `insufficient` e `invalid` sin cifras de tendencia.
 * - Siempre: método, periodo, n, unidades, α y procedencia (SC-A01).
 */
import type { Catalog, SeriesFile, TrendFlag, TrendRow, TrendStatus } from '../../lib/data'
import { localizeSource, UI_COPY, type Explanation } from '../../content'
import { HAS_TREND, evidenceLabel, type Extras } from './analysisData'
import Term from './Term'
import {
  fmtAlpha, fmtInterval, fmtNumber, fmtP, fmtPercent, fmtSigned, fmtSlope, fmtYear, fmtYears,
} from '../../lib/format'

// ---------- Veredicto ----------

function VerdictIcon({ status }: { status: TrendStatus }) {
  const common = { width: 28, height: 28, viewBox: '0 0 28 28', 'aria-hidden': true as const, className: 'verdict-icon' }
  switch (status) {
    case 'increasing':
      return <svg {...common}><path d="M6 20 L20 6 M11 6 H20 V15" /></svg>
    case 'decreasing':
      return <svg {...common}><path d="M6 8 L20 22 M11 22 H20 V13" /></svg>
    case 'inconclusive':
      return <svg {...common}><path d="M5 11 Q9.5 7 14 11 T23 11 M5 18 Q9.5 14 14 18 T23 18" /></svg>
    default:
      return <svg {...common}><circle cx="14" cy="14" r="9" /><path d="M8 20 L20 8" /></svg>
  }
}

export function Verdict({ status, explanation, row, unit, digits, extras }: {
  status: TrendStatus
  explanation: Explanation
  row: TrendRow | null
  unit: string
  digits: number
  extras: Extras
}) {
  const showSlope = row !== null && HAS_TREND.has(status) && row.slope_decade !== null
  return (
    <section className={`verdict verdict--${status}`} aria-label="Result">
      <p className="verdict-head">
        <VerdictIcon status={status} />
        <span className="verdict-word">{explanation.verdict}</span>
      </p>
      {showSlope && (
        // Con cambio relativo (FR-A09) la cifra principal es el %, la misma magnitud que colorea el mapa;
        // la cifra en la unidad de la variable va al lado. Sin %, la principal es la de la unidad.
        <p className="verdict-change">
          <span className="verdict-slope">
            {extras.pct ? `${fmtPercent(extras.pct.slope)} per decade` : fmtSlope(row.slope_decade, unit, digits)}
          </span>
          {extras.pct && <span className="verdict-pct">{` (${fmtSlope(row.slope_decade, unit, digits)})`}</span>}
        </p>
      )}
    </section>
  )
}

// ---------- Cifras y metadatos obligatorios ----------

const METHOD_LABEL: Record<string, string> = {
  'theil-sen': 'Theil-Sen slope',
  'mann-kendall-ar1-corrected': 'Mann-Kendall test corrected for autocorrelation',
  'sen-1968-95': 'Sen (1968) interval at 95%',
  'ols-santer-2000': 'Least squares with the Santer (2000) adjustment',
}
const methodLabel = (id: string) => METHOD_LABEL[id] ?? id

export function ResultFacts({ status, row, from, to, unit, digits, extras, catalog, series }: {
  status: TrendStatus
  row: TrendRow | null
  from: number
  to: number
  unit: string
  digits: number
  extras: Extras
  catalog: Catalog
  series: SeriesFile
}) {
  const evidence = evidenceLabel(status)
  const trend = row !== null && HAS_TREND.has(status)
  return (
    <dl className="result-facts">
      {trend && (
        <>
          <dt>95% interval</dt>
          <dd>
            {extras.pct && extras.pct.low !== null && extras.pct.high !== null ? (
              <>
                <Term k="ci">{`${fmtSigned(extras.pct.low, 1)} to ${fmtSigned(extras.pct.high, 1)} % per decade`}</Term>
                <span className="result-sub">{`(${fmtInterval(row.ci_low, row.ci_high, digits)} ${unit} per decade)`}</span>
              </>
            ) : (
              <Term k="ci">{`${fmtInterval(row.ci_low, row.ci_high, digits)} ${unit} per decade`}</Term>
            )}
          </dd>
        </>
      )}
      {evidence && (
        <>
          <dt>Evidence</dt>
          <dd>
            {evidence}
            <span className="result-sub result-sub--terms">
              <Term k="p">{fmtP(row?.p)}</Term>
              <Term k="alpha">{fmtAlpha(catalog.alpha)}</Term>
            </span>
          </dd>
        </>
      )}
      <dt>Period</dt>
      <dd>{fmtYears(from, to)}</dd>
      <dt>Complete years (n)</dt>
      <dd>{row ? row.n : '—'}</dd>
      <dt>Units</dt>
      <dd>{`${unit} (change in ${unit} per decade)`}</dd>
      <dt>Method</dt>
      <dd>
        {`${methodLabel(catalog.method.slope)} and ${methodLabel(catalog.method.test)}; `}
        {fmtAlpha(catalog.alpha)}
      </dd>
      <dt>Source</dt>
      <dd>{`${localizeSource(series.provenance.source)} · ${series.provenance.product}`}</dd>
    </dl>
  )
}

// ---------- En palabras ----------

export function InWords({ sentence, caveats, notCause }: { sentence: string | null; caveats: string[]; notCause: string | null }) {
  if (!sentence && !notCause && caveats.length === 0) return null
  return (
    <section className="in-words" aria-label="In words">
      <h3>In words</h3>
      {sentence && <p>{sentence}</p>}
      {notCause && <p className="in-words-note">{notCause}</p>}
      {caveats.length > 0 && (
        <ul className="in-words-caveats">
          {caveats.map(c => <li key={c}>{c}</li>)}
        </ul>
      )}
    </section>
  )
}

// ---------- Detalles técnicos ----------

function flagText(flag: TrendFlag, stepYear: number | null): string {
  switch (flag) {
    case 'autocorr': return 'Consecutive years resemble each other (autocorrelation): the p-value already accounts for it.'
    case 'step': return stepYear !== null
      ? `There is an abrupt jump around ${fmtYear(stepYear)}: the slope sums up a net change, not necessarily a gradual one.`
      : 'There is an abrupt jump in the series: the slope sums up a net change, not necessarily a gradual one.'
    case 'short': return 'Fewer than 30 complete years: the result is more uncertain.'
    case 'ties': return 'There are repeated values (ties) in the series; the test corrects for them.'
    case 'small_region': return 'The region is smaller than one model cell: the value also represents its neighbors.'
  }
}

export function TechnicalDetails({ row, status, catalog, series, digits, unit }: {
  row: TrendRow | null
  status: TrendStatus
  catalog: Catalog
  series: SeriesFile
  digits: number
  unit: string
}) {
  const trend = row !== null && HAS_TREND.has(status)
  const flags = row?.flags ?? []
  const stepYear = series.diagnostics.step_year
  const notes = flags.map(f => flagText(f, stepYear))
  if (stepYear !== null && !flags.includes('step')) notes.push(flagText('step', stepYear))
  if (series.diagnostics.autocorr_significant && !flags.includes('autocorr')) notes.push(flagText('autocorr', null))
  return (
    <details className="analysis-details">
      <summary>Technical details</summary>
      <dl className="result-facts">
        <dt>Slope</dt><dd>{methodLabel(catalog.method.slope)}</dd>
        <dt>Test</dt><dd>{methodLabel(catalog.method.test)}</dd>
        <dt>Interval</dt><dd>{methodLabel(catalog.method.interval)}</dd>
        <dt>Cross-check</dt><dd>{methodLabel(catalog.method.contrast)}</dd>
        {trend && (
          <>
            <dt>Corrected p-value</dt><dd>{fmtP(row.p)}</dd>
            <dt>Uncorrected p-value</dt><dd>{fmtP(row.p_uncorrected)}</dd>
            <dt>Autocorrelation (lag 1)</dt><dd>{fmtNumber(row.r1, 2)}</dd>
            <dt>Cross-check (least squares)</dt>
            <dd>{`${fmtSlope(row.ols_slope_decade, unit, digits)}; ${fmtP(row.ols_p)}`}</dd>
          </>
        )}
      </dl>
      <h4 className="analysis-details-sub">Assumptions</h4>
      <ul className="analysis-notes">
        <li>One value per complete year: incomplete years are excluded and never filled in. With yearly values, the seasonal cycle has no influence.</li>
        <li>The method looks for a monotonic change (always in the same direction). The slope sums it up, but does not explain its cause or predict the future.</li>
        <li>Consecutive years may resemble each other (lag-1 autocorrelation): the test and the interval correct for it.</li>
        <li>{`${fmtAlpha(catalog.alpha)}, set before looking at the data.`}</li>
      </ul>
      {notes.length > 0 && (
        <>
          <h4 className="analysis-details-sub">Diagnostics for this series</h4>
          <ul className="analysis-notes">
            {notes.map(n => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}
    </details>
  )
}

// ---------- Procedencia ----------

export function ProvenanceDetails({ series }: { series: SeriesFile }) {
  const p = series.provenance
  return (
    <details className="analysis-details">
      <summary>Where these data come from</summary>
      <dl className="result-facts">
        <dt>Source</dt><dd>{localizeSource(p.source)}</dd>
        <dt>Product</dt>
        <dd>
          {p.short_name ? `${p.product} · ${p.short_name}${p.version ? ` version ${p.version}` : ''}` : p.product}
          {p.api_version && p.api_version !== 'n/a' && <span className="result-sub">{`API version: ${p.api_version}`}</span>}
        </dd>
        <dt>Citation (DOI)</dt>
        <dd>
          {p.doi
            ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.doi}</a>
            : 'No DOI recorded in the file'}
        </dd>
        <dt>Source variable</dt><dd>{`${p.parameter} (${p.unit_declared})`}</dd>
        <dt>Grid</dt><dd>{p.grid}</dd>
        <dt>Regional average</dt><dd lang="es">{p.spatial_method}</dd>
        <dt>Cells used</dt><dd>{p.n_cells}</dd>
        {typeof p.granules === 'number' && <><dt>Files read</dt><dd>{`${p.granules} granules`}</dd></>}
        <dt>Retrieved</dt><dd>{p.retrieved_at_utc}</dd>
        <dt>Requests</dt><dd>{p.requests}</dd>
      </dl>
      {p.transformations.length > 0 && (
        <>
          <h4 className="analysis-details-sub">Processing steps</h4>
          <p className="analysis-muted">{UI_COPY.recordedInSpanish}</p>
          <ol className="analysis-notes" lang="es">
            {p.transformations.map(t => <li key={t}>{t}</li>)}
          </ol>
        </>
      )}
    </details>
  )
}
