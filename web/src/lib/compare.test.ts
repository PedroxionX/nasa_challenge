// Lectores de `compare/` (007 T010) con los fixtures sintéticos: el par se guarda una vez y se lee sin invertir.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDataCache, loadCompareIndex, loadComparison, pairOrder, pickComparison, variablePeriods, loadCatalog,
  type CompareFile,
} from './data'
import { TREND_FIXTURES, fixtureFetch } from './testing/fixtures'

const serve = (overrides: Record<string, string | object | null> = {}) =>
  vi.stubGlobal('fetch', vi.fn(fixtureFetch({ overrides })))

beforeEach(() => { clearDataCache(); serve() })
afterEach(() => vi.unstubAllGlobals())

const raw = (path: string) => JSON.parse(TREND_FIXTURES[`data/trends/${path}`])

describe('compare/', () => {
  it('el índice dice qué variables tienen prueba de la diferencia, con base, unidad y ventanas', async () => {
    const index = (await loadCompareIndex())!
    expect(index.variables.air_temperature).toMatchObject({ basis: 'absolute', unit: '°C/década', end: 2025 })
    expect(index.variables.precipitation).toMatchObject({ basis: 'relative', unit: 'puntos porcentuales/década' })
    expect(index.variables.air_temperature.starts[0]).toBe(1980)
  })

  it('sin índice publicado devuelve null (no es un error)', async () => {
    clearDataCache()
    serve({ 'data/trends/compare/index.json': null })
    expect(await loadCompareIndex()).toBeNull()
  })

  it('un índice mal formado sí es un error', async () => {
    clearDataCache()
    serve({ 'data/trends/compare/index.json': { schema_version: 2 } })
    await expect(loadCompareIndex()).rejects.toMatchObject({ kind: 'schema_version' })
  })

  it('el par se lee del archivo de la región que va antes, se pida en el orden que se pida', async () => {
    expect(pairOrder('US-TX', 'MX-BCN')).toEqual(['MX-BCN', 'US-TX'])
    const a = await loadComparison('air_temperature', 'MX-BCN', 'US-TX')
    const b = await loadComparison('air_temperature', 'US-TX', 'MX-BCN')
    expect(a).toBe(b)
    expect(a!.region).toBe('MX-BCN')
  })

  it('un par sin archivo devuelve null', async () => {
    expect(await loadComparison('air_temperature', 'US-TX', 'US-WY')).toBeNull()
  })

  it('pickComparison devuelve la fila tal cual, sin invertir el signo', async () => {
    const file = (await loadComparison('air_temperature', 'US-TX', 'MX-BCN'))!
    const expected = raw('compare/air_temperature/MX-BCN.json').partners['US-TX'][0]
    for (const [x, y] of [['MX-BCN', 'US-TX'], ['US-TX', 'MX-BCN']]) {
      const found = pickComparison(file, x, y, 1980, 2025)
      expect(found).toMatchObject({ kind: 'row', first: 'MX-BCN', second: 'US-TX' })
      if (found.kind !== 'row') throw new Error('sin fila')
      expect([found.row.n, found.row.diff_decade, found.row.ci_low, found.row.ci_high, found.row.p, found.row.status]).toEqual(expected)
      expect(found.row).toMatchObject({ start: 1980, end: 2025 })
    }
  })

  it('un periodo que no termina en el año publicado, o con inicio sin fila, no tiene prueba', async () => {
    const file = (await loadComparison('air_temperature', 'MX-BCN', 'US-TX'))!
    expect(pickComparison(file, 'MX-BCN', 'US-TX', 1990, 2020).kind).toBe('no_window')
    expect(pickComparison(file, 'MX-BCN', 'US-TX', 2020, 2025).kind).toBe('no_window')
    expect(pickComparison(file, 'MX-BCN', 'US-TX', 2016, 2025).kind).toBe('row')
  })

  it('pares no comparables y pares ausentes se distinguen', () => {
    const file: CompareFile = {
      ...raw('compare/air_temperature/MX-BCN.json'), not_comparable: { 'US-WY': 'different_product' },
    }
    expect(pickComparison(file, 'US-WY', 'MX-BCN', 1980, 2025)).toEqual({
      kind: 'not_comparable', first: 'MX-BCN', second: 'US-WY', reason: 'different_product',
    })
    expect(pickComparison(file, 'MX-BCN', 'US-UT', 1980, 2025).kind).toBe('missing')
    expect(pickComparison(file, 'MX-AGU', 'MX-BCN', 1980, 2025).kind).toBe('missing') // archivo de otra región
  })

  it('variablePeriods recorre las variables del catálogo', async () => {
    const periods = variablePeriods(await loadCatalog())
    expect(periods).toEqual({
      air_temperature: { firstYear: 1980, lastYear: 2025 }, precipitation: { firstYear: 2001, lastYear: 2025 },
    })
  })
})
