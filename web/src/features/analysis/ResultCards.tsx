/**
 * Tarjetas del resultado (004 T004, T011). Solo presentan cifras del archivo, formateadas con format.ts.
 * - Veredicto: icono dibujado + palabra + color; nunca solo color.
 * - Evidencia sin calificativos de fuerza (FR-A05); `insufficient` e `invalid` sin cifras de tendencia.
 * - Siempre: método, periodo, n, unidades, α y procedencia (SC-A01).
 */
import type { Catalog, SeriesFile, TrendFlag, TrendRow, TrendStatus } from '../../lib/data'
import type { Explanation } from '../../content'
import { HAS_TREND, evidenceLabel, type Extras } from './analysisData'
import Term from './Term'
import {
  fmtAlpha, fmtInterval, fmtNumber, fmtP, fmtPercent, fmtSigned, fmtSlope, fmtYear, fmtYears,
} from './format'

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
    <section className={`verdict verdict--${status}`} aria-label="Resultado">
      <p className="verdict-head">
        <VerdictIcon status={status} />
        <span className="verdict-word">{explanation.verdict}</span>
      </p>
      {showSlope && (
        <p className="verdict-change">
          <span className="verdict-slope">{fmtSlope(row.slope_decade, unit, digits)}</span>
          {extras.pct && <span className="verdict-pct">{` (${fmtPercent(extras.pct.slope)} por década)`}</span>}
        </p>
      )}
    </section>
  )
}

// ---------- Cifras y metadatos obligatorios ----------

const METHOD_LABEL: Record<string, string> = {
  'theil-sen': 'Pendiente de Theil-Sen',
  'mann-kendall-ar1-corrected': 'prueba de Mann-Kendall corregida por autocorrelación',
  'sen-1968-95': 'Intervalo de Sen (1968) al 95 %',
  'ols-santer-2000': 'Mínimos cuadrados con ajuste de Santer (2000)',
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
          <dt>Intervalo del 95 %</dt>
          <dd>
            <Term k="ci">{`${fmtInterval(row.ci_low, row.ci_high, digits)} ${unit} por década`}</Term>
            {extras.pct && extras.pct.low !== null && extras.pct.high !== null && (
              <span className="result-sub">{`(de ${fmtSigned(extras.pct.low, 1)} a ${fmtSigned(extras.pct.high, 1)} % por década)`}</span>
            )}
          </dd>
        </>
      )}
      {evidence && (
        <>
          <dt>Evidencia</dt>
          <dd>
            {evidence}
            <span className="result-sub result-sub--terms">
              <Term k="p">{fmtP(row?.p)}</Term>
              <Term k="alpha">{fmtAlpha(catalog.alpha)}</Term>
            </span>
          </dd>
        </>
      )}
      <dt>Periodo</dt>
      <dd>{fmtYears(from, to)}</dd>
      <dt>Años completos (n)</dt>
      <dd>{row ? row.n : '—'}</dd>
      <dt>Unidades</dt>
      <dd>{`${unit} (cambio en ${unit} por década)`}</dd>
      <dt>Método</dt>
      <dd>
        {`${methodLabel(catalog.method.slope)} y ${methodLabel(catalog.method.test)}; `}
        {fmtAlpha(catalog.alpha)}
      </dd>
      <dt>Procedencia</dt>
      <dd>{`${series.provenance.source} · ${series.provenance.product}`}</dd>
    </dl>
  )
}

// ---------- En palabras ----------

