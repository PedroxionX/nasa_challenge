/**
 * Definiciones de términos técnicos del panel (004 T012; constitución: «los términos técnicos se definen
 * la primera vez que aparecen»). Texto de specs/001-trend-explorer-mvp/research.md («Definiciones para la
 * interfaz»). Si 006 publica definiciones propias en content/, se sustituyen aquí.
 */
export type TermKey = 'ci' | 'p' | 'alpha' | 'sen'

export const GLOSSARY: Record<TermKey, { term: string; definition: string }> = {
  ci: {
    term: 'Intervalo del 95 %',
    definition: 'Rango de pendientes compatibles con los datos según Sen (1968), ensanchado por la autocorrelación.',
  },
  p: {
    term: 'Valor p',
    definition: 'Probabilidad de ver un patrón monótono al menos tan marcado si no hubiera tendencia.',
  },
  alpha: {
    term: 'α (alfa)',
    definition: 'Umbral fijado antes de mirar los datos: si p es menor que α, se dice que hay evidencia de tendencia.',
  },
  sen: {
    term: 'Recta de Sen',
    definition: 'Recta con la pendiente de Theil-Sen: la mediana de las pendientes entre todos los pares de años.',
  },
}
