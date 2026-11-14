import { describe, expect, it } from 'vitest'
import type { MapFile } from '../../lib/data'
import { borderSegments } from './borders'
import { altitudeFactor, viewOffsetFor } from './camera'
import { formatBreak, formatSlope, sortRows, type RegionRow } from './format'
import { classIndex, classRanges, paletteIndex, valuesForWindow, withAlpha } from './mapColors'
import { dropTinyParts, ringArea } from './simplify'
import { textureUrls } from './textures'

const MAP: MapFile = {
  schema_version: 1,
  variable: 'T2M',
  unit: '°C/década',
  regions: ['MX-BCN', 'MX-SON', 'US-TX'],
  windows: { '1981-2025': [0.46, null, -0.12] },
  classes: { breaks: [-0.4, -0.1, 0.1, 0.4], labels: ['Baja mucho', 'Baja', 'Casi sin cambio', 'Sube', 'Sube mucho'] },
}

describe('clases del mapa', () => {
  it('clasifica según los cortes del archivo, con el corte en la clase superior', () => {
    const b = MAP.classes.breaks
    expect(classIndex(-0.5, b)).toBe(0)
    expect(classIndex(-0.4, b)).toBe(1)
    expect(classIndex(0, b)).toBe(2)
    expect(classIndex(0.1, b)).toBe(3)
    expect(classIndex(0.46, b)).toBe(4)
  })

  it('devuelve valor o «sin datos» por región, y null si la ventana no existe', () => {
    const v = valuesForWindow(MAP, '1981-2025')
    expect(v?.get('MX-BCN')).toEqual({ kind: 'value', value: 0.46, classIndex: 4 })
    expect(v?.get('MX-SON')).toEqual({ kind: 'no-data' })
    expect(v?.get('US-TX')).toEqual({ kind: 'value', value: -0.12, classIndex: 1 })
    expect(valuesForWindow(MAP, '2020-2025')).toBeNull()
  })

  it('describe el intervalo de cada clase', () => {
    expect(classRanges(MAP.classes.breaks, formatBreak)).toEqual([
      'menos de −0,4', 'de −0,4 a −0,1', 'de −0,1 a 0,1', 'de 0,1 a 0,4', '0,4 o más',
    ])
  })

  it('reparte las clases sobre la paleta aunque no sean cinco', () => {
    expect([0, 1, 2, 3, 4].map(i => paletteIndex(i, 5, 5))).toEqual([0, 1, 2, 3, 4])
    expect([0, 1, 2].map(i => paletteIndex(i, 3, 5))).toEqual([0, 2, 4])
  })

  it('aplica transparencia a colores hexadecimales', () => {
    expect(withAlpha('#018571', 0.85)).toBe('rgba(1, 133, 113, 0.85)')
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgb(1, 2, 3)')
  })
})

describe('formato y tabla', () => {
  const rows: RegionRow[] = [
    { id: 'US-TX', name: 'Texas', country: 'Estados Unidos', value: -0.12, label: 'Baja' },
    { id: 'MX-SON', name: 'Sonora', country: 'México', value: null, label: null },
    { id: 'MX-BCN', name: 'Baja California', country: 'México', value: 0.46, label: 'Sube mucho' },
  ]

  it('escribe la pendiente con signo y coma decimal', () => {
    expect(formatSlope(0.456)).toBe('+0,46')
    expect(formatSlope(-0.1)).toBe('−0,10')
    expect(formatSlope(0)).toBe('0,00')
  })

  it('ordena por nombre y por valor, con «sin datos» siempre al final', () => {
    expect(sortRows(rows, 'name', 1).map(r => r.id)).toEqual(['MX-BCN', 'MX-SON', 'US-TX'])
    expect(sortRows(rows, 'value', 1).map(r => r.id)).toEqual(['US-TX', 'MX-BCN', 'MX-SON'])
    expect(sortRows(rows, 'value', -1).map(r => r.id)).toEqual(['MX-BCN', 'US-TX', 'MX-SON'])
    expect(rows[0].id).toBe('US-TX') // no muta la entrada
  })
})

describe('cámara y zona libre', () => {
  it('desplaza la vista la mitad de lo que tapa el panel', () => {
    expect(viewOffsetFor(1440, 800, { right: 420, bottom: 0 })).toEqual({ x: 210, y: 0 })
    expect(viewOffsetFor(390, 700, { right: 0, bottom: 350 })).toEqual({ x: 0, y: 175 })
    expect(viewOffsetFor(390, 700, { right: 0, bottom: 0 })).toEqual({ x: 0, y: 0 })
  })

  it('aleja la cámara en proporción a la zona libre, con tope', () => {
    expect(altitudeFactor(1000, 800, { right: 0, bottom: 0 })).toBe(1)
    expect(altitudeFactor(1000, 800, { right: 0, bottom: 400 })).toBeCloseTo(1.8) // 2 → tope 1,8
    expect(altitudeFactor(1000, 800, { right: 250, bottom: 0 })).toBeCloseTo(1 / 0.75)
  })
})

describe('fronteras de fondo', () => {
  it('genera un segmento por tramo, subdivide los largos y salta el antimeridiano', () => {
    const square = { type: 'Polygon' as const, coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] }
    expect(borderSegments([square]).length / 4).toBe(4)
    const long = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0]]] }
    expect(borderSegments([long]).length / 4).toBe(3) // 10° en tramos de 4° como máximo
    const wrap = { type: 'Polygon' as const, coordinates: [[[179, 0], [-179, 0], [-179, 0]]] }
    expect(borderSegments([wrap])).toEqual([])
  })
})

describe('texturas', () => {
  it('usa las versiones de 2048 px en modo ligero', () => {
    expect(textureUrls(true).surface).toMatch(/earth-blue-marble-2k\.jpg$/)
    expect(textureUrls(false).surface).toMatch(/earth-blue-marble\.jpg$/)
    expect(textureUrls(true).bump).toBe(textureUrls(false).bump)
  })
})

describe('simplificación para dibujar', () => {
  const sq = (x: number, y: number, s: number) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]]

  it('omite islas diminutas y conserva siempre la parte mayor', () => {
    expect(ringArea(sq(0, 0, 2)[0])).toBe(4)
    const multi = { type: 'MultiPolygon' as const, coordinates: [sq(0, 0, 2), sq(5, 5, 0.1), sq(8, 8, 1)] }
    expect((dropTinyParts(multi, 0.02).coordinates as unknown[]).length).toBe(2)
    const tiny = { type: 'MultiPolygon' as const, coordinates: [sq(0, 0, 0.05), sq(1, 1, 0.01)] }
    expect((dropTinyParts(tiny, 0.02).coordinates as unknown[]).length).toBe(1)
    const poly = { type: 'Polygon' as const, coordinates: sq(0, 0, 0.01) }
    expect(dropTinyParts(poly, 0.02)).toBe(poly)
  })
})
