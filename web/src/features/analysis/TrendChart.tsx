/**
 * Gráfica anual (004 T003): SVG propio con d3-scale y d3-shape.
 * Puntos anuales · recta de Sen y banda del IC 95 % (solo con `line_mid`, FR-A10) · años excluidos con trama ·
 * año parcial rotulado (el contrato no trae su valor: no se inventa) · tramo fuera del periodo atenuado ·
 * alternativa «Ver como tabla» con los valores del archivo.
 * El navegador solo traza: no calcula ninguna cifra estadística.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { area, line } from 'd3-shape'
import type { SeriesFile, TrendRow } from '../../lib/data'
import { HAS_TREND, yearPoints, type YearPoint } from './analysisData'
import { fmtTick, fmtValue, fmtYear, fmtYears } from './format'

interface Props {
  series: SeriesFile
  row: TrendRow | null
  from: number
  to: number
  unit: string
  variableLabel: string
  regionName: string
  /** Valor de la recta de Sen en el año central de la ventana (FR-A10); `null` = sin recta. */
  lineMid: number | null
}

const HEIGHT = 210
const M = { top: 22, right: 14, bottom: 28, left: 46 }

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

/** Por qué la gráfica no lleva recta: los puntos son los valores del archivo, no una tendencia. */
function noLineReason(row: TrendRow | null): string {
  if (!row || row.status === 'insufficient') return 'Sin recta de tendencia: hay menos de 10 años completos en este periodo.'
  if (row.status === 'invalid') return 'Sin recta de tendencia: el análisis no es válido para estos datos (ver «Detalles técnicos»).'
  return 'Recta de tendencia pendiente: el archivo aún no trae su posición.'
}

/** Inserta un hueco (`null`) entre años no consecutivos para que la línea no los una. */
function withGaps(points: YearPoint[]): (YearPoint | null)[] {
  const out: (YearPoint | null)[] = []
  points.forEach((p, i) => {
    if (i > 0 && p.year - points[i - 1].year > 1) out.push(null)
    out.push(p)
  })
  return out
}

