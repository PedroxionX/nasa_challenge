import { describe, expect, it } from 'vitest'
import type { PlaybackFrame } from '../../app/playback'
import { readPalette, withAlpha } from './mapColors'
import { playbackRegionFill } from './playbackColors'

const palette = readPalette()
const frame: PlaybackFrame = {
  regionId: 'MX-BCN', regionName: 'Baja California', variableId: 'air_temperature',
  from: 1980, to: 2025, year: 2000, playing: false, value: 20, unit: '°C', min: 18, max: 22,
}

describe('Colores de reproducción anual', () => {
  it('solo el estado seleccionado tiene relleno, incluso si falta su dato anual', () => {
    for (const value of [18, 20, 22, null]) {
      for (const id of ['MX-SON', 'US-TX', 'MX-CMX']) {
        expect(playbackRegionFill(id, { ...frame, value }, palette)).toBe('rgba(0, 0, 0, 0)')
      }
    }
    expect(playbackRegionFill(frame.regionId, { ...frame, value: null }, palette)).toBe(withAlpha(palette.noData, 0.7))
  })

  it.each([[18, 22], [-20, -5], [0, 100], [0.001, 0.009]])('mantiene la escala %s–%s para valores de cualquier unidad', (min, max) => {
    const at = (value: number) => playbackRegionFill(frame.regionId, { ...frame, min, max, value }, palette)
    expect(at(min)).toBe('rgb(59, 42, 122)')
    expect(at(max)).toBe('rgb(180, 83, 9)')
    expect(at(min)).not.toBe(at((min + max) / 2))
    expect(at((min + max) / 2)).not.toBe(at(max))
    expect(at(min - 10)).toBe(at(min))
    expect(at(max + 10)).toBe(at(max))
  })

  it('una serie constante mantiene un color neutro, sin dividir por cero', () => {
    expect(playbackRegionFill(frame.regionId, { ...frame, value: 0, min: 0, max: 0 }, palette)).toBe('rgb(227, 222, 214)')
  })
})
