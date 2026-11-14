/**
 * Pruebas de explainTrend — 006-guide-content T003
 * Cubre el 100 % de las cuatro variantes (SC-C02) y verifica las reglas de la constitución.
 */
import { describe, it, expect } from 'vitest'
import { explainTrend, GLOSSARY, UI_COPY, type ExplainContext } from './index'
import type { TrendRow } from '../lib/data'

// ---------- Fixtures ----------

const baseCtx: ExplainContext = {
  regionName: 'Baja California',
  variableId: 'air_temperature',
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
    n: 45,
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

const FORBIDDEN_CAUSE = /porque|causa|provoca|continuará|seguirá|predic/

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
    expect(result.sentence.toLowerCase()).not.toMatch(FORBIDDEN_CAUSE)
  })

  it('no tiene avisos cuando el contexto es limpio', () => {
    expect(result.caveats).toHaveLength(0)
  })

  // Regresión: «+0,32 °C/década por década»
  it('no repite la base temporal: la unidad ya trae «/década»', () => {
    expect(result.sentence).not.toMatch(/década por década/)
    expect(result.sentence).not.toMatch(/por década/)
    // pendiente + los dos extremos del IC = 2 apariciones de la unidad
    expect(result.sentence.match(/°C\/década/g)).toHaveLength(2)
  })

  // Regresión: «fuerte» / «moderada» no estaban definidos en ningún spec
  it('no gradúa la evidencia con niveles inventados', () => {
    expect(result.sentence.toLowerCase()).not.toMatch(/fuerte|moderada|débil/)
    expect(result.sentence).toContain('Hay evidencia de tendencia')
  })

  it('el nivel del IC sale de alpha, no es fijo', () => {
    const r95 = explainTrend(row, { ...baseCtx, alpha: 0.05 })
    const r90 = explainTrend(row, { ...baseCtx, alpha: 0.1 })
    expect(r95.sentence).toContain('IC\u00a095\u00a0%')
    expect(r90.sentence).toContain('IC\u00a090\u00a0%')
  })

  it('p muy pequeño se muestra como «p < 0,001», no «0,000»', () => {
    const tiny = explainTrend(makeRow({ p: 0.000016 }), baseCtx)
    expect(tiny.sentence).toContain('p\u00a0<\u00a00,001')
    expect(tiny.sentence).not.toContain('0,000')
  })

  it('el número de años es el n del archivo', () => {
    expect(result.sentence).toContain('45\u00a0años')
  })

  it('todas las cifras con signo del texto son las del archivo (SC-C02)', () => {
    const fromText = (result.sentence.match(/[+\u2212]\d+,\d+/g) ?? []).sort()
    expect(fromText).toEqual(['+0,18', '+0,32', '+0,46'])
  })
})

// ---------- Variante 2: decreasing ----------

describe('decreasing', () => {
  const row = makeRow({ status: 'decreasing', slope_decade: -0.15, ci_low: -0.28, ci_high: -0.02, p: 0.03 })
  const result = explainTrend(row, baseCtx)

  it('veredicto es "Baja"', () => {
    expect(result.verdict).toBe('Baja')
  })

  it('la frase contiene la pendiente negativa con el signo menos U+2212', () => {
    expect(result.sentence).toContain('\u22120,15')
    expect(result.sentence).toContain('\u22120,28')
    expect(result.sentence).toContain('\u22120,02')
  })

  it('no afirma causa', () => {
    expect(result.sentence.toLowerCase()).not.toMatch(FORBIDDEN_CAUSE)
  })

  it('no repite la base temporal', () => {
    expect(result.sentence).not.toMatch(/por década/)
  })

  it('con precipitación relativa, la unidad que pasa quien llama se respeta', () => {
    const r = explainTrend(row, { ...baseCtx, variableId: 'precipitation', unit: '%/década' })
    expect(r.sentence).toContain('\u22120,15\u00a0%/década')
    expect(r.sentence).not.toContain('°C')
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
    const lower = result.sentence.toLowerCase()
    expect(lower).not.toContain('sube')
    expect(lower).not.toContain('+0,05')
    expect(result.sentence).not.toMatch(/^Baja[.,]/)
  })

  it('afirma que no demuestra ausencia de cambio (SC-C02 AS-1)', () => {
    expect(result.sentence.toLowerCase()).toContain('no demuestra')
  })

  it('no afirma causa ni pronóstico', () => {
    expect(result.sentence.toLowerCase()).not.toMatch(FORBIDDEN_CAUSE)
  })

  it('no dice «no hay cambio»', () => {
    expect(result.sentence.toLowerCase()).not.toMatch(/no hay cambio|sin cambio/)
  })
})

// ---------- Variante 4: insufficient / invalid ----------

describe('insufficient', () => {
  it('veredicto es "Datos insuficientes" cuando row es null', () => {
    const result = explainTrend(null, baseCtx)
    expect(result.verdict).toBe('Datos insuficientes')
    expect(result.sentence).toBe(UI_COPY.insufficientData)
  })

  it('veredicto es "Datos insuficientes" cuando status es insufficient', () => {
    const row = makeRow({ status: 'insufficient', slope_decade: null, ci_low: null, ci_high: null, p: null })
    const result = explainTrend(row, baseCtx)
    expect(result.verdict).toBe('Datos insuficientes')
  })

  it('no dice "no hay cambio" (constitución Principio I)', () => {
    const result = explainTrend(null, baseCtx)
    expect(result.sentence.toLowerCase()).not.toMatch(/no hay cambio|sin cambio/)
  })
})

