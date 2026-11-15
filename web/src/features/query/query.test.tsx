import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterRegions, NO_MATCH, normalize } from './search'
import type { RegionInfo } from '../../lib/data'
import { fixtureFetch, TREND_FIXTURES } from '../../lib/testing/fixtures'

// Fixtures sintéticos compartidos de 002 (nunca web/public/data/trends/, que es de 003 y cambia).
const serveFixtures = () => vi.stubGlobal('fetch', vi.fn(fixtureFetch()))

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

beforeEach(() => serveFixtures())
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
    const input = screen.getByRole('combobox', { name: 'Search for a state' })
    input.focus()
    fireEvent.change(input, { target: { value: 'sono' } })
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const option = screen.getByRole('option', { name: 'Sonora' })
    expect(input.getAttribute('aria-activedescendant')).toBe(option.id)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(regionInUrl()).toBe('MX-SON')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect((input as HTMLInputElement).value).toBe('Sonora')
    expect(document.activeElement).toBe(input)
  })

  it('elegir una opción con tacto libera el campo para cerrar el teclado del teléfono', async () => {
    await renderQuery()
    const input = screen.getByRole('combobox', { name: 'Search for a state' })
    input.focus()
    fireEvent.change(input, { target: { value: 'Sonora' } })
    const option = screen.getByRole('option', { name: 'Sonora' })
    fireEvent(option, Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType: 'touch' }))
    fireEvent.mouseDown(option)
    expect(regionInUrl()).toBe('MX-SON')
    expect(document.activeElement).not.toBe(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('agrupa por país y se recorre con flechas, Inicio y Fin', async () => {
    await renderQuery()
    const input = screen.getByRole('combobox', { name: 'Search for a state' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('group', { name: 'Mexico' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'United States' })).toBeTruthy()
    const options = within(screen.getByRole('listbox', { name: 'States' })).getAllByRole('option')
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
    const input = screen.getByRole('combobox', { name: 'Search for a state' })
    fireEvent.change(input, { target: { value: 'atlantida' } })
    expect(document.querySelectorAll('[role="listbox"] [role="option"]')).toHaveLength(0)
    expect(screen.getByRole('status').textContent).toBe(NO_MATCH)
    expect(screen.getAllByText(NO_MATCH).length).toBeGreaterThan(0)
  })

  it('Escape cierra la lista y vuelve a mostrar el estado elegido', async () => {
    await renderQuery('?region=MX-BCN')
    const input = screen.getByRole('combobox', { name: 'Search for a state' }) as HTMLInputElement
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
    const input = screen.getByRole('combobox', { name: 'Search for a state' }) as HTMLInputElement
    expect(input.value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Texas en el globo' }))
    expect(input.value).toBe('Texas')
  })
})

describe('VariablePicker (T002)', () => {
  it('ofrece todas las variables del catálogo y cambia la de la URL', async () => {
    const catalog = JSON.parse(TREND_FIXTURES['data/trends/catalog.json'])
    await renderQuery()
    const select = screen.getByRole('combobox', { name: 'Variable' }) as HTMLSelectElement
    await vi.waitFor(() => expect(select.options).toHaveLength(catalog.variables.length))
    expect([...select.options].map(o => o.value)).toEqual(catalog.variables.map((v: { id: string }) => v.id))
    expect(select.value).toBe('air_temperature')
    fireEvent.change(select, { target: { value: 'precipitation' } })
    expect(select.value).toBe('precipitation')
    expect(varInUrl()).toBe('precipitation')
  })

  it('la definición se abre y se cierra sin salir de la pantalla', async () => {
    await renderQuery()
    const info = screen.getByRole('button', { name: /What is air temperature/ })
    expect(info.getAttribute('aria-expanded')).toBe('false')
    const definition = document.getElementById(info.getAttribute('aria-controls')!)!
    expect(definition.hidden).toBe(true)
    fireEvent.click(info)
    expect(info.getAttribute('aria-expanded')).toBe('true')
    expect(definition.hidden).toBe(false)
    expect(definition.textContent).toMatch(/Air temperature:/)
    fireEvent.keyDown(info, { key: 'Escape' })
    expect(definition.hidden).toBe(true)
  })

  it('la definición incluye unidad, origen y años leídos del catálogo (FR-001, T013)', async () => {
    const catalog = JSON.parse(TREND_FIXTURES['data/trends/catalog.json'])
    const temp = catalog.variables.find((v: { id: string }) => v.id === 'air_temperature')
    await renderQuery()
    fireEvent.click(screen.getByRole('button', { name: /What is air temperature/ }))
    const definition = document.getElementById(
      screen.getByRole('button', { name: /What is air temperature/ }).getAttribute('aria-controls')!,
    )!
    const text = definition.textContent ?? ''
    expect(text).toContain(`Unit${temp.unit_annual} (yearly mean)`)
    expect(text).toMatch(/Sourcereanalysis/)
    expect(text).toContain(temp.product_short_name)
    expect(text).toContain(`Years${temp.first_year}–${temp.last_complete_year}`)
  })

  it('se puede leer por dentro y cierra al tocar fuera, incluso en una zona sin foco', async () => {
    await renderQuery()
    const info = screen.getByRole('button', { name: /What is air temperature/ })
    fireEvent.click(info)
    const details = screen.getByRole('region', { name: 'Variable details' })
    fireEvent.pointerDown(within(details).getByText('Unit'))
    expect(info.getAttribute('aria-expanded')).toBe('true')
    fireEvent.pointerDown(document.body)
    expect(info.getAttribute('aria-expanded')).toBe('false')
    expect(details.hidden).toBe(true)
    expect(regionInUrl()).toBeNull()
  })

  it('su cierre visible devuelve el foco al botón de información', async () => {
    await renderQuery()
    const info = screen.getByRole('button', { name: /What is air temperature/ })
    fireEvent.click(info)
    fireEvent.click(screen.getByRole('button', { name: 'Close variable details' }))
    expect(info.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(info)
  })

  it('al salir con el teclado cierra el popup y conserva el foco de destino', async () => {
    await renderQuery()
    const info = screen.getByRole('button', { name: /What is air temperature/ })
    const search = screen.getByRole('combobox', { name: 'Search for a state' })
    fireEvent.click(info)
    act(() => { screen.getByRole('button', { name: 'Close variable details' }).focus() })
    expect(info.getAttribute('aria-expanded')).toBe('true')
    act(() => { search.focus() })
    expect(info.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(search)
  })

  it('cambiar de variable también cierra su definición', async () => {
    await renderQuery()
    fireEvent.click(screen.getByRole('button', { name: /What is air temperature/ }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Variable' }), { target: { value: 'precipitation' } })
    expect(varInUrl()).toBe('precipitation')
    expect(screen.getByRole('button', { name: /What is precipitation/ }).getAttribute('aria-expanded')).toBe('false')
  })
})