export default function TrendChart({ series, row, from, to, unit, variableLabel, regionName, lineMid }: Props) {
  const { ref, width } = useWidth()
  const [showTable, setShowTable] = useState(false)
  const uid = useId()
  const points = useMemo(() => yearPoints(series), [series])
  const partial = series.partial_year ?? null
  const excluded = series.excluded_years

  const slope = row && HAS_TREND.has(row.status) ? row.slope_decade : null
  const drawLine = lineMid !== null && slope !== null && row !== null
  const center = row ? (row.start + row.end) / 2 : 0
  // Trazo de una recta que pasa por (centro, line_mid) con pendiente por década dada.
  const lineAt = (perDecade: number, year: number) => (lineMid ?? 0) + (perDecade / 10) * (year - center)

  const years = [...points.map(p => p.year), ...excluded, ...(partial ? [partial.year] : []), from, to]
  const x0 = Math.min(...years)
  const x1 = Math.max(...years)
  const values = points.map(p => p.value)
  if (drawLine && row) values.push(lineAt(slope, row.start), lineAt(slope, row.end))
  const yMin = Math.min(...values)
  const yMax = Math.max(...values)
  const pad = (yMax - yMin) * 0.08 || Math.abs(yMax) * 0.05 || 1

  const x = scaleLinear().domain([x0 - 0.5, x1 + 0.5]).range([M.left, width - M.right])
  const y = scaleLinear().domain([yMin - pad, yMax + pad]).nice().range([HEIGHT - M.bottom, M.top])
  const yTicks = y.ticks(4)
  const yStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1
  const xTicks = x.ticks(width < 420 ? 4 : 8).filter(t => Number.isInteger(t))

  const path = line<YearPoint | null>()
    .defined(d => d !== null)
    .x(d => x(d!.year))
    .y(d => y(d!.value))(withGaps(points)) ?? ''

  let senPath = ''
  let bandPath = ''
  if (drawLine && row) {
    const xs = [row.start, center, row.end]
    senPath = line<number>().x(t => x(t)).y(t => y(lineAt(slope, t)))(xs) ?? ''
    if (row.ci_low !== null && row.ci_high !== null) {
      const lo = row.ci_low
      const hi = row.ci_high
      bandPath = area<number>().x(t => x(t)).y0(t => y(lineAt(lo, t))).y1(t => y(lineAt(hi, t)))(xs) ?? ''
    }
  }

  const inPeriod = (year: number) => year >= from && year <= to
  // Años con dato o excluidos (sin el parcial, que nunca entra en el análisis).
  const dataYears = [...points.map(p => p.year), ...excluded]
  const dataFirst = Math.min(...dataYears)
  const dataLast = Math.max(...dataYears)
  const outsideBefore = from > dataFirst
  const outsideAfter = to < dataLast
  const plot = { left: M.left, right: width - M.right, top: M.top, bottom: HEIGHT - M.bottom }
  const clipId = `${uid}-clip`
  const hatchId = `${uid}-hatch`
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`
  const tableId = `${uid}-table`

  const excludedText = excluded.length === 0
    ? null
    : excluded.length <= 4
      ? `Años incompletos, excluidos: ${excluded.map(fmtYear).join(', ')}`
      : `${excluded.length} años incompletos, excluidos (huecos)`

  // Filas de la tabla: todos los años que aparecen en la gráfica, con su nota.
  const byYear = new Map(points.map(p => [p.year, p.value]))
  const tableRows = [...new Set([...points.map(p => p.year), ...excluded, ...(partial ? [partial.year] : [])])]
    .sort((a, b) => a - b)
    .map(year => {
      const value = byYear.get(year)
      let note = ''
      if (excluded.includes(year)) note = 'Año incompleto: excluido'
      else if (partial && year === partial.year && value === undefined) note = `Año en curso: ${partial.months_valid} de 12 meses, no se usa`
      else if (!inPeriod(year)) note = 'Fuera del periodo elegido'
      return { year, value, note }
    })

  return (
    <figure className="trend-chart" ref={ref}>
      <svg
        className="trend-chart-svg"
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{`Serie anual de ${variableLabel.toLowerCase()} en ${regionName}`}</title>
        <desc id={descId}>
          {`Un punto por año completo. Periodo analizado ${fmtYears(from, to)}. `}
          {drawLine ? 'Incluye la recta de Sen y la banda del intervalo del 95 %. ' : 'Sin recta de tendencia. '}
          Los valores exactos están en «Ver como tabla».
        </desc>
        <defs>
          <clipPath id={clipId}>
            <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} />
          </clipPath>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="trend-chart-hatch" />
          </pattern>
        </defs>

        {/* Rejilla y eje Y */}
        {yTicks.map(t => (
          <g key={`y${t}`}>
            <line className="trend-chart-grid" x1={plot.left} x2={plot.right} y1={y(t)} y2={y(t)} />
            <text className="trend-chart-tick" x={plot.left - 6} y={y(t)} dy="0.32em" textAnchor="end">{fmtTick(t, yStep)}</text>
          </g>
        ))}
        <text className="trend-chart-unit" x={plot.left - 6} y={plot.top - 10} textAnchor="end">{unit}</text>

        {/* Eje X */}
        {xTicks.map(t => (
          <text key={`x${t}`} className="trend-chart-tick" x={x(t)} y={HEIGHT - 8} textAnchor="middle">{fmtYear(t)}</text>
        ))}

        {/* Fuera del periodo elegido: atenuado */}
        {outsideBefore && (
          <rect className="trend-chart-outside" x={plot.left} y={plot.top} width={Math.max(0, x(from - 0.5) - plot.left)} height={plot.bottom - plot.top} />
        )}
        {outsideAfter && (
          <rect className="trend-chart-outside" x={x(to + 0.5)} y={plot.top} width={Math.max(0, x(dataLast + 0.5) - x(to + 0.5))} height={plot.bottom - plot.top} />
        )}

        {/* Años excluidos: huecos con trama */}
        {excluded.map(year => (
          <rect
            key={`ex${year}`}
            className="trend-chart-excluded"
            x={x(year - 0.5)}
            y={plot.top}
            width={Math.max(1, x(year + 0.5) - x(year - 0.5))}
            height={plot.bottom - plot.top}
            fill={`url(#${hatchId})`}
          />
        ))}

        {/* Año parcial: solo se marca */}
        {partial && (
          <g className="trend-chart-partial">
            <line x1={x(partial.year)} x2={x(partial.year)} y1={plot.top} y2={plot.bottom} />
            <text x={x(partial.year)} y={plot.top - 8} textAnchor="end">{`${fmtYear(partial.year)} parcial`}</text>
          </g>
        )}

        <g clipPath={`url(#${clipId})`}>
          {bandPath && <path className="trend-chart-band" d={bandPath} />}
          <path className="trend-chart-line" d={path} />
          {senPath && <path className="trend-chart-sen" d={senPath} />}
          {points.map(p => (
            <circle
              key={p.year}
              className={inPeriod(p.year) ? 'trend-chart-point' : 'trend-chart-point is-outside'}
              cx={x(p.year)}
              cy={y(p.value)}
              r={3}
            />
          ))}
        </g>
      </svg>

      <figcaption className="trend-chart-legend">
        <span className="legend-item"><i className="legend-swatch legend-point" aria-hidden="true" />Valor anual</span>
        {drawLine
          ? (
            <>
              <span className="legend-item"><i className="legend-swatch legend-sen" aria-hidden="true" />Recta de Sen</span>
              {bandPath && <span className="legend-item"><i className="legend-swatch legend-band" aria-hidden="true" />Intervalo del 95 %</span>}
            </>
          )
          : <span className="legend-item legend-note">{noLineReason(row)}</span>}
        {excludedText && <span className="legend-item"><i className="legend-swatch legend-excluded" aria-hidden="true" />{excludedText}</span>}
        {partial && (
          <span className="legend-item"><i className="legend-swatch legend-partial" aria-hidden="true" />
            {`${fmtYear(partial.year)}: ${partial.months_valid} de 12 meses, no se usa`}
          </span>
        )}
        {(outsideBefore || outsideAfter) && (
          <span className="legend-item"><i className="legend-swatch legend-outside" aria-hidden="true" />Fuera del periodo elegido</span>
        )}
      </figcaption>

      <button
        type="button"
        className="analysis-link-button"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable(s => !s)}
      >
        {showTable ? 'Ocultar tabla' : 'Ver como tabla'}
      </button>
      <div id={tableId} className="trend-chart-table-wrap" hidden={!showTable}>
        <table className="analysis-table">
          <caption className="analysis-vh">{`Valores anuales de ${variableLabel.toLowerCase()} en ${regionName} (${unit})`}</caption>
          <thead>
            <tr><th scope="col">Año</th><th scope="col">{`Valor (${unit})`}</th><th scope="col">Nota</th></tr>
          </thead>
          <tbody>
            {tableRows.map(r => (
              <tr key={r.year} className={r.note ? 'is-noted' : undefined}>
                <th scope="row">{fmtYear(r.year)}</th>
                <td>{r.value === undefined ? '—' : fmtValue(r.value)}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
