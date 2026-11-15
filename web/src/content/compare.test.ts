/**
 * Pruebas de explainComparison (007 T011, FR-K08): variantes del veredicto de la diferencia y reglas de redacción.
 */
import { describe, expect, it } from 'vitest'
import { COMPARE_COPY, UI_COPY, explainComparison, variableCopy, type CompareContext } from './index'
import type { DifferenceRow } from '../lib/data'

const ctx: CompareContext = {
  firstName: 'Baja California',
  secondName: 'Texas',
  unit: '°C/década',
  basis: 'absolute',
  from: 1980,
  to: 2025,
  alpha: 0.05,
  minYears: 10,
  first: { status: 'increasing', slope: 0.38 },
  second: { status: 'increasing', slope: 0.21 },
  smallRegion: false,
  isSynthetic: false,
}

const row = (over: Partial<DifferenceRow> = {}): DifferenceRow => ({
  start: 1980, end: 2025, n: 46, diff_decade: 0.17, ci_low: 0.05, ci_high: 0.29, p: 0.004, status: 'differ', ...over,
})
const NO_FIGURES = { diff_decade: null, ci_low: null, ci_high: null, p: null }

/** Lo que ninguna variante puede decir (constitución I y FR-K08). */
const FORBIDDEN = /cambian igual|no hay diferencia|son iguales|mejor|peor|debido a|porque|seguirá|años para/i

const everyText = (e: ReturnType<typeof explainComparison>) => [e.verdict, e.sentence, e.pattern ?? '', ...e.caveats].join(' ')

describe('explainComparison', () => {
  it('differ: diferencia en el orden del archivo, con intervalo, p, años comunes y unidad', () => {
    const e = explainComparison(row(), ctx)
    expect(e.verdict).toBe('Las tendencias difieren')
    expect(e.sentence).toContain('Baja California − Texas')
    expect(e.sentence).toContain('+0.17 °C/década')
    expect(e.sentence).toMatch(/IC 95 %: de \+0\.05 a \+0\.29/)
    expect(e.sentence).toContain('p = 0.004')
    expect(e.sentence).toContain('46 años completos comunes')
    expect(e.pattern).toMatch(/en los dos sube, con evidencia/)
    expect(e.caveats).toContain(COMPARE_COPY.manyPairs)
    expect(e.caveats).toContain(COMPARE_COPY.notCause)
  })

  it('inconclusive: no afirma que coincidan ni da la cifra de la diferencia', () => {
    const e = explainComparison(row({ status: 'inconclusive', p: 0.31 }), ctx)
    expect(e.verdict).toBe('Sin evidencia suficiente de que difieran')
    expect(e.sentence).toContain('Esto no demuestra que cambien igual')
    expect(e.sentence).toContain('p = 0.310')
    expect(e.sentence).not.toContain('0.17')
  })

  it('signos opuestos sin evidencia de diferencia: avisa de que el signo no basta', () => {
    const e = explainComparison(row({ status: 'inconclusive', p: 0.2 }), {
      ...ctx, first: { status: 'inconclusive', slope: 0.1 }, second: { status: 'inconclusive', slope: -0.2 },
    })
    expect(e.pattern).toMatch(/signo opuesto/)
    expect(e.caveats).toContain(COMPARE_COPY.oppositeSigns)
    // Con evidencia de que difieren, el aviso sobra.
    expect(explainComparison(row(), { ...ctx, second: { status: 'decreasing', slope: -0.2 } }).caveats)
      .not.toContain(COMPARE_COPY.oppositeSigns)
  })

  it('signos opuestos con evidencia en ambas: nombra la dirección de cada región', () => {
    const e = explainComparison(row(), { ...ctx, second: { status: 'decreasing', slope: -0.2 } })
    expect(e.pattern).toBe('Baja California sube y Texas baja, cada uno con evidencia de tendencia.')
  })

  it('sin resultado individual de una región no describe ningún patrón', () => {
    expect(explainComparison(row(), { ...ctx, second: null }).pattern).toBeNull()
    expect(explainComparison(row(), { ...ctx, second: { status: 'invalid', slope: null } }).pattern).toBeNull()
  })

  it('insufficient e invalid: sin cifras de la diferencia', () => {
    const few = explainComparison(row({ status: 'insufficient', n: 7, ...NO_FIGURES }), ctx)
    expect(few.verdict).toBe('Datos insuficientes para comparar')
    expect(few.sentence).toMatch(/comparten 7 años completos/)
    expect(few.sentence).toContain('menos de 10')
    const bad = explainComparison(row({ status: 'invalid', ...NO_FIGURES }), ctx)
    expect(bad.verdict).toBe('Comparación no válida')
    for (const e of [few, bad]) {
      expect(e.pattern).toBeNull()
      expect(everyText(e)).not.toMatch(/IC|p [=<]/)
    }
  })

  it('la base relativa se explica y la unidad es la del archivo', () => {
    const e = explainComparison(row({ diff_decade: -22.57, ci_low: -34.58, ci_high: -9.36 }), {
      ...ctx, basis: 'relative', unit: 'puntos porcentuales/década',
    })
    expect(e.sentence).toContain('−22.57 puntos porcentuales/década')
    expect(e.caveats[0]).toBe(COMPARE_COPY.relativeBasis)
    expect(explainComparison(row(), ctx).caveats[0]).toBe(COMPARE_COPY.absoluteBasis)
  })

  it('hereda los avisos de datos sintéticos y de región pequeña', () => {
    const e = explainComparison(row(), { ...ctx, isSynthetic: true, smallRegion: true })
    expect(e.caveats).toContain(UI_COPY.synthetic)
    expect(e.caveats).toContain(UI_COPY.smallRegion)
  })

  it('ninguna variante ordena regiones, atribuye causa, pronostica ni dice que coinciden', () => {
    const statuses: DifferenceRow['status'][] = ['differ', 'inconclusive', 'insufficient', 'invalid']
    const seconds: CompareContext['second'][] = [ctx.second, { status: 'decreasing', slope: -0.2 }, { status: 'inconclusive', slope: -0.1 }, null]
    for (const status of statuses) {
      for (const second of seconds) {
        const figures = status === 'differ' || status === 'inconclusive' ? {} : NO_FIGURES
        expect(everyText(explainComparison(row({ status, ...figures }), { ...ctx, second }))).not.toMatch(FORBIDDEN)
      }
    }
    const fixed = Object.values(COMPARE_COPY).filter((v): v is string => typeof v === 'string')
    expect([...fixed, ...Object.values(COMPARE_COPY.notComparable)].join(' ')).not.toMatch(FORBIDDEN)
  })
})

describe('variableCopy (007 FR-K14)', () => {
  it('usa los textos de 006 si existen', () => {
    expect(variableCopy('air_temperature', { label: 'X', definition: 'Y' }).short).toBe('Temperatura')
  })
  it('sin textos propios usa los del catálogo', () => {
    expect(variableCopy('algo_nuevo', { label: 'Algo nuevo', definition: 'Su definición.' }))
      .toEqual({ label: 'Algo nuevo', short: 'Algo nuevo', definition: 'Su definición.' })
  })
  it('sin catálogo todavía muestra el id legible, sin inventar un nombre', () => {
    expect(variableCopy('algo_nuevo').label).toBe('algo nuevo')
  })
})
