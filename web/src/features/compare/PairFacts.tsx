/**
 * Resultado de cada región por separado y procedencia de las dos series (007 T013, FR-K06, SC-K02).
 * Las cifras son las filas de `windows` de cada serie, las mismas que enseña el panel de 004.
 */
import type { SeriesFile } from '../../lib/data'
import { COMPARE_COPY } from '../../content'
import { HAS_TREND, type Individual } from './compareData'
import { digitsFor, fmtInterval, fmtP, fmtSigned, MISSING } from './format'

export interface Side {
  /** «A» (región principal) o «B» (la comparada). */
  tag: string
  name: string
  series: SeriesFile
  result: Individual
  /** Palabra del veredicto individual («Sube», «Sin evidencia suficiente»…), de los textos de 006. */
  verdict: string
}

export function EachRegion({ sides, unit }: { sides: Side[]; unit: string }) {
  return (
    <section aria-label={COMPARE_COPY.eachHeading}>
      <h3 className="compare-heading">{COMPARE_COPY.eachHeading}</h3>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Estado</th>
              <th scope="col">Resultado</th>
              <th scope="col">{`Cambio por década (${unit})`}</th>
              <th scope="col">Intervalo</th>
              <th scope="col">Valor p</th>
              <th scope="col">Años</th>
            </tr>
          </thead>
          <tbody>
            {sides.map(({ tag, name, result, verdict }) => {
              const row = result.row
              const shown = row !== null && HAS_TREND.has(result.status)
              const digits = digitsFor(row?.slope_decade, row?.ci_low, row?.ci_high)
              return (
                <tr key={tag}>
                  <th scope="row"><span className="compare-tag">{tag}</span>{name}</th>
                  <td>{verdict}</td>
                  <td>
                    {shown ? fmtSigned(row.slope_decade, digits) : MISSING}
                    {shown && result.pct && <span className="compare-muted">{` (${fmtSigned(result.pct.slope, 1)} %)`}</span>}
                  </td>
                  <td>{shown ? fmtInterval(row.ci_low, row.ci_high, digits) : MISSING}</td>
                  <td>{shown ? fmtP(row.p) : MISSING}</td>
                  <td>{row ? row.n : MISSING}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function provenanceLine(series: SeriesFile): string {
  const p = series.provenance
  const product = [p.short_name ?? p.product, p.version ? `versión ${p.version}` : null].filter(Boolean).join(' ')
  const parts = [p.source, product, `variable ${p.parameter}`, p.grid ? `malla ${p.grid}` : null,
    `${p.n_cells} celdas`, p.retrieved_at_utc ? `consultado el ${p.retrieved_at_utc.slice(0, 10)}` : null]
  return parts.filter(Boolean).join(' · ')
}

export function PairProvenance({ sides }: { sides: Side[] }) {
  return (
    <details className="compare-details">
      <summary>Procedencia de las dos series</summary>
      <dl className="compare-facts">
        {sides.map(({ tag, name, series }) => (
          <div key={tag}>
            <dt><span className="compare-tag">{tag}</span>{name}</dt>
            <dd>
              {provenanceLine(series)}
              {series.provenance.is_synthetic && ' · datos de ejemplo sintéticos'}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
