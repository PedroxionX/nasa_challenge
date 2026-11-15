/**
 * MethodsSheet — 006-guide-content T005
 * Hoja de métodos y fuentes, colocada por el armazón dentro de un diálogo (002).
 *
 * Contenido (FR-C04):
 * - Texto cualitativo fijo redactado por 006: qué es cada método y sus límites.
 * - Valores numéricos (α, periodo, nivel del intervalo) leídos del catálogo en tiempo de ejecución.
 * - El catálogo entrega CÓDIGOS de método (contrato de datos); aquí se traducen a texto.
 *   Un código desconocido se muestra tal cual, sin inventar su significado.
 */
import { useEffect, useState } from 'react'
import { loadCatalog, loadSeries, variablePeriod, type Catalog } from '../../lib/data'
import { variableCopy, UI_COPY, GLOSSARY, productCitation, COMPARE_COPY } from '../../content'
import './guide.css'

// Códigos del contrato: specs/001-trend-explorer-mvp/contracts/data-files.md
const DEFAULT_METHOD = {
  slope: 'theil-sen',
  test: 'mann-kendall-ar1-corrected',
  interval: 'sen-1968-95',
  contrast: 'ols-santer-2000',
} as const

const SLOPE_TEXT: Record<string, string> = {
  'theil-sen': 'Theil-Sen slope',
}
const TEST_TEXT: Record<string, string> = {
  'mann-kendall-ar1-corrected':
    'Mann-Kendall test with the variance corrected for first-order autocorrelation (r₁)',
}
const INTERVAL_TEXT: Record<string, string> = {
  'sen-1968-95': 'Sen (1968) interval, widened by autocorrelation',
}
const CONTRAST_TEXT: Record<string, string> = {
  'ols-santer-2000': 'an ordinary regression with the adjustment of Santer et al. (2000)',
}

/** Texto legible para un código del catálogo; si no se conoce, el código tal cual. */
function describe(table: Record<string, string>, code: string): string {
  return table[code] ?? `method “${code}”`
}

interface ProductSource {
  shortName: string
  version: string
  /** Una variable del producto, para leer la fecha de consulta de una de sus series. */
  variableId: string
}

/** Productos distintos que publica el catálogo, en el orden de sus variables. */
function catalogProducts(catalog: Catalog): ProductSource[] {
  const seen = new Map<string, ProductSource>()
  for (const v of catalog.variables) {
    if (v.product_short_name && !seen.has(v.product_short_name)) {
      seen.set(v.product_short_name, {
        shortName: v.product_short_name, version: v.product_version ?? '', variableId: v.id,
      })
    }
  }
  return [...seen.values()]
}

/**
 * Fecha de consulta (AAAA-MM-DD) de cada producto: `provenance.retrieved_at_utc` de una serie suya
 * (la de la primera región del catálogo). Si la serie no carga, el producto queda sin fecha.
 */
function useRetrievedDates(catalog: Catalog | null): Record<string, string> {
  const [dates, setDates] = useState<Record<string, string>>({})
  useEffect(() => {
    const region = catalog?.regions[0]?.id
    if (!catalog || !region) return
    let alive = true
    Promise.all(
      catalogProducts(catalog).map(p =>
        loadSeries(p.variableId, region)
          .then(s => [p.shortName, s.provenance.retrieved_at_utc.slice(0, 10)] as const)
          .catch(() => null),
      ),
    ).then(rows => {
      if (alive) setDates(Object.fromEntries(rows.filter(r => r !== null)))
    })
    return () => { alive = false }
  }, [catalog])
  return dates
}

