/// <reference types="node" />
// Mide el contraste WCAG 2.x de los pares de texto de tokens.css (paleta Ocaso de 006; mínimo 4,5:1)
// y comprueba que los alias anteriores (--bg, --trend-1…) resuelven a los colores de Ocaso.
// (Vitest no procesa CSS: con «?raw» llegaría vacío, así que se lee del disco.)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')

/** Valor de una variable, siguiendo alias `var(--otra)` hasta un color hexadecimal. */
function token(name: string, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`alias circular en --${name}`)
  seen.add(name)
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!m) throw new Error(`falta --${name}`)
  const value = m[1].trim()
  const alias = value.match(/^var\(--([a-z0-9-]+)\)$/)
  if (alias) return token(alias[1], seen)
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error(`--${name} no es un color hexadecimal: ${value}`)
  return value.toLowerCase()
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

const TEXT_PAIRS: [fg: string, bg: string][] = [
  ['color-text', 'color-bg'], ['color-text', 'color-panel'], ['color-text', 'color-panel-raised'],
  ['color-text-muted', 'color-bg'], ['color-text-muted', 'color-panel'], ['color-text-muted', 'color-panel-raised'],
  ['color-verdict-up', 'color-panel'], ['color-verdict-down', 'color-panel'],
  ['color-verdict-insufficient', 'color-panel'], ['color-verdict-invalid', 'color-panel'],
  ['color-accent', 'color-panel'], ['color-accent', 'color-panel-raised'],
  ['color-on-accent', 'color-accent'],
  ['color-danger', 'color-panel'],
]

describe('tokens.css (Ocaso)', () => {
  it.each(TEXT_PAIRS)('--%s sobre --%s tiene contraste ≥ 4,5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it('la fórmula da los valores de referencia (negro/blanco = 21) y las cifras que publicó 006', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
    expect(contrast(token('color-text'), token('color-panel'))).toBeCloseTo(14.3, 1)
    expect(contrast(token('color-verdict-down'), token('color-panel'))).toBeCloseTo(5.2, 1)
  })

  it('la escala de tendencia y el mapa tienen los valores de docs/paleta.md', () => {
    expect([1, 2, 3, 4, 5].map(i => token(`trend-${i}`))).toEqual(['#3b2a7a', '#8e86d6', '#e3ded6', '#f2b84b', '#b45309'])
    expect(token('no-data')).toBe('#8a93a0')
    expect(token('selected')).toBe('#ffffff')
  })

  it.each([
    ['bg', 'color-bg'], ['surface', 'color-panel'], ['surface-2', 'color-panel-raised'], ['border', 'color-line'],
    ['text', 'color-text'], ['muted', 'color-text-muted'], ['accent', 'color-accent'], ['on-accent', 'color-on-accent'],
  ])('el alias --%s resuelve a --%s', (alias, canonical) => {
    expect(token(alias)).toBe(token(canonical))
  })
})
