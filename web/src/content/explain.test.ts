/**
 * Pruebas de explainTrend — 006-guide-content T003
 * Cubre el 100 % de las cuatro variantes (SC-C02) y verifica las reglas de la constitución.
 */
import { describe, it, expect } from 'vitest'
import { explainTrend, type ExplainContext } from './index'
import type { TrendRow } from '../lib/data'

// ---------- Fixtures ----------

const baseCtx: ExplainContext = {
  regionName: 'Baja California',
  variableId: 'T2M',
  unit: '°C/década',
  from: 1981,
  to: 2025,
  alpha: 0.05,
  fullPeriod: true,
  smallRegion: false,
  isSynthetic: false,
}

function makeRow(overrides: Partial<TrendRow>): TrendRow {
  return {
    start: 1981,
    end: 2025,
    n: 44,
    slope_decade: 0.32,
    ci_low: 0.18,
    ci_high: 0.46,
    p: 0.001,
    p_uncorrected: 0.0008,
    r1: 0.12,
    ols_slope_decade: 0.3,
    ols_p: 0.001,
    status: 'increasing',
    flags: [],
    ...overrides,
  }
}

// ---------- Variante 1: increasing ----------

describe('increasing', () => {
  const row = makeRow({ status: 'increasing', slope_decade: 0.32, ci_low: 0.18, ci_high: 0.46, p: 0.001 })
  const result = explainTrend(row, baseCtx)

  it('veredicto es "Sube"', () => {
    expect(result.verdict).toBe('Sube')
  })

  it('la frase contiene la pendiente con signo', () => {
    expect(result.sentence).toContain('+0,32')
  })

  it('la frase contiene el intervalo de confianza', () => {
    expect(result.sentence).toContain('+0,18')
    expect(result.sentence).toContain('+0,46')
  })

  it('la frase contiene los años del periodo', () => {
    expect(result.sentence).toContain('1981')
    expect(result.sentence).toContain('2025')
  })

  it('no afirma causa ni pronóstico', () => {
    const lower = result.sentence.toLowerCase()
    expect(lower).not.toMatch(/porque|causa|provoca|continuará|seguirá|predic/)
  })

  it('no tiene avisos cuando el contexto es limpio', () => {
    expect(result.caveats).toHaveLength(0)
  })
})

// ---------- Variante 2: decreasing ----------

describe('decreasing', () => {
  const row = makeRow({ status: 'decreasing', slope_decade: -0.15, ci_low: -0.28, ci_high: -0.02, p: 0.03 })
  const result = explainTrend(row, baseCtx)

  it('veredicto es "Baja"', () => {
    expect(result.verdict).toBe('Baja')
  })

  it('la frase contiene la pendiente negativa', () => {
    expect(result.sentence).toContain('\u22120,15') // − U+2212
  })

  it('no afirma causa', () => {
    expect(result.sentence.toLowerCase()).not.toMatch(/porque|causa|provoca/)
  })
})

// ---------- Variante 3: inconclusive ----------

describe('inconclusive', () => {
  const row = makeRow({ status: 'inconclusive', slope_decade: 0.05, p: 0.42 })
  const result = explainTrend(row, baseCtx)

  it('veredicto es "Sin evidencia suficiente"', () => {
    expect(result.verdict).toBe('Sin evidencia suficiente')
  })

  it('NO menciona la dirección estimada (clarification 2026-11-14)', () => {
    // No debe aparecer «sube», ni el valor de la pendiente.
    // «baja» puede aparecer como parte de «Baja California» (nombre de región), no como veredicto.
    const lower = result.sentence.toLowerCase()
    expect(lower).not.toContain('sube')
    expect(lower).not.toContain('+0,05')
    // Verifica que no empiece con «baja» como veredicto (sería «Baja.» o «Baja,»)
    expect(result.sentence).not.toMatch(/^Baja[.,]/)
  })

  it('afirma que no demuestra ausencia de cambio (SC-C02 AS-1)', () => {
    expect(result.sentence.toLowerCase()).toContain('no demuestra')
  })

  it('no afirma causa ni pronóstico', () => {
    expect(result.sentence.toLowerCase()).not.toMatch(/porque|causa|provoca|continuará/)
  })
})

// ---------- Variante 4: insufficient ----------

describe('insufficient', () => {
  it('veredicto es "Datos insuficientes" cuando row es null', () => {
    const result = explainTrend(null, baseCtx)
    expect(result.verdict).toBe('Datos insuficientes')
  })

  it('veredicto es "Datos insuficientes" cuando status es insufficient', () => {
    const row = makeRow({ status: 'insufficient', slope_decade: null, ci_low: null, ci_high: null, p: null })
    const result = explainTrend(row, baseCtx)
    expect(result.verdict).toBe('Datos insuficientes')
  })

  it('veredicto es "Análisis no válido" cuando status es invalid', () => {
    const row = makeRow({ status: 'invalid', slope_decade: null, ci_low: null, ci_high: null, p: null })
    const result = explainTrend(row, baseCtx)
    expect(result.verdict).toBe('Análisis no válido')
  })

  it('no dice "no hay cambio" (constitución Principio I)', () => {
    const result = explainTrend(null, baseCtx)
    expect(result.sentence.toLowerCase()).not.toMatch(/no hay cambio|sin cambio/)
  })
})

// ---------- Avisos (caveats) ----------

describe('caveats', () => {
  const row = makeRow({ status: 'increasing' })

  it('aviso de sintético cuando isSynthetic es true', () => {
    const result = explainTrend(row, { ...baseCtx, isSynthetic: true })
    expect(result.caveats.some(c => c.toLowerCase().includes('sintétic'))).toBe(true)
  })

  it('aviso de periodo cuando fullPeriod es false', () => {
    const result = explainTrend(row, { ...baseCtx, fullPeriod: false, from: 2000, to: 2025 })
    expect(result.caveats.some(c => c.includes('2000') && c.includes('2025'))).toBe(true)
  })

  it('aviso de región pequeña cuando smallRegion es true (en increasing)', () => {
    const result = explainTrend(row, { ...baseCtx, smallRegion: true })
    expect(result.caveats.some(c => c.toLowerCase().includes('pequeño') || c.toLowerCase().includes('celda'))).toBe(true)
  })

  it('aviso de región pequeña también en inconclusive (clarification 2026-11-14)', () => {
    const incRow = makeRow({ status: 'inconclusive', p: 0.3 })
    const result = explainTrend(incRow, { ...baseCtx, smallRegion: true })
    expect(result.caveats.some(c => c.toLowerCase().includes('pequeño') || c.toLowerCase().includes('celda'))).toBe(true)
  })

  it('aviso de región pequeña también cuando row es null (clarification 2026-11-14)', () => {
    const result = explainTrend(null, { ...baseCtx, smallRegion: true })
    expect(result.caveats.some(c => c.toLowerCase().includes('pequeño') || c.toLowerCase().includes('celda'))).toBe(true)
  })

  it('múltiples avisos se acumulan', () => {
    const result = explainTrend(row, {
      ...baseCtx,
      isSynthetic: true,
      fullPeriod: false,
      from: 2000,
      to: 2020,
      smallRegion: true,
    })
    expect(result.caveats.length).toBeGreaterThanOrEqual(3)
  })
})
