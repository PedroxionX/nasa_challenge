import { describe, expect, it } from 'vitest'
import {
  MINUS, fmtAlpha, fmtInterval, fmtNumber, fmtP, fmtPercent, fmtSigned, fmtSlope, fmtTick, fmtValue,
  fmtYear, fmtYears,
} from './format'

describe('format (FR-A08, es-MX)', () => {
  it('usa punto decimal y no agrupa miles', () => {
    expect(fmtNumber(1234.5, 1)).toBe('1234.5')
    expect(fmtNumber(0.456, 2)).toBe('0.46')
  })

  it('usa el menos tipográfico U+2212, nunca el guion', () => {
    expect(MINUS).toBe('−')
    expect(fmtNumber(-0.12, 2)).toBe('−0.12')
    expect(fmtSigned(-0.123, 2)).toBe('−0.12')
    expect(fmtSigned(-0.123, 2)).not.toContain('-')
  })

  it('pone signo explícito en pendientes, salvo cuando redondea a cero', () => {
    expect(fmtSigned(0.456, 2)).toBe('+0.46')
    expect(fmtSigned(0, 2)).toBe('0.00')
    expect(fmtSigned(-0.001, 2)).toBe('0.00')
    expect(fmtSigned(0.004, 2)).toBe('0.00')
  })

  it('formatea años sin separador de miles', () => {
    expect(fmtYear(1981)).toBe('1981')
    expect(fmtYears(1981, 2025)).toBe('1981–2025')
  })

  it('formatea el valor p con «p < 0.001» por debajo del umbral', () => {
    expect(fmtP(0.000016)).toBe('p < 0.001')
    expect(fmtP(0.001)).toBe('p = 0.001')
    expect(fmtP(0.0234)).toBe('p = 0.023')
    expect(fmtP(0.5)).toBe('p = 0.500')
    expect(fmtP(null)).toBe('p no evaluable')
  })

  it('formatea α sin ceros de relleno', () => {
    expect(fmtAlpha(0.05)).toBe('α = 0.05')
    expect(fmtAlpha(0.1)).toBe('α = 0.1')
  })

  it('compone pendiente por década con unidad', () => {
    expect(fmtSlope(0.46, '°C')).toBe('+0.46 °C por década')
    expect(fmtSlope(-12.34, 'mm/año', 1)).toBe('−12.3 mm/año por década')
  })

  it('compone el intervalo con signos', () => {
    expect(fmtInterval(-0.1, 0.3)).toBe('de −0.10 a +0.30')
  })

  it('formatea porcentajes sin calcularlos', () => {
    expect(fmtPercent(3.14)).toBe('+3.1 %')
    expect(fmtPercent(-0.04)).toBe('0.0 %')
  })

  it('muestra valores del archivo sin ceros de relleno', () => {
    expect(fmtValue(300.5)).toBe('300.5')
    expect(fmtValue(20.849)).toBe('20.849')
    expect(fmtValue(-1.25)).toBe('−1.25')
  })

  it('ajusta los decimales de los ejes al paso entre marcas', () => {
    expect(fmtTick(20.5, 0.5)).toBe('20.5')
    expect(fmtTick(300, 50)).toBe('300')
    expect(fmtTick(0.25, 0.05)).toBe('0.25')
  })

  it('devuelve un guion largo cuando el valor no existe, nunca «NaN»', () => {
    expect(fmtSigned(null, 2)).toBe('—')
    expect(fmtNumber(Number.NaN, 2)).toBe('—')
    expect(fmtInterval(null, 0.3)).toBe('—')
  })
})
