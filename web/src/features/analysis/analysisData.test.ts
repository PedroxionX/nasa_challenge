import { describe, expect, it } from 'vitest'
import { pickWindow, type SeriesFile, type VariableInfo } from '../../lib/data'
import { digitsFor, evidenceLabel, extraColumn, readExtras, yearPoints } from './analysisData'
import extras from './fixtures/extras.json'
import bcn from '../../../public/data/trends/series/T2M/MX-BCN.json'

const withExtras = extras as unknown as SeriesFile
const withoutExtras = bcn as unknown as SeriesFile
const precip: VariableInfo = {
  id: 'PRECTOTCORR', label: 'Precipitación', definition: '', kind: 'reanalysis',
  unit_annual: 'mm', aggregation: 'sum_from_rate', relative_change: true,
}
const temp: VariableInfo = { ...precip, id: 'T2M', unit_annual: '°C', relative_change: false }

describe('extraColumn (columnas opcionales del contrato)', () => {
  it('lee la columna de la fila pedida tal cual viene', () => {
    expect(extraColumn(withExtras, 2000, 2012, 'line_mid')).toBe(327.5)
    expect(extraColumn(withExtras, 2000, 2012, 'slope_decade_pct')).toBe(14.8)
  })

  it('devuelve null si la columna, la fila o el valor no existen', () => {
    expect(extraColumn(withoutExtras, 1981, 2025, 'line_mid')).toBeNull()
    expect(extraColumn(withExtras, 1990, 2012, 'line_mid')).toBeNull()
    expect(extraColumn(withExtras, 2003, 2012, 'line_mid')).toBeNull()
  })
})

describe('readExtras', () => {
  it('con relative_change lee el % y su intervalo (FR-A09)', () => {
    const row = pickWindow(withExtras, 2000, 2012)
    expect(readExtras(withExtras, row, precip)).toEqual({
      lineMid: 327.5, pct: { slope: 14.8, low: 9.2, high: 20.1 },
    })
  })

  it('sin relative_change no muestra % aunque la columna exista', () => {
    const row = pickWindow(withExtras, 2000, 2012)
    expect(readExtras(withExtras, row, temp).pct).toBeNull()
  })

  it('sin las columnas nuevas no falla: solo no hay recta ni %', () => {
    const row = pickWindow(withoutExtras, 1981, 2025)
    expect(readExtras(withoutExtras, row, precip)).toEqual({ lineMid: null, pct: null })
    expect(readExtras(withoutExtras, null, precip)).toEqual({ lineMid: null, pct: null })
  })
})

describe('yearPoints', () => {
  it('empareja años y valores del archivo sin rellenar los excluidos', () => {
    const points = yearPoints(withExtras)
    expect(points).toHaveLength(12)
    expect(points.find(p => p.year === 2008)).toBeUndefined()
    expect(points[0]).toEqual({ year: 2000, value: 300.5 })
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
