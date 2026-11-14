/** Utilidades solo para las pruebas de 004. */
import { OPTIONAL_WINDOW_COLUMNS, type Catalog, type SeriesFile } from '../../lib/data'

/**
 * Configura el estado con el catálogo igual que hace el armazón (app/Shell.tsx) al arrancar:
 * años, regiones válidas y el periodo propio de cada variable. Recibe los módulos ya importados
 * porque las pruebas los recargan con vi.resetModules().
 */
export function configureLikeShell(
  state: typeof import('../../app/state'),
  data: typeof import('../../lib/data'),
  catalog: Catalog,
): void {
  state.configureState({
    firstYear: catalog.period.first_year,
    lastYear: catalog.period.last_complete_year,
    regionIds: catalog.regions.map(r => r.id),
    periods: Object.fromEntries(data.VARIABLE_IDS.map(id => [id, data.variablePeriod(catalog, id)])),
  })
}

/** Copia de una serie sin las columnas opcionales, como un archivo anterior a la revisión del contrato. */
export function withoutOptionalColumns(series: SeriesFile): SeriesFile {
  const keep = series.windows.columns.map((c, i) => [c, i] as const)
    .filter(([c]) => !(OPTIONAL_WINDOW_COLUMNS as readonly string[]).includes(c))
  return {
    ...series,
    windows: { columns: keep.map(([c]) => c), rows: series.windows.rows.map(r => keep.map(([, i]) => r[i])) },
  }
}
