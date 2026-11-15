/**
 * Piezas del resultado (004 T004, T011). Solo presentan cifras del archivo, formateadas con lib/format.ts.
 * - Veredicto: icono dibujado + palabra + color; nunca solo color.
 * - Evidencia sin calificativos de fuerza (FR-A05); `insufficient` e `invalid` sin cifras de tendencia.
 * - Método, periodo, n, unidades, α y procedencia siempre están en el panel (SC-A01), cada uno en un solo
 *   lugar: periodo en la cabecera y en su control; intervalo, p y α en el veredicto; n, unidades y método en
 *   «Method and assumptions»; la procedencia en «Where these data come from».
 */
import type { Catalog, SeriesFile, TrendFlag, TrendRow, TrendStatus } from '../../lib/data'
import { localizeSource, UI_COPY, type Explanation } from '../../content'
import { HAS_TREND, evidenceLabel, type Extras } from './analysisData'
import Term from '../../lib/ui/Term'
import { VerdictIcon, type VerdictGlyph } from '../../lib/ui/icons'
import {
  fmtAlpha, fmtInterval, fmtNumber, fmtP, fmtPercent, fmtSigned, fmtSlope, fmtYear, fmtYears,
} from '../../lib/format'

// ---------- Veredicto ----------

const GLYPH: Record<TrendStatus, VerdictGlyph> = {
  increasing: 'up', decreasing: 'down', inconclusive: 'approx', insufficient: 'blocked', invalid: 'blocked',
}

/**
 * El resultado en un solo bloque: ¿sube, baja o no se puede decir? (icono + palabra) · ¿cuánto? (cambio por
 * década) · ¿qué tan seguro? (intervalo, p y α, cada uno con su definición).
 * Con «Not enough evidence» la estimación sigue a la vista, pero rotulada como estimación y sin peso:
 * la cifra no debe leerse como el resultado que el veredicto niega.
 */
export function Verdict({ status, explanation, row, unit, digits, extras, alpha }: {
  status: TrendStatus
  explanation: Explanation
  row: TrendRow | null
  unit: string
  digits: number
  extras: Extras
  alpha: number
}) {
  const trend = row !== null && HAS_TREND.has(status)
  const showSlope = trend && row.slope_decade !== null
  const estimate = status === 'inconclusive'
  const evidence = evidenceLabel(status)
  const pctInterval = extras.pct && extras.pct.low !== null && extras.pct.high !== null
  return (
    <section className={`verdict verdict--${status}`} aria-label="Result">
      <p className="verdict-head">
        <VerdictIcon glyph={GLYPH[status]} />
        <span className="verdict-word">{explanation.verdict}</span>
      </p>
      {showSlope && (
        // Con cambio relativo (FR-A09) la cifra principal es el %, la misma magnitud que colorea el mapa;
        // la cifra en la unidad de la variable va al lado. Sin %, la principal es la de la unidad.
        <p className={estimate ? 'verdict-figure verdict-figure--estimate' : 'verdict-figure'}>
          {estimate && 'Estimate: '}
          <span className="verdict-slope">
            {extras.pct ? `${fmtPercent(extras.pct.slope)} per decade` : fmtSlope(row.slope_decade, unit, digits)}
          </span>
          {extras.pct && <span className="muted">{` (${fmtSlope(row.slope_decade, unit, digits)})`}</span>}
        </p>
      )}
      {trend && (
        <p className="verdict-detail">
          <Term k="ci">
            {pctInterval
              ? `95% interval: ${fmtSigned(extras.pct!.low, 1)} to ${fmtSigned(extras.pct!.high, 1)} % (${fmtInterval(row.ci_low, row.ci_high, digits)} ${unit})`
              : `95% interval: ${fmtInterval(row.ci_low, row.ci_high, digits)} ${unit}`}
          </Term>
        </p>
      )}
      {trend && (
        <p className="verdict-detail">
          {evidence && !estimate && <span>{`${evidence}:`}</span>}
          <Term k="p">{fmtP(row.p)}</Term>
          <Term k="alpha">{fmtAlpha(alpha)}</Term>
        </p>
      )}
    </section>
  )
}

