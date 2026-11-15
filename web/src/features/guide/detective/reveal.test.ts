// Frase de la revelación (008 T013, SC-E03): 4 predicciones × 5 estados × 3 signos = 60 casos.
import { describe, expect, it } from 'vitest'
import { revealPrediction, UI_COPY, type Prediction, type RevealContext } from '../../../content'
import type { TrendRow, TrendStatus } from '../../../lib/data'

const PREDICTIONS: Prediction[] = ['up', 'down', 'flat', 'unsure']
const STATUSES: TrendStatus[] = ['increasing', 'decreasing', 'inconclusive', 'insufficient', 'invalid']
const SLOPES = [1.234, -1.234, null]

const ctx: RevealContext = {
  regionName: 'Sonora', topic: 'la temperatura del aire', unit: '°C/década', pct: null, from: 1980, to: 2025, alpha: 0.05,
  method: 'pendiente de Theil-Sen y prueba de Mann-Kendall corregida por autocorrelación', smallRegion: false,
}

const row = (status: TrendStatus, slope: number | null): TrendRow => ({
  start: 1980, end: 2025, n: 46, slope_decade: slope, ci_low: null, ci_high: null, p: 0.0123,
  p_uncorrected: null, r1: null, ols_slope_decade: null, ols_p: null, status, flags: [],
})

const FORBIDDEN = [/no hay cambio/i, /\bno cambió\b/i, /porque/i, /debido a/i, /\bcausa/i, /seguirá/i, /pronóstico/i]
const DIRECTION = /aumento|disminución|\bsube\b|\bbaja\b|subió|bajó|1\.23/i

const cases = PREDICTIONS.flatMap(p => STATUSES.flatMap(s => SLOPES.map(sl => [p, s, sl] as const)))

