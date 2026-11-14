import { describe, expect, it } from 'vitest'
import { pickWindow, type Catalog, type SeriesFile } from '../../lib/data'
import { digitsFor, evidenceLabel, isFullPeriod, readExtras, yearPoints } from './analysisData'
import { TREND_FIXTURES } from '../../lib/testing/fixtures'
import { withoutOptionalColumns } from './testData'

// Fixtures sintéticos compartidos de 002 (nunca web/public/data/trends/, que es de 003 y cambia).
const fixture = <T,>(path: string) => JSON.parse(TREND_FIXTURES[`data/trends/${path}`]) as T
const catalog = fixture<Catalog>('catalog.json')
const temp = fixture<SeriesFile>('series/air_temperature/MX-BCN.json')
const precip = fixture<SeriesFile>('series/precipitation/MX-BCN.json')
const precipInfo = catalog.variables.find(v => v.id === 'precipitation')!
const tempInfo = catalog.variables.find(v => v.id === 'air_temperature')!

describe('readExtras (FR-A09, FR-A10)', () => {
  it('con relative_change lee el % y su intervalo tal cual vienen', () => {
    const row = pickWindow(precip, 2001, 2025)!
    expect(readExtras(row, precipInfo)).toEqual({
      lineMid: row.line_mid,
      pct: { slope: row.slope_decade_pct, low: row.ci_low_pct, high: row.ci_high_pct },
    })
  })

  it('sin relative_change no hay %, pero sí la posición de la recta', () => {
    const row = pickWindow(temp, 1980, 2025)!
    expect(readExtras(row, tempInfo)).toEqual({ lineMid: row.line_mid, pct: null })
  })

  it('un archivo sin las columnas opcionales no falla: ni recta ni %', () => {
    const old = withoutOptionalColumns(precip)
    expect(readExtras(pickWindow(old, 2001, 2025), precipInfo)).toEqual({ lineMid: null, pct: null })
    expect(readExtras(null, precipInfo)).toEqual({ lineMid: null, pct: null })
  })
})

describe('yearPoints', () => {
  it('empareja años y valores del archivo', () => {
    const points = yearPoints(temp)
    expect(points).toHaveLength(temp.years.length)
    expect(points[0]).toEqual({ year: temp.years[0], value: temp.values[0] })
  })
})

describe('isFullPeriod (periodo por variable)', () => {
  it('cada variable tiene su propio periodo completo', () => {
    expect(isFullPeriod(catalog, 'air_temperature', 1980, 2025)).toBe(true)
    expect(isFullPeriod(catalog, 'precipitation', 2001, 2025)).toBe(true)
    expect(isFullPeriod(catalog, 'precipitation', 1980, 2025)).toBe(false)
  })
})

describe('evidenceLabel (FR-A05)', () => {
  it('solo dos formas y nunca calificativos de fuerza', () => {
    expect(evidenceLabel('increasing')).toBe('Hay evidencia de tendencia')
    expect(evidenceLabel('decreasing')).toBe('Hay evidencia de tendencia')
    expect(evidenceLabel('inconclusive')).toBe('Sin evidencia suficiente')
    expect(evidenceLabel('insufficient')).toBeNull()
    expect(evidenceLabel('invalid')).toBeNull()
  })
})

it('digitsFor: dos decimales en °C y uno en mm', () => {
  expect(digitsFor('°C')).toBe(2)
  expect(digitsFor('mm')).toBe(1)
})
