/**
 * Del archivo de mapa a clases y colores (005 T004). Sin estadística: solo se clasifica
 * la pendiente ya calculada por el pipeline según los cortes del propio archivo.
 */
import type { MapFile } from '../../lib/data'

export type RegionValue = { kind: 'value'; value: number; classIndex: number } | { kind: 'no-data' }

export interface Palette {
  /** Cinco colores, de «baja mucho» a «sube mucho». */
  classes: string[]
  noData: string
  selected: string
  /** Opacidad del relleno de regiones con datos (--map-fill-opacity). */
  fillOpacity: number
}

const DEFAULT_PALETTE: Palette = {
  classes: ['#3b2a7a', '#8e86d6', '#e3ded6', '#f2b84b', '#b45309'], // Ocaso (006)
  noData: '#8a93a0',
  selected: '#ffffff',
  fillOpacity: 0.9,
}

const TREND_TOKENS = ['down-strong', 'down-weak', 'neutral', 'up-weak', 'up-strong']

/**
 * Lee las variables de diseño (tokens.css): primero el nombre canónico (--color-*), después
 * el alias anterior y, si faltan ambos, el valor por defecto.
 */
export function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement)
  const v = (names: string[], fallback: string) => {
    for (const name of names) {
      const value = s.getPropertyValue(name).trim()
      if (value) return value
    }
    return fallback
  }
  const opacity = Number.parseFloat(v(['--map-fill-opacity'], ''))
  return {
    classes: DEFAULT_PALETTE.classes.map((d, i) => v([`--color-trend-${TREND_TOKENS[i]}`, `--trend-${i + 1}`], d)),
    noData: v(['--color-no-data', '--no-data'], DEFAULT_PALETTE.noData),
    selected: v(['--color-selection', '--selected'], DEFAULT_PALETTE.selected),
    fillOpacity: opacity > 0 && opacity <= 1 ? opacity : DEFAULT_PALETTE.fillOpacity,
  }
}

/** Índice de clase (0 … breaks.length): cuántos cortes quedan en o por debajo del valor. */
export function classIndex(value: number, breaks: number[]): number {
  let i = 0
  while (i < breaks.length && value >= breaks[i]) i++
  return i
}

/** Si el archivo trae un número de clases distinto de la paleta, se reparte de forma proporcional. */
export function paletteIndex(index: number, classCount: number, paletteSize: number): number {
  if (classCount <= 1) return Math.floor((paletteSize - 1) / 2)
  return Math.round((index * (paletteSize - 1)) / (classCount - 1))
}

/**
 * Valor por región para una ventana. Devuelve `null` si el archivo no tiene esa ventana
 * (periodo de menos de 10 años): entonces no hay mapa que pintar.
 */
export function valuesForWindow(map: MapFile, key: string): Map<string, RegionValue> | null {
  const values = map.windows[key]
  if (!values) return null
  const out = new Map<string, RegionValue>()
  map.regions.forEach((id, i) => {
    const v = values[i]
    out.set(id, typeof v === 'number' && Number.isFinite(v)
      ? { kind: 'value', value: v, classIndex: classIndex(v, map.classes.breaks) }
      : { kind: 'no-data' })
  })
  return out
}

/** Texto del intervalo de cada clase a partir de los cortes. */
export function classRanges(breaks: number[], format: (v: number) => string): string[] {
  if (breaks.length === 0) return ['todos los valores']
  const out = [`menos de ${format(breaks[0])}`]
  for (let i = 1; i < breaks.length; i++) out.push(`de ${format(breaks[i - 1])} a ${format(breaks[i])}`)
  out.push(`${format(breaks[breaks.length - 1])} o más`)
  return out
}

/** `#rrggbb` o `#rgb` → `rgba(r, g, b, a)`. Otros formatos se devuelven tal cual. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const hex = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1]
  const n = Number.parseInt(hex, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