export default function MethodsSheet() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch(() => setError(true))
  }, [])

  const alpha = catalog?.alpha ?? 0.05
  const level = Math.round((1 - alpha) * 100)
  const minWindow = catalog?.period.min_window_years ?? 10
  const method = catalog?.method ?? DEFAULT_METHOD
  const products = catalog ? catalogProducts(catalog) : []
  const retrieved = useRetrievedDates(catalog)

  return (
    // El título y el cierre los pone el diálogo del armazón (un solo patrón de diálogo en toda la app).
    <article className="methods-sheet">

      {error && (
        <p className="notice notice--error" role="alert">
          The catalog could not be loaded. Showing the values from the data contract.
        </p>
      )}

      {/* Periodo */}
      <section className="methods-section">
        <h3>Period analyzed</h3>
        <p>
          Each variable has its own period, set by the product it comes from; it is listed
          next to each one under “Available variables”. Only complete years (12 valid months) are used,
          because aggregating by year removes the seasonal cycle. With fewer than {minWindow} complete
          years no trend is computed. A shorter period has fewer years and therefore
          less power to tell a trend from chance.
        </p>
      </section>

      {/* Tendencia */}
      <section className="methods-section">
        <h3>How the trend is computed</h3>
        <p>
          <strong>Slope</strong>: {describe(SLOPE_TEXT, method.slope)}.{' '}
          {GLOSSARY.slope}
        </p>
        <p>
          <strong>Significance test</strong>: {describe(TEST_TEXT, method.test)}.
          It does not require the data to follow a normal distribution. The significance
          level is α&nbsp;=&nbsp;{alpha}.
        </p>
        <p>
          <strong>Confidence interval</strong>: {describe(INTERVAL_TEXT, method.interval)},
          at {level}%.
        </p>
        <p>
          <strong>Cross-check</strong>: alongside the main test, the pipeline also computes{' '}
          {describe(CONTRAST_TEXT, method.contrast)}. It is there for comparison; it is not the
          result shown as the verdict.
        </p>
      </section>

      {/* Comparación entre regiones (007, T020) */}
      <section className="methods-section">
        <h3>Comparing two regions</h3>
        <p>{COMPARE_COPY.method}</p>
        <p>
          {COMPARE_COPY.absoluteBasis} For variables read as a relative change
          (such as precipitation), {COMPARE_COPY.relativeBasis.charAt(0).toLowerCase() + COMPARE_COPY.relativeBasis.slice(1)}
        </p>
        <p>
          {COMPARE_COPY.oppositeSigns} {COMPARE_COPY.manyPairs} {COMPARE_COPY.notCause}
        </p>
      </section>

      {/* Autocorrelación — texto cualitativo fijo (FR-C04) */}
      <section className="methods-section">
        <h3>Limits of the autocorrelation correction</h3>
        <p>
          Climate series are not independent: a warm year tends to be followed by
          another warm one. Left uncorrected, that autocorrelation makes a trend
          look more significant than it is.
        </p>
        <p>
          Here the test corrects the variance using only first-order
          autocorrelation (r₁). The correction is imperfect: in a lab experiment
          with strong autocorrelation (φ&nbsp;=&nbsp;0.75) and series of
          30 to 45 years, the corrected test rejected the absence of a trend
          between 9% and 11% of the time, instead of the expected
          5%. With strong autocorrelation, a p-value close to α
          should be read with caution.
        </p>
        <p>
          When r₁ is significant, the result carries the “autocorr” flag in
          the data. If the series has an abrupt jump (a change of instrument, a
          late bias correction), the computed autocorrelation can be
          wrong: the jump diagnostic is stored in the diagnostics field of
          each series and the analysis is marked as not valid.
        </p>
      </section>

      {/* Qué significa un resultado — FR-C01 */}
      <section className="methods-section">
        <h3>What a result means, and what it does not</h3>
        <p>{UI_COPY.significanceNote}</p>
        <p>{UI_COPY.notCause}</p>
      </section>

      {/* Términos — FR-C03 */}
      <section className="methods-section">
        <h3>Terms</h3>
        <dl className="methods-variables">
          <div className="methods-variable-item">
            <dt>Slope</dt>
            <dd>{GLOSSARY.slope}</dd>
          </div>
          <div className="methods-variable-item">
            <dt>Confidence interval</dt>
            <dd>{GLOSSARY.ci}</dd>
          </div>
          <div className="methods-variable-item">
            <dt>p-value</dt>
            <dd>{GLOSSARY.p}</dd>
          </div>
          <div className="methods-variable-item">
            <dt>α</dt>
            <dd>{GLOSSARY.alpha}</dd>
          </div>
        </dl>
      </section>

      {/* Variables */}
      <section className="methods-section">
        <h3>Available variables</h3>
        <dl className="methods-variables">
          {(catalog?.variables ?? []).map(v => {
            const copy = variableCopy(v.id, v)
            const { firstYear, lastYear } = variablePeriod(catalog!, v.id)
            return (
              <div key={v.id} className="methods-variable-item">
                <dt>{copy.label}</dt>
                <dd>
                  {copy.definition}
                  <span className="methods-origin">
                    {' '}Source: {v.product_short_name ?? 'product not declared'}
                    {v.product_version ? ` v${v.product_version}` : ''}. Period: {firstYear}–{lastYear}.
                  </span>
                </dd>
              </div>
            )
          })}
        </dl>
      </section>

      {/* Cómo citar */}
      <section className="methods-section">
        <h3>How to cite</h3>
        <p>
          The data come from NASA products distributed by the Goddard
          Earth Sciences Data and Information Services Center (GES DISC): the
          MERRA-2 reanalysis (Modern-Era Retrospective analysis for Research and
          Applications, Version 2), GPM IMERG and the GLDAS Noah model. The average
          for each state is computed by Trend Detective.
        </p>
        <p>
          Each value is an <strong>area average over the state</strong>, weighted by
          latitude and by the part of each cell that falls inside the state; it is not the
          value at a point or at a station. The retrieval date of each series
          is also shown under “Where these data come from”, inside the analysis.
        </p>
        <ul className="methods-citations">
          {products.map(p => (
            <li key={p.shortName}>
              {productCitation(p.shortName, p.version)}
              {retrieved[p.shortName] && <> Retrieved: {retrieved[p.shortName]}.</>}
            </li>
          ))}
        </ul>
        <p>
          To cite this tool:{' '}
          <em>
            Trend Detective, NASA Space Apps Challenge 2026 (Earth System Trend Detective). Data: MERRA-2, GPM
            IMERG and GLDAS / NASA GES DISC.
          </em>
        </p>
      </section>

      <footer className="methods-footer">
        <p className="methods-legend-note">{UI_COPY.legendNote}</p>
      </footer>
    </article>
  )
}