export function InWords({ sentence, caveats, notCause }: { sentence: string | null; caveats: string[]; notCause: string | null }) {
  if (!sentence && !notCause && caveats.length === 0) return null
  return (
    <section className="in-words" aria-label="En palabras">
      <h3>En palabras</h3>
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
    case 'autocorr': return 'Los años consecutivos se parecen entre sí (autocorrelación): el valor p ya lo tiene en cuenta.'
    case 'step': return stepYear !== null
      ? `Hay un salto brusco hacia ${fmtYear(stepYear)}: la pendiente resume un cambio neto, no necesariamente gradual.`
      : 'Hay un salto brusco en la serie: la pendiente resume un cambio neto, no necesariamente gradual.'
    case 'short': return 'Menos de 30 años completos: el resultado es más incierto.'
    case 'ties': return 'Hay valores repetidos (empates) en la serie; la prueba los corrige.'
    case 'small_region': return 'La región es más pequeña que una celda del modelo: el valor representa también a sus vecinos.'
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
      <summary>Detalles técnicos</summary>
      <dl className="result-facts">
        <dt>Pendiente</dt><dd>{methodLabel(catalog.method.slope)}</dd>
        <dt>Prueba</dt><dd>{methodLabel(catalog.method.test)}</dd>
        <dt>Intervalo</dt><dd>{methodLabel(catalog.method.interval)}</dd>
        <dt>Contraste</dt><dd>{methodLabel(catalog.method.contrast)}</dd>
        {trend && (
          <>
            <dt>Valor p corregido</dt><dd>{fmtP(row.p)}</dd>
            <dt>Valor p sin corregir</dt><dd>{fmtP(row.p_uncorrected)}</dd>
            <dt>Autocorrelación (lag 1)</dt><dd>{fmtNumber(row.r1, 2)}</dd>
            <dt>Contraste (mínimos cuadrados)</dt>
            <dd>{`${fmtSlope(row.ols_slope_decade, unit, digits)}; ${fmtP(row.ols_p)}`}</dd>
          </>
        )}
      </dl>
      <h4 className="analysis-details-sub">Supuestos</h4>
      <ul className="analysis-notes">
        <li>Un valor por año completo: los años incompletos se excluyen y nunca se rellenan. Al usar valores anuales, el ciclo de las estaciones no influye.</li>
        <li>Se busca un cambio monótono (siempre en la misma dirección). La pendiente lo resume, pero no explica su causa ni predice el futuro.</li>
        <li>Los años consecutivos pueden parecerse entre sí (autocorrelación de lag 1): la prueba y el intervalo lo corrigen.</li>
        <li>{`${fmtAlpha(catalog.alpha)}, fijado antes de mirar los datos.`}</li>
      </ul>
      {notes.length > 0 && (
        <>
          <h4 className="analysis-details-sub">Diagnósticos de esta serie</h4>
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
      <summary>De dónde salen estos datos</summary>
      <dl className="result-facts">
        <dt>Fuente</dt><dd>{p.source}</dd>
        <dt>Producto</dt>
        <dd>
          {p.short_name ? `${p.product} · ${p.short_name}${p.version ? ` versión ${p.version}` : ''}` : p.product}
          {p.api_version && p.api_version !== 'n/a' && <span className="result-sub">{`Versión de la API: ${p.api_version}`}</span>}
        </dd>
        <dt>Cita (DOI)</dt>
        <dd>
          {p.doi
            ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.doi}</a>
            : 'Sin DOI registrado en el archivo'}
        </dd>
        <dt>Variable de origen</dt><dd>{`${p.parameter} (${p.unit_declared})`}</dd>
        <dt>Malla</dt><dd>{p.grid}</dd>
        <dt>Promedio regional</dt><dd>{p.spatial_method}</dd>
        <dt>Celdas usadas</dt><dd>{p.n_cells}</dd>
        {typeof p.granules === 'number' && <><dt>Archivos leídos</dt><dd>{`${p.granules} gránulos`}</dd></>}
        <dt>Consultado</dt><dd>{p.retrieved_at_utc}</dd>
        <dt>Solicitudes</dt><dd>{p.requests}</dd>
      </dl>
      {p.transformations.length > 0 && (
        <>
          <h4 className="analysis-details-sub">Transformaciones</h4>
          <ol className="analysis-notes">
            {p.transformations.map(t => <li key={t}>{t}</li>)}
          </ol>
        </>
      )}
    </details>
  )
}
