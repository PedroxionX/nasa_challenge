/**
 * Dos gráficas apiladas con el eje de años compartido (007 T014, FR-K07). Cada región tiene su propia escala
 * vertical: así se leen juntas series de cualquier unidad y nivel sin que el navegador centre, normalice ni
 * promedie nada. La recta solo se traza si el archivo trae `line_mid`. Alternativa: «Ver como tabla».
 */
import { useId, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { useWidth } from '../../lib/ui/useWidth'
import { line } from 'd3-shape'
import type { TrendRow } from '../../lib/data'
import { COMPARE_COPY } from '../../content'
import { senSegment, type YearPoint } from './compareData'
import { fmtTick, fmtValue } from '../../lib/format'

export interface ChartItem {
  /** «A» o «B»: la marca que también lleva la región en el globo y en la tabla. */
  tag: string
  name: string
  points: YearPoint[]
  row: TrendRow | null
}

const H = 132
const M = { top: 26, right: 10, bottom: 8, left: 46 }
const AXIS = 18

function Mini({ item, unit, from, to, domain, withAxis, width: W }: {
  item: ChartItem; unit: string; from: number; to: number; domain: [number, number]; withAxis: boolean; width: number
}) {
  const height = H + (withAxis ? AXIS : 0)
  const values = item.points.map(p => p.value)
  const sen = senSegment(item.row)
  const all = sen ? [...values, sen[0].value, sen[1].value] : values
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const pad = hi > lo ? (hi - lo) * 0.08 : Math.abs(hi) * 0.05 || 1
  const x = scaleLinear().domain([domain[0] - 0.5, domain[1] + 0.5]).range([M.left, W - M.right])
  const y = scaleLinear().domain([lo - pad, hi + pad]).nice(3).range([H - M.bottom, M.top])
  const yTicks = y.ticks(3)
  const step = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1
  const xTicks = x.ticks(W < 420 ? 4 : 8).filter(Number.isInteger)
  const path = line<YearPoint>().x(p => x(p.year)).y(p => y(p.value))(item.points) ?? ''
  const plot = { left: M.left, right: W - M.right, top: M.top, bottom: H - M.bottom }
  const inPeriod = (year: number) => year >= from && year <= to
  return (
    <svg className="chart-svg" width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img"
      aria-label={`Yearly values for ${item.name}, in ${unit}. The values are in the table.`}>
      <text className="chart-title" x={0} y={12}>
        <tspan className="chart-title-tag">{item.tag}</tspan>{` · ${item.name}`}
      </text>
      <text className="chart-unit" x={W - M.right} y={12} textAnchor="end">{unit}</text>
      {yTicks.map(t => (
        <g key={t}>
          <line className="chart-grid" x1={plot.left} x2={plot.right} y1={y(t)} y2={y(t)} />
          <text className="chart-tick" x={plot.left - 6} y={y(t)} dy="0.32em" textAnchor="end">{fmtTick(t, step)}</text>
        </g>
      ))}
      {from > domain[0] && (
        <rect className="chart-outside" x={plot.left} y={plot.top} width={Math.max(0, x(from - 0.5) - plot.left)} height={plot.bottom - plot.top} />
      )}
      {to < domain[1] && (
        <rect className="chart-outside" x={x(to + 0.5)} y={plot.top} width={Math.max(0, plot.right - x(to + 0.5))} height={plot.bottom - plot.top} />
      )}
      <path className="chart-line" d={path} />
      {sen && <line className="chart-sen" x1={x(sen[0].year)} y1={y(sen[0].value)} x2={x(sen[1].year)} y2={y(sen[1].value)} />}
      {item.points.map(p => (
        <circle key={p.year} className={inPeriod(p.year) ? 'chart-point' : 'chart-point is-outside'} cx={x(p.year)} cy={y(p.value)} r={3} />
      ))}
      {withAxis && xTicks.map(t => (
        <text key={t} className="chart-tick" x={x(t)} y={H + 10} textAnchor="middle">{t}</text>
      ))}
    </svg>
  )
}

export default function PairChart({ items, unit, from, to }: { items: ChartItem[]; unit: string; from: number; to: number }) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  const { ref, width } = useWidth<HTMLElement>()
  const years = [...new Set(items.flatMap(i => i.points.map(p => p.year)))].sort((a, b) => a - b)
  if (years.length === 0) return null
  const domain: [number, number] = [years[0], years[years.length - 1]]
  const valueAt = (item: ChartItem, year: number) => item.points.find(p => p.year === year)?.value
  const anySen = items.some(i => senSegment(i.row) !== null)
  return (
    <figure className="chart" ref={ref}>
      <h3 className="section-title">{COMPARE_COPY.chartHeading}</h3>
      {items.map((item, i) => (
        <Mini key={item.tag} item={item} unit={unit} from={from} to={to} domain={domain} withAxis={i === items.length - 1} width={width} />
      ))}
      <figcaption className="chart-legend">
        <span><i className="swatch swatch--point" aria-hidden="true" />Yearly value</span>
        {anySen
          ? <span><i className="swatch swatch--sen" aria-hidden="true" />Trend line for the period</span>
          : <span>No trend line for this period</span>}
        <span>Each chart has its own vertical scale.</span>
      </figcaption>
      <button type="button" className="link-button" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable(s => !s)}>
        {showTable ? 'Hide table' : 'View as table'}
      </button>
      <div id={tableId} className="table-wrap table-wrap--tall" hidden={!showTable} role="region" aria-label="Yearly values table for both states" tabIndex={0}>
        <table className="data-table">
          <caption className="vh">{`Yearly values (${unit})`}</caption>
          <thead>
            <tr><th scope="col">Year</th>{items.map(i => <th key={i.tag} scope="col" className="num">{`${i.tag} · ${i.name}`}</th>)}</tr>
          </thead>
          <tbody>
            {years.map(year => (
              <tr key={year} className={year >= from && year <= to ? undefined : 'is-dim'}>
                <th scope="row">{year}</th>
                {items.map(i => <td key={i.tag} className="num">{fmtValue(valueAt(i, year))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
