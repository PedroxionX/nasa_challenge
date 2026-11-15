/// <reference types="node" />
// Mide el contraste WCAG 2.x de los pares de texto de tokens.css (paleta Ocaso de 006; mínimo 4,5:1)
// y comprueba que ningún estilo usa una variable que tokens.css no define (los alias viejos se retiraron en 008).
// (Vitest no procesa CSS: con «?raw» llegaría vacío, así que se lee del disco.)
import { readdirSync, readFileSync } from 'node:fs'
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
    expect(['down-strong', 'down-weak', 'neutral', 'up-weak', 'up-strong'].map(k => token(`color-trend-${k}`))).toEqual(['#3b2a7a', '#8e86d6', '#e3ded6', '#f2b84b', '#b45309'])
    expect(token('color-no-data')).toBe('#8a93a0')
    expect(token('color-selection')).toBe('#ffffff')
  })

  it('ningún CSS usa una variable sin definir en tokens.css (alias retirados, erratas)', () => {
    const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]))
    // Variables locales de un componente: se definen en su propio archivo.
    const files = Object.fromEntries(
      (readdirSync(join(process.cwd(), 'src'), { recursive: true }) as string[])
        .filter(p => p.endsWith('.css'))
        .map(p => [p, readFileSync(join(process.cwd(), 'src', p), 'utf8')]),
    )
    expect(Object.keys(files).length).toBeGreaterThan(3)
    const missing: string[] = []
    for (const [file, text] of Object.entries(files)) {
      const local = new Set([...text.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]))
      for (const m of text.matchAll(/var\((--[a-z0-9-]+)/g)) {
        if (!defined.has(m[1]) && !local.has(m[1])) missing.push(`${file}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })
})
