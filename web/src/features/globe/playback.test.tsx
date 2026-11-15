import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeriesFile } from '../../lib/data'
import { fixtureFetch, TREND_FIXTURES } from '../../lib/testing/fixtures'
import { fmtValue } from '../../lib/format'

// Probamos la conexión real gráfica → estado transitorio → globo, sin WebGL en jsdom.
vi.mock('../../app/webgl', () => ({ detectWebGL: () => true }))
vi.mock('./geo', async importOriginal => ({
  ...await importOriginal<typeof import('./geo')>(),
  loadGlobeFeatures: async () => ['MX-BCN', 'MX-SON', 'MX-CMX'].map(id => ({
    kind: 'region', properties: { id, name: id, country: 'MX' }, geometry: { type: 'Polygon', coordinates: [] },
  })),
}))
vi.mock('./EarthGlobe', () => ({
  default: function FakeGlobe({ regionFill, regionNote, onReady }: { regionFill: (id: string) => string; regionNote: (id: string) => string; onReady: () => void }) {
    useEffect(onReady, [onReady])
    return <div>{['MX-BCN', 'MX-SON', 'MX-CMX'].map(id => <span key={id} data-testid={id} data-fill={regionFill(id)} data-note={regionNote(id)} />)}</div>
  },
}))

async function start(search = '?region=MX-BCN') {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn(fixtureFetch()))
  const { default: Shell } = await import('../../app/Shell')
  await act(async () => { render(<Shell />) })
}
const fill = (id: string) => screen.getByTestId(id).getAttribute('data-fill')
const slider = () => screen.getByRole('slider', { name: 'Playback year' })
const seek = (year: number) => fireEvent.change(slider(), { target: { value: String(year) } })
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'] })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('Mapa sincronizado con la reproducción', () => {
  it('Play colorea solo el seleccionado, sigue el valor anual y conserva el fotograma al pausar', async () => {
    await start()
    const search = window.location.search
    const series = JSON.parse(TREND_FIXTURES['data/trends/series/air_temperature/MX-BCN.json']) as SeriesFile
    const originalOther = fill('MX-SON')
    fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))
    expect(fill('MX-SON')).toBe('rgba(0, 0, 0, 0)')
    expect(fill('MX-CMX')).toBe('rgba(0, 0, 0, 0)')
    expect(within(screen.getByRole('region', { name: 'Map legend' })).getByText('Annual value · 1980')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(3_000) })
    fireEvent.click(screen.getByRole('button', { name: 'Pause timeline' }))
    const paused = fill('MX-BCN')
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(fill('MX-BCN')).toBe(paused)
    const minIndex = series.values.indexOf(Math.min(...series.values))
    const maxIndex = series.values.indexOf(Math.max(...series.values))
    seek(series.years[minIndex])
    expect(fill('MX-BCN')).toBe('rgb(59, 42, 122)')
    seek(series.years[maxIndex])
    expect(fill('MX-BCN')).toBe('rgb(180, 83, 9)')
    expect(screen.getByTestId('MX-BCN').getAttribute('data-note')).toContain(`${fmtValue(series.values[maxIndex])} °C`)
    expect(window.location.search).toBe(search)
    fireEvent.click(within(screen.getByRole('region', { name: 'Map legend' })).getByRole('button', { name: 'Show trend map' }))
    expect(fill('MX-SON')).toBe(originalOther)
    expect(screen.queryByText(/^Annual value ·/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Play timeline' })).toBeTruthy()
    expect(document.querySelector('.chart-current')).toBeNull()
  })

  it('un año sin dato se identifica en gris, sin conservar el color del año anterior', async () => {
    await start('?region=MX-CMX')
    seek(1981)
    expect(fill('MX-CMX')).toBe('rgba(138, 147, 160, 0.7)')
    expect(fill('MX-BCN')).toBe('rgba(0, 0, 0, 0)')
    expect(within(screen.getByRole('region', { name: 'Map legend' })).getByText('No complete annual value')).toBeTruthy()
  })

  it('al cambiar de variable restaura el mapa y la siguiente reproducción usa sus unidades', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))
    await act(async () => { fireEvent.change(screen.getByRole('combobox', { name: 'Variable' }), { target: { value: 'precipitation' } }) })
    expect(screen.queryByText(/^Annual value ·/)).toBeNull()
    expect(fill('MX-SON')).not.toBe('rgba(0, 0, 0, 0)')
    fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))
    expect(fill('MX-SON')).toBe('rgba(0, 0, 0, 0)')
    expect(screen.getByTestId('MX-BCN').getAttribute('data-note')).toMatch(/2001.*mm/)
  })

  it('en móvil Play despeja el globo y permite pausar y reanudar desde la leyenda', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Show analysis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand analysis' }))
    const play = screen.getByRole('button', { name: 'Play timeline' })
    act(() => { play.focus() })
    fireEvent.click(play)
    expect(document.querySelector('.shell')!.getAttribute('data-sheet')).toBe('peek')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause map playback' }))
    act(() => { vi.advanceTimersByTime(1_000) })
    fireEvent.click(screen.getByRole('button', { name: 'Pause map playback' }))
    const year = (slider() as HTMLInputElement).value
    act(() => { vi.advanceTimersByTime(2_000) })
    expect((slider() as HTMLInputElement).value).toBe(year)
    fireEvent.click(screen.getByRole('button', { name: 'Play map playback' }))
    act(() => { vi.advanceTimersByTime(2_000) })
    expect(Number((slider() as HTMLInputElement).value)).toBeGreaterThan(Number(year))
    expect(fill('MX-SON')).toBe('rgba(0, 0, 0, 0)')
  })
})
