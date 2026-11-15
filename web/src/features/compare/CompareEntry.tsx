/**
 * Entrada a la comparación (007 T012, FR-K01): lista desplegable nativa con los demás estados, agrupados por
 * país. Sirve con teclado y con tacto sin tocar el globo. Lo coloca el armazón debajo del panel de análisis.
 */
import { useEffect, useState } from 'react'
import { useAppState } from '../../app/state'
import { loadCatalog, type Catalog } from '../../lib/data'
import { COMPARE_COPY } from '../../content'
import { ENTRY_SELECT_ID, groupRegions } from './compareData'
import './compare.css'

export function RegionSelect({ id, value, onChange }: { id: string; value: string | null; onChange: (id: string | null) => void }) {
  const { regionId } = useAppState()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  useEffect(() => {
    let live = true
    loadCatalog().then(c => { if (live) setCatalog(c) }).catch(() => {}) // sin catálogo no hay lista; el armazón ya avisa
    return () => { live = false }
  }, [])
  return (
    <select id={id} className="compare-select" value={value ?? ''} onChange={e => onChange(e.target.value || null)} disabled={!catalog}>
      <option value="">{COMPARE_COPY.entryPlaceholder}</option>
      {catalog && groupRegions(catalog.regions, regionId).map(([country, regions]) => (
        <optgroup key={country} label={country}>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

export default function CompareEntry() {
  const { regionId, compareId, setCompare } = useAppState()
  const id = ENTRY_SELECT_ID
  if (!regionId) return null
  return (
    <section className="compare-entry" aria-label="Comparison">
      <label htmlFor={id}>{COMPARE_COPY.entryLabel}</label>
      <RegionSelect id={id} value={compareId} onChange={setCompare} />
    </section>
  )
}
