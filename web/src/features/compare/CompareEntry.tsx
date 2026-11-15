/**
 * Entrada a la comparación (007 T012, FR-K01): el mismo selector de estado que la cabecera, con los demás
 * estados agrupados por país. Sirve con teclado y con tacto sin tocar el globo. Lo coloca el armazón debajo
 * del panel de análisis.
 */
import { useAppState } from '../../app/state'
import { COMPARE_COPY } from '../../content'
import RegionCombobox from '../../lib/ui/RegionCombobox'
import { ENTRY_SELECT_ID } from './compareData'
import './compare.css'

export default function CompareEntry() {
  const { regionId, compareId, setCompare } = useAppState()
  if (!regionId) return null
  return (
    <section className="compare-entry" aria-label="Comparison">
      <RegionCombobox
        id={ENTRY_SELECT_ID} inline showLabel label={COMPARE_COPY.entryLabel} placeholder={COMPARE_COPY.entryPlaceholder}
        value={compareId} excludeId={regionId} onChange={setCompare}
      />
    </section>
  )
}