describe('revealPrediction (008 T013)', () => {
  it('cubre las 60 combinaciones', () => expect(cases).toHaveLength(60))

  it.each(cases)('%s × %s × %s: sin causa, pronóstico ni «no hay cambio»', (p, s, sl) => {
    const r = revealPrediction(p, row(s, sl), ctx)
    for (const re of FORBIDDEN) expect(r.sentence).not.toMatch(re)
    expect(r.caveats).toContain(UI_COPY.notCause)
  })

  it.each(cases.filter(([, s]) => s === 'inconclusive'))(
    'inconclusive (%s, pendiente %s): no demuestra ausencia de cambio y no da dirección ni pendiente',
    (p, _s, sl) => {
      const r = revealPrediction(p, row('inconclusive', sl), ctx)
      expect(r.sentence).toMatch(/no demuestra que no haya cambio|no es lo mismo que demostrar/)
      expect(r.sentence).not.toMatch(DIRECTION)
      expect(r.facts).not.toMatch(DIRECTION)
      expect(r.match).not.toBe('match')
    },
  )

  it('«Casi no cambió» con evidencia insuficiente nunca queda confirmada', () => {
    for (const sl of SLOPES) {
      const r = revealPrediction('flat', row('inconclusive', sl), ctx)
      expect(r.sentence).not.toMatch(/coincide|¡acertaste/i)
      expect(r.match).toBe('undecided')
    }
  })

  it('«Ni idea» nunca se juzga', () => {
    for (const s of STATUSES) for (const sl of SLOPES) {
      const r = revealPrediction('unsure', row(s, sl), ctx)
      expect(r.sentence).not.toMatch(/coincide|acertaste|sorpresa/i)
      expect(['neutral', 'none']).toContain(r.match)
    }
  })

  it('insufficient, invalid y sin fila: sin comparación ni cifras', () => {
    for (const p of PREDICTIONS) {
      for (const r of [revealPrediction(p, row('insufficient', 1), ctx), revealPrediction(p, row('invalid', 1), ctx), revealPrediction(p, null, ctx)]) {
        expect(r.match).toBe('none')
        expect(r.facts).toBeNull()
      }
    }
  })

  it('con evidencia: coincide, contrario y «sí cambió»', () => {
    expect(revealPrediction('up', row('increasing', 1.234), ctx).match).toBe('match')
    expect(revealPrediction('down', row('decreasing', -1.234), ctx).match).toBe('match')
    expect(revealPrediction('down', row('increasing', 1.234), ctx).match).toBe('opposite')
    expect(revealPrediction('up', row('increasing', 1.234), ctx).sentence).toMatch(/¡Acertaste! La temperatura del aire en Sonora aumentó/)
    expect(revealPrediction('flat', row('decreasing', -1.234), ctx).sentence).toMatch(/sí cambió: la temperatura del aire en Sonora disminuyó/)
  })

  it('las cifras salen de la fila y declaran periodo, n, p, α, unidad y método', () => {
    const r = revealPrediction('up', row('increasing', 1.234), ctx)
    expect(r.change).toContain('+1.23 °C por década (cada 10 años)')
    expect(r.facts).toContain('unidad: °C/década')
    expect(r.facts).toContain('1980–2025')
    expect(r.facts).toContain('46 años')
    expect(r.facts).toContain('p = 0.012')
    expect(r.facts).toContain('α = 0.05')
    expect(r.facts).toContain('Theil-Sen')
    const inc = revealPrediction('up', row('inconclusive', 1.234), ctx)
    expect(inc.facts).toContain('unidad: °C/década')
    expect(inc.facts).toContain('Mann-Kendall')
  })

  it('variable relativa: cifra absoluta y % entre paréntesis, como el panel (T019)', () => {
    const rel = { ...ctx, unit: 'mm/década', pct: 10.222 }
    const r = revealPrediction('up', row('increasing', 41.543), rel)
    expect(r.change).toContain('+41.54 mm por década (cada 10 años); equivale a +10.2 % del promedio de esos años')
    const neg = revealPrediction('down', row('decreasing', -20), { ...rel, pct: -6.408 })
    expect(neg.change).toContain('−6.4 % del promedio')
    // Sin evidencia: ni cifra absoluta ni %.
    const inc = revealPrediction('up', row('inconclusive', 41.543), rel)
    expect(inc.change).toBeNull()
    expect(inc.facts).not.toMatch(/41/)
  })

  it('concuerda en plural («las partículas… aumentaron») (FR-E16)', () => {
    const pl = { ...ctx, topic: 'las partículas en el aire', plural: true }
    expect(revealPrediction('up', row('increasing', 1), pl).sentence).toMatch(/Las partículas en el aire en Sonora aumentaron/)
    expect(revealPrediction('flat', row('decreasing', -1), pl).sentence).toMatch(/sí cambiaron: .* disminuyeron/)
    expect(revealPrediction('up', row('inconclusive', 1), pl).sentence).toMatch(/tienen altibajos/)
    expect(revealPrediction('up', null, pl).sentence).toMatch(/cambiaron en Sonora/)
  })

  it('sin unidad física: solo % y la unidad declarada es «% por década» (FR-E20)', () => {
    const dim = { ...ctx, unit: 'adimensional/década', pct: -15.396, dimensionless: true }
    const r = revealPrediction('down', row('decreasing', -0.01), dim)
    expect(r.change).toBe('−15.4 % por década (cada 10 años), respecto al promedio de esos años')
    expect(r.change).not.toMatch(/adimensional/)
    expect(r.facts).toContain('unidad: % por década')
  })

  it('región pequeña añade su aviso', () => {
    const r = revealPrediction('up', row('increasing', 1), { ...ctx, smallRegion: true })
    expect(r.caveats).toContain(UI_COPY.smallRegion)
  })
})

describe('«¿Por qué importa para la Tierra?» (FR-E21)', () => {
  it('hay texto para los 14 temas y ninguno atribuye causa ni pronostica', async () => {
    const { DETECTIVE_COPY } = await import('../../../content')
    const { TOPIC_IDS } = await import('./options')
    for (const id of TOPIC_IDS) {
      const t = DETECTIVE_COPY.why[id]
      expect(t, id).toBeTruthy()
      expect(t).not.toMatch(/porque|debido a|se debe|causad|seguirá|continuará|pronóstico/i)
    }
    expect(DETECTIVE_COPY.whyNote).toMatch(/no por qué/)
  })
})
