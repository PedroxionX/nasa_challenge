// Frase de la revelación (008 T013, SC-E03): 4 predicciones × 5 estados × 3 signos = 60 casos.
import { describe, expect, it } from 'vitest'
import { revealPrediction, UI_COPY, type Prediction, type RevealContext } from '../../../content'
import type { TrendRow, TrendStatus } from '../../../lib/data'

const PREDICTIONS: Prediction[] = ['up', 'down', 'flat', 'unsure']
const STATUSES: TrendStatus[] = ['increasing', 'decreasing', 'inconclusive', 'insufficient', 'invalid']
const SLOPES = [1.234, -1.234, null]

const ctx: RevealContext = {
  regionName: 'Sonora', topic: 'air temperature', unit: '°C/decade', pct: null, from: 1980, to: 2025, alpha: 0.05,
  method: 'Theil-Sen slope and Mann-Kendall test corrected for autocorrelation', smallRegion: false,
}

const row = (status: TrendStatus, slope: number | null): TrendRow => ({
  start: 1980, end: 2025, n: 46, slope_decade: slope, ci_low: null, ci_high: null, p: 0.0123,
  p_uncorrected: null, r1: null, ols_slope_decade: null, ols_p: null, status, flags: [],
})

const FORBIDDEN = [/shows no change|has not changed|unchanged/i, /because/i, /due to/i, /\bcause/i, /will continue/i, /forecast/i]
const DIRECTION = /increase|decrease|\brises?\b|\bfalls?\b|\brose\b|\bfell\b|1\.23/i

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
      expect(r.sentence).toMatch(/does not prove that there is no change|not the same as proving/)
      expect(r.sentence).not.toMatch(DIRECTION)
      expect(r.facts).not.toMatch(DIRECTION)
      expect(r.match).not.toBe('match')
    },
  )

  it('«Casi no cambió» con evidencia insuficiente nunca queda confirmada', () => {
    for (const sl of SLOPES) {
      const r = revealPrediction('flat', row('inconclusive', sl), ctx)
      expect(r.sentence).not.toMatch(/You got it!/)
      expect(r.match).toBe('undecided')
    }
  })

  it('«Ni idea» nunca se juzga', () => {
    for (const s of STATUSES) for (const sl of SLOPES) {
      const r = revealPrediction('unsure', row(s, sl), ctx)
      expect(r.sentence).not.toMatch(/You got it!|surprise/i)
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
    expect(revealPrediction('up', row('increasing', 1.234), ctx).sentence).toMatch(/You got it! Air temperature in Sonora increased/)
    expect(revealPrediction('flat', row('decreasing', -1.234), ctx).sentence).toMatch(/It did change: air temperature in Sonora decreased/)
  })

  it('las cifras salen de la fila y declaran periodo, n, p, α, unidad y método', () => {
    const r = revealPrediction('up', row('increasing', 1.234), ctx)
    expect(r.change).toContain('+1.23 °C per decade (every 10 years)')
    expect(r.facts).toContain('unit: °C/decade')
    expect(r.facts).toContain('1980–2025')
    expect(r.facts).toContain('46 years')
    expect(r.facts).toContain('p = 0.012')
    expect(r.facts).toContain('α = 0.05')
    expect(r.facts).toContain('Theil-Sen')
    const inc = revealPrediction('up', row('inconclusive', 1.234), ctx)
    expect(inc.facts).toContain('unit: °C/decade')
    expect(inc.facts).toContain('Mann-Kendall')
  })

  it('variable relativa: cifra absoluta y % entre paréntesis, como el panel (T019)', () => {
    const rel = { ...ctx, unit: 'mm/decade', pct: 10.222 }
    const r = revealPrediction('up', row('increasing', 41.543), rel)
    expect(r.change).toContain('+41.54 mm per decade (every 10 years); that is +10.2 % of the average of those years')
    const neg = revealPrediction('down', row('decreasing', -20), { ...rel, pct: -6.408 })
    expect(neg.change).toContain('−6.4 % of the average')
    // Sin evidencia: ni cifra absoluta ni %.
    const inc = revealPrediction('up', row('inconclusive', 41.543), rel)
    expect(inc.change).toBeNull()
    expect(inc.facts).not.toMatch(/41/)
  })

  it('concuerda en plural («particles… increased») (FR-E16)', () => {
    const pl = { ...ctx, topic: 'particles in the air', plural: true }
    expect(revealPrediction('up', row('increasing', 1), pl).sentence).toMatch(/Particles in the air in Sonora increased/)
    expect(revealPrediction('flat', row('decreasing', -1), pl).sentence).toMatch(/It did change: .* decreased/)
    expect(revealPrediction('up', row('inconclusive', 1), pl).sentence).toMatch(/go up and down/)
    expect(revealPrediction('up', null, pl).sentence).toMatch(/changed in Sonora/)
  })

  it('sin unidad física: solo % y la unidad declarada es «% per decade» (FR-E20)', () => {
    const dim = { ...ctx, unit: 'unitless/decade', pct: -15.396, dimensionless: true }
    const r = revealPrediction('down', row('decreasing', -0.01), dim)
    expect(r.change).toBe('−15.4 % per decade (every 10 years), relative to the average of those years')
    expect(r.change).not.toMatch(/unitless/)
    expect(r.facts).toContain('unit: % per decade')
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
      expect(t).not.toMatch(/because|due to|caused|will continue|forecast/i)
    }
    expect(DETECTIVE_COPY.whyNote).toMatch(/not why/)
  })
})
