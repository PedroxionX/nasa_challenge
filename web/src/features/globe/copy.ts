/**
 * Textos propios del globo y su leyenda. Parten de specs/001-trend-explorer-mvp/ux.md §7.
 * Si 006 los incorpora a UI_COPY, se sustituyen aquí por la importación.
 */
export const GLOBE_COPY = {
  loading: 'Cargando la Tierra…',
  mapsError: 'No se pudieron cargar los mapas.',
  tooltipHint: 'Clic para investigar',
  globalView: 'Vista global',
  legendTitle: 'Cambio por década',
  noData: 'Sin datos',
  selectedCue: 'Elevada y con su nombre: región elegida',
  colorNote: 'El color es el cambio estimado por década, no su significancia.',
  manyRegions: (n: number) => `Con ${n} estados, algunos destacarán por azar.`,
  noWindow: 'No hay mapa para este periodo: hacen falta al menos 10 años dentro de los datos de esta variable.',
  layerLoading: 'Cargando el mapa de tendencias…',
  layerError: 'No pudimos cargar el mapa de tendencias.',
  showTable: 'Ver tabla',
  close: 'Cerrar',
  tableTitle: 'Cambio por década en cada estado',
  colRegion: 'Estado',
  colCountry: 'País',
  colValue: 'Cambio por década',
  colClass: 'Clase',
  sortHint: 'Ordenar',
  fallbackRegions: 'Estados',
  listUnavailable: 'La lista de estados no está disponible todavía.',
} as const
