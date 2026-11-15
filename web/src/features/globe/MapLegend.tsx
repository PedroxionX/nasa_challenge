/**
 * Leyenda del mapa de tendencias (005 T005). Dice qué significa el color (cambio estimado,
 * no significancia), distingue «sin datos» con trama y texto, y da acceso a la tabla.
 */
import { useEffect, useRef, useState } from 'react'
import { UI_COPY } from '../../content'
import { GLOBE_COPY } from './copy'
import { formatBreak } from './format'
import { classRanges, paletteIndex, type Palette } from './mapColors'

export type LayerStatus = 'loading' | 'error' | 'no-window' | 'ready'

interface Props {
  status: LayerStatus
  variableLabel: string
  unit: string | null
  breaks: number[]
  labels: string[]
  palette: Palette
  regionCount: number
  from: number
  to: number
  onRetry: () => void
  onOpenTable: () => void
  onGlobalView: () => void
}

const startsOpen = () =>
  typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 900px) and (min-height: 640px)').matches

export default function MapLegend(p: Props) {
  const [open, setOpen] = useState(startsOpen)
  const toolsRef = useRef<HTMLDivElement>(null)
  const ranges = classRanges(p.breaks, formatBreak)

  useEffect(() => {
    const el = toolsRef.current
    if (!el) return
    const measure = () => {
      const compact = window.matchMedia?.('(max-width: 899px), (max-height: 500px)').matches
      const top = compact ? el.offsetTop + el.offsetHeight + 8 : 0
      const value = `${top}px`
      const style = document.documentElement.style
      if (style.getPropertyValue('--globe-inset-top') !== value) style.setProperty('--globe-inset-top', value)
    }
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
      document.documentElement.style.setProperty('--globe-inset-top', '0px')
    }
  }, [])

  return (
    <div className="globe-tools" ref={toolsRef}>
      <details className="globe-legend" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
        <summary>
          <span className="globe-legend-title">{GLOBE_COPY.legendTitle}</span>
          <span className="globe-legend-sub">
            {p.variableLabel}{p.unit ? ` · ${p.unit}` : ''} · {p.from}–{p.to}
          </span>
        </summary>

        {p.status === 'loading' && <p className="globe-legend-note" role="status">{GLOBE_COPY.layerLoading}</p>}
        {p.status === 'error' && (
          <p className="globe-legend-note" role="alert">
            {GLOBE_COPY.layerError}{' '}
            <button type="button" onClick={p.onRetry}>{UI_COPY.retry}</button>
          </p>
        )}
        {p.status === 'no-window' && <p className="globe-legend-note" role="status">{GLOBE_COPY.noWindow}</p>}

        {p.status === 'ready' && (
          <>
            <ul className="globe-legend-classes">
              {ranges.map((range, i) => (
                <li key={range}>
                  <span
                    className="globe-swatch"
                    style={{ background: p.palette.classes[paletteIndex(i, ranges.length, p.palette.classes.length)] }}
                    aria-hidden="true"
                  />
                  <span className="globe-legend-label">{p.labels[i] ?? ''}</span>
                  <span className="globe-legend-range">{range}</span>
                </li>
              ))}
              <li>
                <span className="globe-swatch globe-swatch-nodata" aria-hidden="true" />
                <span className="globe-legend-label">{GLOBE_COPY.noData}</span>
              </li>
              <li>
                <span className="globe-swatch globe-swatch-selected" aria-hidden="true" />
                <span className="globe-legend-label">{GLOBE_COPY.selectedCue}</span>
              </li>
            </ul>
            <p className="globe-legend-note">
              {GLOBE_COPY.colorNote} {GLOBE_COPY.manyRegions(p.regionCount)}
            </p>
          </>
        )}
      </details>

      <div className="globe-actions">
        <button type="button" onClick={p.onOpenTable}>{GLOBE_COPY.showTable}</button>
        <button type="button" onClick={p.onGlobalView} aria-label={GLOBE_COPY.globalView}>
          <span className="globe-global-text">{GLOBE_COPY.globalView}</span>
          <svg className="globe-global-icon" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg>
        </button>
      </div>
    </div>
  )
}