describe('invalid', () => {
  const nulls = { slope_decade: null, ci_low: null, ci_high: null, p: null }

  it('veredicto es "Análisis no válido"', () => {
    const result = explainTrend(makeRow({ status: 'invalid', ...nulls }), baseCtx)
    expect(result.verdict).toBe('Análisis no válido')
  })

  // Regresión: antes decía «menos de 10 años» aunque la serie tuviera 45
  it('con escalón explica el salto y NO dice que faltan años', () => {
    const result = explainTrend(makeRow({ status: 'invalid', flags: ['step'], ...nulls }), baseCtx)
    expect(result.sentence).toBe(UI_COPY.invalidStep)
    expect(result.sentence.toLowerCase()).toContain('salto')
    expect(result.sentence).not.toMatch(/10 años|faltan/i)
  })

  it('sin marca de escalón usa el texto genérico, tampoco habla de años', () => {
    const result = explainTrend(makeRow({ status: 'invalid', flags: [], ...nulls }), baseCtx)
    expect(result.sentence).toBe(UI_COPY.invalidGeneric)
    expect(result.sentence).not.toMatch(/10 años|faltan/i)
  })

  it('no muestra cifras de pendiente', () => {
    const result = explainTrend(makeRow({ status: 'invalid', flags: ['step'], ...nulls }), baseCtx)
    expect(result.sentence).not.toMatch(/[+\u2212]\d/)
  })
})

// ---------- Avisos (caveats) ----------

describe('caveats', () => {
  const row = makeRow({ status: 'increasing' })
  const small = (c: string) => c.toLowerCase().includes('más pequeño') || c.toLowerCase().includes('celda')

  it('aviso de sintético cuando isSynthetic es true', () => {
    const result = explainTrend(row, { ...baseCtx, isSynthetic: true })
    expect(result.caveats.some(c => c.toLowerCase().includes('sintétic'))).toBe(true)
  })

  it('aviso de periodo cuando fullPeriod es false', () => {
    const result = explainTrend(row, { ...baseCtx, fullPeriod: false, from: 2000, to: 2025 })
    expect(result.caveats.some(c => c.includes('2000') && c.includes('2025'))).toBe(true)
  })

  // SC-C02 / US1 AS-2: el aviso de región pequeña sale en los CUATRO estados
  describe('región pequeña en todos los estados', () => {
    const cases: [string, TrendRow | null][] = [
      ['increasing', makeRow({ status: 'increasing' })],
      ['decreasing', makeRow({ status: 'decreasing', slope_decade: -0.1, ci_low: -0.2, ci_high: -0.01 })],
      ['inconclusive', makeRow({ status: 'inconclusive', p: 0.3 })],
      ['insufficient', makeRow({ status: 'insufficient', slope_decade: null, ci_low: null, ci_high: null, p: null })],
      ['invalid', makeRow({ status: 'invalid', flags: ['step'], slope_decade: null, ci_low: null, ci_high: null, p: null })],
      ['null', null],
    ]
    for (const [name, r] of cases) {
      it(`${name}`, () => {
        const result = explainTrend(r, { ...baseCtx, smallRegion: true })
        expect(result.caveats.some(small)).toBe(true)
      })
    }
  })

  it('con smallRegion false no aparece el aviso', () => {
    const result = explainTrend(row, { ...baseCtx, smallRegion: false })
    expect(result.caveats.some(small)).toBe(false)
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
    expect(result.caveats).toHaveLength(3)
  })
})

// ---------- Textos fijos (FR-C01, FR-C03, UX §7) ----------

describe('textos fijos', () => {
  it('glosario define pendiente, IC, valor p y α (FR-C03)', () => {
    for (const key of ['slope', 'ci', 'p', 'alpha'] as const) {
      expect(GLOSSARY[key].length).toBeGreaterThan(30)
    }
    expect(GLOSSARY.ci).toContain('Intervalo de confianza')
    expect(GLOSSARY.p).toContain('Valor p')
  })

  it('distingue significancia, magnitud y relevancia, sin causalidad (FR-C01)', () => {
    const t = UI_COPY.significanceNote.toLowerCase()
    expect(t).toContain('significativ')
    expect(t).toContain('cuánto cambia')
    expect(t).not.toMatch(FORBIDDEN_CAUSE)
  })

  it('la leyenda avisa de las comparaciones múltiples (UX §7, D8)', () => {
    expect(UI_COPY.legendNote).toContain('azar')
  })

  it('ningún texto fijo afirma causa o pronóstico', () => {
    const fixed = [
      UI_COPY.invalidStep, UI_COPY.invalidGeneric, UI_COPY.insufficientData,
      UI_COPY.legendNote, UI_COPY.smallRegion, UI_COPY.significanceNote,
    ]
    for (const t of fixed) expect(t.toLowerCase()).not.toMatch(/porque|provoca|continuará|seguirá|predic/)
  })
})