const METHOD_LABEL: Record<string, string> = {
  'theil-sen': 'Theil-Sen slope',
  'mann-kendall-ar1-corrected': 'Mann-Kendall test corrected for autocorrelation',
  'sen-1968-95': 'Sen (1968) interval at 95%',
  'ols-santer-2000': 'Least squares with the Santer (2000) adjustment',
}
const methodLabel = (id: string) => METHOD_LABEL[id] ?? id

// ---------- En palabras ----------

export function InWords({ sentence, caveats, notCause }: { sentence: string | null; caveats: string[]; notCause: string | null }) {
  if (!sentence && !notCause && caveats.length === 0) return null
  return (
    <section className="words" aria-label="In words">
      <h3 className="section-title">In words</h3>
      {sentence && <p className="words-sentence">{sentence}</p>}
      {notCause && <p className="words-note">{notCause}</p>}
      {caveats.length > 0 && (
        <ul className="words-notes">
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

export function TechnicalDetails({ row, status, catalog, series, digits, unit, from, to }: {
  row: TrendRow | null
  status: TrendStatus
  catalog: Catalog
  series: SeriesFile
  digits: number
  unit: string
  from: number
  to: number
}) {
  const trend = row !== null && HAS_TREND.has(status)
  const flags = row?.flags ?? []
  const stepYear = series.diagnostics.step_year
  const notes = flags.map(f => flagText(f, stepYear))
  if (stepYear !== null && !flags.includes('step')) notes.push(flagText('step', stepYear))
  if (series.diagnostics.autocorr_significant && !flags.includes('autocorr')) notes.push(flagText('autocorr', null))
  return (
    <details className="disclosure">
      <summary>Method and assumptions</summary>
      <dl className="facts">
        <dt>Complete years (n)</dt><dd>{row ? `${row.n}, ${fmtYears(from, to)}` : '—'}</dd>
        <dt>Units</dt><dd>{`${unit}; change in ${unit} per decade`}</dd>
        <dt>Slope</dt><dd>{methodLabel(catalog.method.slope)}</dd>
        <dt>Test</dt><dd>{methodLabel(catalog.method.test)}</dd>
        <dt>Interval</dt><dd>{methodLabel(catalog.method.interval)}</dd>
        <dt>Cross-check</dt><dd>{methodLabel(catalog.method.contrast)}</dd>
        <dt>Threshold</dt><dd>{`${fmtAlpha(catalog.alpha)}, set before looking at the data`}</dd>
        {trend && (
          <>
            <dt>Uncorrected p-value</dt><dd>{fmtP(row.p_uncorrected)}</dd>
            <dt>Autocorrelation (lag 1)</dt><dd>{fmtNumber(row.r1, 2)}</dd>
            <dt>Cross-check (least squares)</dt>
            <dd>{`${fmtSlope(row.ols_slope_decade, unit, digits)}; ${fmtP(row.ols_p)}`}</dd>
          </>
        )}
      </dl>
      <h4>Assumptions</h4>
      <ul>
        <li>One value per complete year: incomplete years are excluded and never filled in. With yearly values, the seasonal cycle has no influence.</li>
        <li>The method looks for a monotonic change (always in the same direction). The slope sums it up, but does not explain its cause or predict the future.</li>
        <li>Consecutive years may resemble each other (lag-1 autocorrelation): the test and the interval correct for it.</li>
      </ul>
      {notes.length > 0 && (
        <>
          <h4>Diagnostics for this series</h4>
          <ul>
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
    <details className="disclosure">
      <summary>Where these data come from</summary>
      <dl className="facts">
        <dt>Source</dt><dd>{localizeSource(p.source)}</dd>
        <dt>Product</dt>
        <dd>
          {p.short_name ? `${p.product} · ${p.short_name}${p.version ? ` version ${p.version}` : ''}` : p.product}
          {p.api_version && p.api_version !== 'n/a' && <span className="facts-sub">{`API version: ${p.api_version}`}</span>}
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
          <h4>Processing steps</h4>
          <p className="muted">{UI_COPY.recordedInSpanish}</p>
          <ol lang="es">
            {p.transformations.map(t => <li key={t}>{t}</li>)}
          </ol>
        </>
      )}
    </details>
  )
}
