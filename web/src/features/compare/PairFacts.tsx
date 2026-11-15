/**
 * Resultado de cada región por separado y procedencia de las dos series (007 T013, FR-K06, SC-K02).
 * Las cifras son las filas de `windows` de cada serie, las mismas que enseña el panel de 004.
 */
import type { SeriesFile } from '../../lib/data'
import { COMPARE_COPY, localizeSource } from '../../content'
import { HAS_TREND, type Individual } from './compareData'
import { digitsForValues, fmtInterval, fmtP, fmtSigned, MISSING } from '../../lib/format'

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
        <table className="compare-table compare-each">
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Result</th>
              <th scope="col">{`Change per decade (${unit})`}</th>
              <th scope="col">Interval</th>
              <th scope="col">p-value</th>
              <th scope="col">Years</th>
            </tr>
          </thead>
          <tbody>
            {sides.map(({ tag, name, result, verdict }) => {
              const row = result.row
              const shown = row !== null && HAS_TREND.has(result.status)
              const digits = digitsForValues(row?.slope_decade, row?.ci_low, row?.ci_high)
              return (
                <tr key={tag}>
                  <th scope="row"><span className="compare-tag">{tag}</span>{name}</th>
                  <td className="compare-each-verdict">{verdict}</td>
                  <td data-label={`Change per decade (${unit})`}>
                    {shown ? fmtSigned(row.slope_decade, digits) : MISSING}
                    {shown && result.pct && <span className="compare-muted">{` (${fmtSigned(result.pct.slope, 1)} %)`}</span>}
                  </td>
                  <td data-label="95% interval">{shown ? fmtInterval(row.ci_low, row.ci_high, digits) : MISSING}</td>
                  <td data-label="p-value">{shown ? fmtP(row.p) : MISSING}</td>
                  <td data-label="Complete years">{row ? row.n : MISSING}</td>
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
  const product = [p.short_name ?? p.product, p.version ? `version ${p.version}` : null].filter(Boolean).join(' ')
  const parts = [localizeSource(p.source), product, `variable ${p.parameter}`, p.grid ? `grid ${p.grid}` : null,
    `${p.n_cells} cells`, p.retrieved_at_utc ? `retrieved ${p.retrieved_at_utc.slice(0, 10)}` : null]
  return parts.filter(Boolean).join(' · ')
}

export function PairProvenance({ sides }: { sides: Side[] }) {
  return (
    <details className="compare-details">
      <summary>Where the two series come from</summary>
      <dl className="compare-facts">
        {sides.map(({ tag, name, series }) => (
          <div key={tag}>
            <dt><span className="compare-tag">{tag}</span>{name}</dt>
            <dd>
              {provenanceLine(series)}
              {series.provenance.is_synthetic && ' · synthetic sample data'}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
