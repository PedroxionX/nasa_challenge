/**
 * Definiciones de términos técnicos del panel (004 T012; constitución: «los términos técnicos se definen
 * la primera vez que aparecen»). Texto de specs/001-trend-explorer-mvp/research.md («Definiciones para la
 * interfaz»). Si 006 publica definiciones propias en content/, se sustituyen aquí.
 */
export type TermKey = 'ci' | 'p' | 'alpha' | 'sen'

export const GLOSSARY: Record<TermKey, { term: string; definition: string }> = {
  ci: {
    term: '95% interval',
    definition: 'Range of slopes compatible with the data following Sen (1968), widened by autocorrelation.',
  },
  p: {
    term: 'p-value',
    definition: 'Probability of seeing a monotonic pattern at least this marked if there were no trend.',
  },
  alpha: {
    term: 'α (alpha)',
    definition: 'Threshold set before looking at the data: if p is smaller than α, we say there is evidence of a trend.',
  },
  sen: {
    term: 'Sen line',
    definition: 'Line with the Theil-Sen slope: the median of the slopes between every pair of years.',
  },
}
