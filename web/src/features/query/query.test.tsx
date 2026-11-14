import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterRegions, NO_MATCH, normalize } from './search'
import type { RegionInfo } from '../../lib/data'

// Sirve web/public/data/trends/ como el servidor de Vite (mismo patrón que app/Shell.test.tsx).
const FILES = import.meta.glob('../../../public/data/trends/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
function serveFromPublic() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = decodeURIComponent(String(input).replace(/^\/+/, ''))
    const body = FILES[`../../../public/${path}`]
    return body === undefined
      ? new Response('', { status: 404 })
      : new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
}

/** Monta QueryBar con un estado nuevo leído de la URL y devuelve ese mismo módulo de estado. */
async function renderQuery(search = '') {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  const { default: QueryBar } = await import('./QueryBar')
  const state = await import('../../app/state')
  ;(await import('../../lib/data')).clearDataCache()
  await act(async () => { render(<QueryBar />) })
  return { state }
}

const regionInUrl = () => new URLSearchParams(window.location.search).get('region')
const varInUrl = () => new URLSearchParams(window.location.search).get('var')

beforeEach(() => serveFromPublic())
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('filterRegions', () => {
  const regions: RegionInfo[] = [
    { id: 'MX-NLE', name: 'Nuevo León', country: 'MX', n_cells: 1, small_region: false },
    { id: 'US-NM', name: 'Nuevo México', country: 'US', n_cells: 1, small_region: false },
    { id: 'MX-SON', name: 'Sonora', country: 'MX', n_cells: 1, small_region: false },
    { id: 'MX-BCN', name: 'Baja California', country: 'MX', n_cells: 1, small_region: false },
  ]

  it('ignora acentos y mayúsculas', () => {
    expect(normalize('  Nuevo LEÓN ')).toBe('nuevo leon')
    expect(filterRegions(regions, 'nuevo leon').map(r => r.id)).toEqual(['MX-NLE'])
  })

  it('busca también por clave', () => {
    expect(filterRegions(regions, 'bcn').map(r => r.id)).toEqual(['MX-BCN'])
  })

  it('pone primero los que empiezan por el texto', () => {
    expect(filterRegions(regions, 'so').map(r => r.id)).toEqual(['MX-SON'])
    expect(filterRegions(regions, 'o')[0].id).toBe('MX-NLE')
  })
})

describe('RegionSearch (T001)', () => {
  it('se elige «Sonora» solo con teclado', async () => {
    await renderQuery()
    const input = screen.getByRole('combobox', { name: 'Buscar un estado' })
    input.focus()
    fireEvent.change(input, { target: { value: 'sono' } })
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const option = screen.getByRole('option', { name: 'Sonora' })
    expect(input.getAttribute('aria-activedescendant')).toBe(option.id)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(regionInUrl()).toBe('MX-SON')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect((input as HTMLInputElement).value).toBe('Sonora')
  })

  it('agrupa por país y se recorre con flechas, Inicio y Fin', async () => {
    await renderQuery()
    const input = screen.getByRole('combobox', { name: 'Buscar un estado' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('group', { name: 'México' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Estados Unidos' })).toBeTruthy()
    const options = screen.getAllByRole('option')
    expect(options.length).toBe(84)
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id)
    fireEvent.keyDown(input, { key: 'End' })
    expect(input.getAttribute('aria-activedescendant')).toBe(options[83].id)
    fireEvent.keyDown(input, { key: 'Home' })
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)
  })

  it('sin coincidencias muestra el texto de ux.md §7 y lo anuncia', async () => {
    await renderQuery()
    const input = screen.getByRole('combobox', { name: 'Buscar un estado' })
    fireEvent.change(input, { target: { value: 'atlantida' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('status').textContent).toBe(NO_MATCH)
    expect(screen.getAllByText(NO_MATCH).length).toBeGreaterThan(0)
  })

  it('Escape cierra la lista y vuelve a mostrar el estado elegido', async () => {
    await renderQuery('?region=MX-BCN')
    const input = screen.getByRole('combobox', { name: 'Buscar un estado' }) as HTMLInputElement
    expect(input.value).toBe('Baja California')
    fireEvent.change(input, { target: { value: 'tex' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.value).toBe('Baja California')
    expect(regionInUrl()).toBe('MX-BCN')
  })

  it('refleja una región elegida desde fuera (como el globo)', async () => {
    const { state } = await renderQuery()
    // Otra zona que escribe en el estado compartido, como hace el globo al tocar un estado.
    function FakeGlobe() {
      const { setRegion } = state.useAppState()
      return <button type="button" onClick={() => setRegion('US-TX')}>Texas en el globo</button>
    }
    await act(async () => { render(<FakeGlobe />) })
    const input = screen.getByRole('combobox', { name: 'Buscar un estado' }) as HTMLInputElement
    expect(input.value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Texas en el globo' }))
    expect(input.value).toBe('Texas')
  })
})

describe('VariablePicker (T002)', () => {
  it('ofrece dos variables y se cambia con flechas de teclado', async () => {
    await renderQuery()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'Variable' })).toBeTruthy()
    const [temp, prec] = radios as HTMLInputElement[]
    expect(temp.checked).toBe(true)
    fireEvent.click(prec) // los radios nativos convierten ← → en «click» en el navegador
    expect(prec.checked).toBe(true)
    expect(varInUrl()).toBe('precipitation')
  })

  it('la definición se abre y se cierra sin salir de la pantalla', async () => {
    await renderQuery()
    const info = screen.getByRole('button', { name: /Qué es temperatura del aire/ })
    expect(info.getAttribute('aria-expanded')).toBe('false')
    const definition = document.getElementById(info.getAttribute('aria-controls')!)!
    expect(definition.hidden).toBe(true)
    fireEvent.click(info)
    expect(info.getAttribute('aria-expanded')).toBe('true')
    expect(definition.hidden).toBe(false)
    expect(definition.textContent).toMatch(/Temperatura del aire:/)
    fireEvent.keyDown(info, { key: 'Escape' })
    expect(definition.hidden).toBe(true)
  })

  it('la definición incluye unidad, origen y años leídos del catálogo (FR-001, T013)', async () => {
    const catalog = JSON.parse(FILES['../../../public/data/trends/catalog.json'])
    const temp = catalog.variables.find((v: { id: string }) => v.id === 'air_temperature')
    await renderQuery()
    fireEvent.click(screen.getByRole('button', { name: /Qué es temperatura del aire/ }))
    const definition = document.getElementById(
      screen.getByRole('button', { name: /Qué es temperatura del aire/ }).getAttribute('aria-controls')!,
    )!
    const text = definition.textContent ?? ''
    expect(text).toContain(`Unidad${temp.unit_annual} (promedio anual)`)
    expect(text).toMatch(/Origenreanálisis/)
    expect(text).toContain(temp.product_short_name)
    expect(text).toContain(`Años${temp.first_year}–${temp.last_complete_year}`)
  })
})
