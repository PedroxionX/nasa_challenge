/** Lógica del buscador de estados (004 T001). El filtro y los países viven en lib/ui (los comparte la comparación). */
import { UI_COPY } from '../../content'

export { COUNTRIES, filterRegions, normalize } from '../../lib/ui/regionFilter'

/** Id del campo: el panel de análisis lo enfoca al cerrarse. */
export const REGION_SEARCH_ID = 'region-search'

export const NO_MATCH = UI_COPY.searchNoResults
