import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeriesFile } from '../../lib/data'
import { fmtValue } from '../../lib/format'
import { TREND_FIXTURES } from '../../lib/testing/fixtures'
import { PLAYBACK_DURATION_MS } from '../../lib/ui/useTimelinePlayback'
import TrendChart from './TrendChart'

const fixture = JSON.parse(TREND_FIXTURES['data/trends/series/air_temperature/MX-BCN.json']) as SeriesFile
function props(from = 1980, to = 2025) {
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const series: SeriesFile = { ...fixture, years, values: years.map((_, i) => 20 + i / 10), excluded_years: [], partial_year: null }
  return {
    series,
    row: null, from, to, unit: '°C', variableLabel: 'Air temperature', regionName: 'Baja California', lineMid: null,
  }
}
const slider = () => screen.getByRole('slider', { name: 'Playback year' }) as HTMLInputElement
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const play = () => fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'] })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('Annual timeline playback', () => {
  it('el primer cuadro nunca retrocede a un año anterior al periodo', () => {
    let firstFrame!: FrameRequestCallback
    vi.spyOn(window, 'requestAnimationFrame').mockImplementationOnce(callback => { firstFrame = callback; return 1 })
    render(<TrendChart {...props()} />)
    play()
    act(() => { firstFrame(performance.now() - 16) })
    expect(document.querySelector('.timeline-readout strong')!.textContent).toBe('1980')
    expect(document.querySelector('.chart-current circle')).not.toBeNull()
  })

  it.each([[1980, 2025], [2003, 2025], [2001, 2010]])('recorre %i–%i en 9 segundos y se detiene', (from, to) => {
    render(<TrendChart {...props(from, to)} />)
    play()
    expect(document.querySelectorAll('.chart-point:not([visibility="hidden"])')).toHaveLength(1)
    advance(PLAYBACK_DURATION_MS / 2)
    expect(Number(slider().value)).toBeGreaterThan(from)
    expect(Number(slider().value)).toBeLessThan(to)
    advance(PLAYBACK_DURATION_MS / 2)
    expect(slider().value).toBe(String(to))
    expect(screen.getByRole('button', { name: 'Replay timeline' })).toBeTruthy()
    expect(document.querySelectorAll('.chart-point:not([visibility="hidden"])')).toHaveLength(to - from + 1)
    advance(5_000)
    expect(slider().value).toBe(String(to))
    expect(vi.getTimerCount()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Replay timeline' }))
    expect(slider().value).toBe(String(from))
    expect(screen.getByRole('button', { name: 'Pause timeline' })).toBeTruthy()
  })

  it('pausa, conserva el año y continúa con el tiempo restante', () => {
    render(<TrendChart {...props()} />)
    play()
    advance(3_000)
    fireEvent.click(screen.getByRole('button', { name: 'Pause timeline' }))
    const paused = slider().value
    advance(5_000)
    expect(slider().value).toBe(paused)
    play()
    advance(6_100)
    expect(slider().value).toBe('2025')
    expect(screen.getByRole('button', { name: 'Replay timeline' })).toBeTruthy()
  })

  it('al mover la barra pausa y muestra el dato exacto; reiniciar vuelve al primer año', () => {
    const input = props()
    render(<TrendChart {...input} />)
    play()
    advance(1_000)
    fireEvent.change(slider(), { target: { value: '2005' } })
    const expected = `${fmtValue(input.series.values[25])} °C`
    expect(slider().getAttribute('aria-valuetext')).toBe(`2005: ${expected}`)
    expect(document.querySelector('.timeline-readout')!.textContent).toContain(expected)
    expect(screen.getByRole('button', { name: 'Play timeline' })).toBeTruthy()
    advance(10_000)
    expect(slider().value).toBe('2005')
    fireEvent.click(screen.getByRole('button', { name: 'Reset playback' }))
    expect(slider().value).toBe('1980')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('los años incompletos conservan su hueco y el año parcial no se reproduce', () => {
    const input = props()
    input.series.years.splice(25, 1)
    input.series.values.splice(25, 1)
    input.series.excluded_years = [2005]
    render(<TrendChart {...input} series={{ ...input.series, partial_year: { year: 2026, months_valid: 9 } }} />)
    fireEvent.change(slider(), { target: { value: '2005' } })
    expect(slider().getAttribute('aria-valuetext')).toBe('2005: No complete annual value')
    expect(document.querySelector('.chart-current circle')).toBeNull()
    expect(document.querySelector('.chart-current line')).not.toBeNull()
    expect(slider().max).toBe('2025')
    expect(document.querySelector('.chart-excluded')).not.toBeNull()
  })

  it.each(['period', 'variable', 'state'])('cambiar %s cancela la reproducción y empieza detenido', kind => {
    const input = props()
    const { rerender } = render(<TrendChart {...input} />)
    play()
    advance(3_000)
    const next = kind === 'period' ? { ...input, from: 2000 }
      : kind === 'variable' ? { ...props(2003), unit: 'mm', variableLabel: 'Precipitation', series: { ...props(2003).series, variable: 'precipitation' } }
      : { ...input, regionName: 'Sonora', series: { ...input.series, region: 'MX-SON' } }
    rerender(<TrendChart {...next} />)
    expect(slider().value).toBe(String(next.from))
    expect(screen.getByRole('button', { name: 'Play timeline' })).toBeTruthy()
    expect(document.querySelector('.chart-current')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('al ocultar la pestaña pausa y al desmontar limpia los temporizadores', () => {
    const { unmount } = render(<TrendChart {...props()} />)
    play()
    advance(1_000)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    const paused = slider().value
    advance(10_000)
    expect(slider().value).toBe(paused)
    expect(screen.getByRole('button', { name: 'Play timeline' })).toBeTruthy()
    play()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no reproduce un periodo sin dos valores completos', () => {
    const input = props()
    render(<TrendChart {...input} series={{ ...input.series, years: [1980], values: [20] }} />)
    expect((screen.getByRole('button', { name: 'Play timeline' }) as HTMLButtonElement).disabled).toBe(true)
    expect(slider().disabled).toBe(true)
    expect(screen.getByText('Not enough annual data to play this period.')).toBeTruthy()
  })
})
