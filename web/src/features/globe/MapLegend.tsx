/**
 * Leyenda del mapa de tendencias (005 T005). Compacta: una escala de cinco colores con sus cortes.
 * «About the colors» despliega el detalle: el nombre e intervalo de cada clase, «sin datos» (trama y texto),
 * cómo se marca el estado elegido y qué significa el color (cambio estimado, no significancia).
 * Al lado, el acceso a la tabla y a la vista inicial.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { UI_COPY } from '../../content'
import { GlobeIcon, InfoIcon, TableIcon } from '../../lib/ui/icons'
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

export default function MapLegend(p: Props) {
  // El detalle empieza cerrado: la escala con sus cortes basta para leer el mapa y deja sitio al globo.
  const [open, setOpen] = useState(false)
  const moreId = useId()
  const toolsRef = useRef<HTMLDivElement>(null)
  const ranges = classRanges(p.breaks, formatBreak)
  const color = (i: number) => p.palette.classes[paletteIndex(i, ranges.length, p.palette.classes.length)]

  // En pantallas compactas las herramientas tapan la parte de arriba del escenario: el globo se centra debajo (009).
  useEffect(() => {
    const el = toolsRef.current
    if (!el) return
    const measure = () => {
      const compact = window.matchMedia?.('(max-width: 899px), (max-height: 500px)').matches
      const value = `${compact ? el.offsetTop + el.offsetHeight + 8 : 0}px`
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
      <section className="globe-legend" aria-label={GLOBE_COPY.legendLabel}>
        <p className="globe-legend-head">
          <span className="globe-legend-title">{GLOBE_COPY.legendTitle}</span>
          <span className="globe-legend-sub">
            {p.variableLabel}{p.unit ? ` · ${p.unit}` : ''} · {p.from}–{p.to}
          </span>
        </p>

        {p.status === 'loading' && <p className="globe-legend-note" role="status">{GLOBE_COPY.layerLoading}</p>}
        {p.status === 'error' && (
          <p className="globe-legend-note" role="alert">
            {GLOBE_COPY.layerError}{' '}
            <button type="button" className="link-button" onClick={p.onRetry}>{UI_COPY.retry}</button>
          </p>
        )}
        {p.status === 'no-window' && <p className="globe-legend-note" role="status">{GLOBE_COPY.noWindow}</p>}

        {p.status === 'ready' && (
          <>
            {/* La escala es decorativa para lectores de pantalla: las clases están en la lista de abajo. */}
            <div className="globe-scale" aria-hidden="true">
              <div className="globe-scale-bar">
                {ranges.map((range, i) => <span key={range} style={{ background: color(i) }} />)}
              </div>
              <div className="globe-scale-breaks" style={{ gridTemplateColumns: `repeat(${ranges.length}, 1fr)` }}>
                {p.breaks.map((b, i) => <span key={b} style={{ gridColumn: `${i + 1} / span 2` }}>{formatBreak(b)}</span>)}
              </div>
              <div className="globe-scale-ends"><span>{GLOBE_COPY.scaleLow}</span><span>{GLOBE_COPY.scaleHigh}</span></div>
            </div>

            <div id={moreId} className={open ? 'globe-legend-more' : 'globe-legend-more vh'}>
              <ul className="globe-legend-classes">
                {ranges.map((range, i) => (
                  <li key={range}>
                    <span className="globe-swatch" style={{ background: color(i) }} aria-hidden="true" />
                    <span className="globe-legend-label">{p.labels[i] ?? ''}</span>
                    <span className="globe-legend-range">{range}</span>
                  </li>
                ))}
                <li>
                  <span className="globe-swatch globe-swatch-nodata" aria-hidden="true" />
                  <span className="globe-legend-label">{GLOBE_COPY.noData}</span>
                </li>
              </ul>
              <p className="globe-legend-note">{GLOBE_COPY.selectedCue}</p>
              <p className="globe-legend-note">
                {GLOBE_COPY.colorNote} {GLOBE_COPY.manyRegions(p.regionCount)}
              </p>
            </div>
          </>
        )}
      </section>

      <div className="globe-actions">
        {p.status === 'ready' && (
          <button type="button" aria-expanded={open} aria-controls={moreId} onClick={() => setOpen(o => !o)}>
            <InfoIcon size={18} /><span>{GLOBE_COPY.aboutColors}</span>
          </button>
        )}
        <button type="button" onClick={p.onOpenTable}><TableIcon size={18} /><span>{GLOBE_COPY.showTable}</span></button>
        <button type="button" onClick={p.onGlobalView}><GlobeIcon size={18} /><span>{GLOBE_COPY.globalView}</span></button>
      </div>
    </div>
  )
}
