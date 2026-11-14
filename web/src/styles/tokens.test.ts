// Mide el contraste WCAG 2.x de los pares de texto definidos en tokens.css (002 T006: ≥ 4,5:1).
/// <reference types="node" />
// (Vitest no procesa CSS: con «?raw» llegaría vacío, así que se lee del disco.)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`falta --${name} como color hexadecimal`)
  return m[1]
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const PAIRS: [fg: string, bg: string][] = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'],
  ['accent', 'surface'], ['accent', 'surface-2'],
  ['on-accent', 'accent'],
  ['danger', 'surface'],
]

describe('tokens.css', () => {
  it.each(PAIRS)('--%s sobre --%s tiene contraste ≥ 4,5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it('la fórmula da los valores de referencia (negro/blanco = 21)', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('define las cinco clases de tendencia, sin datos y selección', () => {
    for (const n of ['trend-1', 'trend-2', 'trend-3', 'trend-4', 'trend-5', 'no-data', 'selected']) {
      expect(token(n)).toMatch(/^#/)
    }
  })
})
