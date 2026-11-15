/**
 * Textos propios del globo y su leyenda. Parten de specs/001-trend-explorer-mvp/ux.md §7.
 * Si 006 los incorpora a UI_COPY, se sustituyen aquí por la importación.
 */
export const GLOBE_COPY = {
  loading: 'Loading the Earth…',
  mapsError: 'The maps could not be loaded.',
  tooltipHint: 'Click to investigate',
  tooltipCompareHint: 'Click to compare with this state',
  globalView: 'Reset view',
  legendTitle: 'Change per decade',
  noData: 'No data',
  selectedCue: 'Raised, with its name: selected state',
  colorNote: 'Color is the estimated change per decade, not its significance.',
  manyRegions: (n: number) => `With ${n} states, some will stand out by chance.`,
  noWindow: 'There is no map for this period: it needs at least 10 years within the data of this variable.',
  layerLoading: 'Loading the trend map…',
  layerError: 'We could not load the trend map.',
  showTable: 'View table',
  close: 'Close',
  tableTitle: 'Change per decade in each state',
  colRegion: 'State',
  /** Marca en texto de las dos regiones comparadas (007 FR-K15): la misma letra que en el panel. */
  compared: (tag: string) => `${tag} · being compared`,
  colCountry: 'Country',
  colValue: 'Change per decade',
  colClass: 'Class',
  sortHint: 'Sort',
  fallbackRegions: 'States',
  listUnavailable: 'The list of states is not available yet.',
} as const
