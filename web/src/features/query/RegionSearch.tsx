/**
 * Buscador de estados de la cabecera (004 T001): el selector de estado compartido (lib/ui/RegionCombobox),
 * unido a la región de la URL.
 */
import { useAppState } from '../../app/state'
import { UI_COPY } from '../../content'
import RegionCombobox from '../../lib/ui/RegionCombobox'
import { REGION_SEARCH_ID } from './search'

export default function RegionSearch() {
  const { regionId, setRegion } = useAppState()
  return (
    <RegionCombobox
      id={REGION_SEARCH_ID}
      className="region-search"
      label="Search for a state"
      placeholder={UI_COPY.searchPlaceholder}
      value={regionId}
      onChange={setRegion}
    />
  )
}
