/**
 * Aviso de periodo elegido y vista de variación (004 T008, FR-A07).
 * Solo aparece cuando el periodo no es el completo. La mini gráfica muestra, para el año final elegido,
 * la pendiente por década y su intervalo con cada año inicial posible. Todas las cifras son filas de
 * `windows`: el navegador no calcula ninguna.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { area, line } from 'd3-shape'
import type { SeriesFile, TrendRow } from '../../lib/data'
import type { Explanation } from '../../content'
import { HAS_TREND, windowsEndingAt } from './analysisData'
import { fmtInterval, fmtSigned, fmtTick, fmtYear, fmtYears } from './format'

interface Props {
  series: SeriesFile
  from: number
  to: number
  unit: string
  digits: number
  /** Veredicto de cada fila con los textos de 006 (explainTrend). */
  verdictOf: (row: TrendRow) => Explanation['verdict']
}

const HEIGHT = 170
const M = { top: 14, right: 12, bottom: 26, left: 46 }

function useWidth(fallback = 320) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

export default function PeriodVariation({ series, from, to, unit, digits, verdictOf }: Props) {
  const [open, setOpen] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const uid = useId()
  const { ref, width } = useWidth()

  const rows = windowsEndingAt(series, to)
  const plotted = rows.filter(r => HAS_TREND.has(r.status) && r.slope_decade !== null)

  return (
    <section className="period-variation" aria-label="Aviso de periodo">
      <p className="period-variation-notice">
        <strong>{`Estás viendo ${fmtYears(from, to)}.`}</strong> El resultado depende del periodo elegido.
      </p>
      <button
        type="button"
        className="analysis-link-button"
        aria-expanded={open}
        aria-controls={`${uid}-view`}
        onClick={() => setOpen(o => !o)}
      >
        {open ? 'Ocultar cómo cambia' : 'Ver cómo cambia según el año inicial'}
      </button>

      <div id={`${uid}-view`} className="period-variation-view" hidden={!open} ref={ref}>
        {open && plotted.length > 0 && (
          <p className="period-variation-caption">
            {`Cambio por década si el análisis empezara en cada año (eje horizontal), siempre hasta ${fmtYear(to)}. El círculo marca tu elección.`}
          </p>
        )}
        {open && (plotted.length === 0
          ? <p className="analysis-muted">{`No hay ningún año inicial con tendencia evaluable que termine en ${fmtYear(to)}.`}</p>
          : <VariationChart rows={plotted} from={from} to={to} unit={unit} width={width} uid={uid} />)}

        {open && (
          <>
            <button
              type="button"
              className="analysis-link-button"
              aria-expanded={showTable}
              aria-controls={`${uid}-table`}
              onClick={() => setShowTable(s => !s)}
            >
              {showTable ? 'Ocultar tabla' : 'Ver como tabla'}
            </button>
            <div id={`${uid}-table`} className="trend-chart-table-wrap" hidden={!showTable}>
              <table className="analysis-table">
                <caption className="analysis-vh">{`Pendiente por década según el año inicial, con final en ${fmtYear(to)} (${unit} por década)`}</caption>
                <thead>
                  <tr>
                    <th scope="col">Desde</th>
                    <th scope="col">{`Pendiente (${unit}/década)`}</th>
                    <th scope="col">Intervalo del 95 %</th>
                    <th scope="col">Veredicto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const trend = HAS_TREND.has(r.status)
                    return (
                      <tr key={r.start} className={r.start === from ? 'is-current' : undefined} aria-current={r.start === from ? 'true' : undefined}>
                        <th scope="row">{fmtYear(r.start)}</th>
                        <td>{trend ? fmtSigned(r.slope_decade, digits) : '—'}</td>
                        <td>{trend ? fmtInterval(r.ci_low, r.ci_high, digits) : '—'}</td>
                        <td>{verdictOf(r)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function VariationChart({ rows, from, to, unit, width, uid }: {
  rows: TrendRow[]
  from: number
  to: number
  unit: string
  width: number
  uid: string
}) {
  const lows = rows.map(r => r.ci_low ?? r.slope_decade!)
  const highs = rows.map(r => r.ci_high ?? r.slope_decade!)
  const yMin = Math.min(0, ...lows)
  const yMax = Math.max(0, ...highs)
  const pad = (yMax - yMin) * 0.08 || 0.1

  const x = scaleLinear().domain([rows[0].start - 0.5, rows[rows.length - 1].start + 0.5]).range([M.left, width - M.right])
  const y = scaleLinear().domain([yMin - pad, yMax + pad]).nice().range([HEIGHT - M.bottom, M.top])
  const yTicks = y.ticks(4)
  const yStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1
  const xTicks = x.ticks(width < 420 ? 4 : 7).filter(t => Number.isInteger(t))

  const withBand = rows.filter(r => r.ci_low !== null && r.ci_high !== null)
  const band = area<TrendRow>().x(r => x(r.start)).y0(r => y(r.ci_low!)).y1(r => y(r.ci_high!))(withBand) ?? ''
  const path = line<TrendRow>().x(r => x(r.start)).y(r => y(r.slope_decade!))(rows) ?? ''
  const current = rows.find(r => r.start === from)

  return (
    <svg
      className="variation-chart"
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      role="img"
      aria-labelledby={`${uid}-vtitle ${uid}-vdesc`}
    >
      <title id={`${uid}-vtitle`}>{`Pendiente por década según el año inicial, con final en ${fmtYear(to)}`}</title>
      <desc id={`${uid}-vdesc`}>
        {`Cada punto es el resultado de empezar en ese año. La banda es el intervalo del 95 %. ${current ? `El año inicial elegido, ${fmtYear(from)}, está marcado.` : ''} Los valores exactos están en «Ver como tabla».`}
      </desc>
      {yTicks.map(t => (
        <g key={`y${t}`}>
          <line className={t === 0 ? 'variation-zero' : 'trend-chart-grid'} x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
          <text className="trend-chart-tick" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">{fmtTick(t, yStep)}</text>
        </g>
      ))}
      <text className="trend-chart-unit" x={M.left - 6} y={M.top - 4} textAnchor="end">{`${unit}/déc.`}</text>
      {xTicks.map(t => (
        <text key={`x${t}`} className="trend-chart-tick" x={x(t)} y={HEIGHT - 8} textAnchor="middle">{fmtYear(t)}</text>
      ))}
      {band && <path className="trend-chart-band" d={band} />}
      <path className="variation-line" d={path} />
      {rows.map(r => (
        <circle key={r.start} className="variation-point" cx={x(r.start)} cy={y(r.slope_decade!)} r={2.5} />
      ))}
      {current && (
        <g className="variation-current">
          <line x1={x(current.start)} x2={x(current.start)} y1={M.top} y2={HEIGHT - M.bottom} />
          <circle cx={x(current.start)} cy={y(current.slope_decade!)} r={6} />
          <text x={x(current.start)} y={M.top - 2} textAnchor="middle">{fmtYear(current.start)}</text>
        </g>
      )}
    </svg>
  )
}
