/**
 * Vista sin WebGL o cuando las texturas no cargan (005 T003): aviso y tabla de regiones.
 * El recorrido sigue siendo posible sin el globo (constitución III).
 */
import { UI_COPY } from '../../content'
import { GLOBE_COPY } from './copy'
import type { RegionRow } from './format'
import RegionTable from './RegionTable'

interface Props {
  rows: RegionRow[]
  unit: string | null
  caption: string
  selectedId: string | null
  onPick: (id: string) => void
  hrefFor: (id: string) => string
  /** El catálogo no cargó y no hay lista que mostrar (el armazón ya ofrece reintentar). */
  failed: boolean
}

export default function Fallback({ rows, unit, caption, selectedId, onPick, hrefFor, failed }: Props) {
  return (
    <section className="globe-fallback" aria-label={GLOBE_COPY.fallbackRegions}>
      <p className="globe-fallback-notice" role="status">{UI_COPY.noWebgl}</p>
      {failed && rows.length === 0 ? (
        <p role="status">{GLOBE_COPY.listUnavailable}</p>
      ) : (
        <RegionTable rows={rows} unit={unit} caption={caption} selectedId={selectedId} onPick={onPick} hrefFor={hrefFor} />
      )}
    </section>
  )
}
