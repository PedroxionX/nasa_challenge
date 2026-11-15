// Recorrido del modo detective (008 T011, T015, T031) con los fixtures sintéticos compartidos de 002.
// Los fixtures solo tienen temperatura y precipitación, y series de MX-BCN, MX-CMX, MX-SON y US-TX: el recorrido
// va por Calor y frío → temperatura → Desierto → MX-SON. Las variables nuevas se añaden al catálogo con overrides.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Catalog } from '../../../lib/data'
import { fixtureFetch, TREND_FIXTURES } from '../../../lib/testing/fixtures'

const catalog = JSON.parse(TREND_FIXTURES['data/trends/catalog.json']) as Catalog

async function renderDetective(rand: () => number = () => 0, overrides?: Record<string, string | object | null>) {
  vi.stubGlobal('fetch', vi.fn(fixtureFetch({ overrides })))
  window.history.replaceState(null, '', '/')
  vi.resetModules()
  const state = await import('../../../app/state')
  ;(await import('../../../lib/data')).clearDataCache()
  state.configureState({ firstYear: 1980, lastYear: 2025, regionIds: catalog.regions.map(r => r.id) })
  const { default: DetectiveMode } = await import('./DetectiveMode')
  await act(async () => { render(<DetectiveMode rand={rand} />) })
  const entry = screen.getByRole('button', { name: /Detective mode/ })
  await waitFor(() => expect((entry as HTMLButtonElement).disabled).toBe(false))
  return { entry }
}

const heading = (name: RegExp) => screen.getByRole('heading', { name })
const button = (name: RegExp) => screen.getByRole('button', { name })
const urlParam = (k: string) => new URLSearchParams(window.location.search).get(k)

/** Catálogo de los fixtures con variables extra, copiando la definición de precipitación (periodo 2001–2025). */
function catalogWith(...ids: string[]) {
  const precip = catalog.variables.find(v => v.id === 'precipitation')!
  return { ...catalog, variables: [...catalog.variables, ...ids.map(id => ({ ...precip, id, label: id }))] }
}

/** Serie de precipitación de los fixtures, con otra variable, región y estado en la ventana completa 2001–2025. */
function seriesWith(variableId: string, regionId: string, status: string) {
  const s = JSON.parse(TREND_FIXTURES['data/trends/series/precipitation/MX-BCN.json'])
  const cols = s.windows.columns as string[]
  const row = (s.windows.rows as unknown[][]).find(r => r[cols.indexOf('start')] === 2001 && r[cols.indexOf('end')] === 2025)!
  row[cols.indexOf('status')] = status
  return { ...s, variable: variableId, region: regionId }
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
beforeEach(() => { window.history.replaceState(null, '', '/') })

describe('DetectiveMode (008)', () => {
  it('recorre grupo → tema → lugar → predicción → revelación y abre el análisis', async () => {
    const { entry } = await renderDetective()
    fireEvent.click(entry)

    expect(document.activeElement).toBe(heading(/Which part of the climate interests you\?/))
    // Solo grupos con temas publicados: los fixtures tienen temperatura (Calor y frío) y precipitación (Agua).
    expect(button(/Heat and cold/)).toBeTruthy()
    expect(button(/^Water/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /What floats in the air/ })).toBeNull()
    fireEvent.click(button(/Heat and cold/))

    expect(document.activeElement).toBe(heading(/Which change do you want to investigate\?/))
    expect(screen.getAllByText(/Question 1 of 3/)).toHaveLength(1)
    expect(button(/Is it hotter/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /nights less cold/ })).toBeNull()
    fireEvent.click(button(/Is it hotter/))

    expect(document.activeElement).toBe(heading(/Where do you want to investigate it\?/))
    for (const name of [/Desert/, /Humid tropics/, /Farmland/, /Cold or mountains/, /US Northeast/]) {
      expect(button(name)).toBeTruthy()
    }
    // Ningún tipo de lugar es una ciudad ni «donde más cambia» (CDMX solo aparece como estado en la lista).
    expect(screen.queryByRole('button', { name: /city/i })).toBeNull()
    expect(screen.queryByText(/changes the most/i)).toBeNull()
    fireEvent.click(button(/Desert/))

    expect(document.activeElement).toBe(heading(/What do you think happened/))
    expect(heading(/happened to air temperature in Sonora between 1980 and 2025/)).toBeTruthy()
    fireEvent.click(button(/^It increased$/))

    expect(document.activeElement).toBe(heading(/What the data show/))
    // En los fixtures, MX-SON · temperatura 1980–2025 es «inconclusive».
    await screen.findByText('Not enough evidence')
    expect(screen.getByText(/We cannot tell yet whether you got it right/)).toBeTruthy()
    expect(screen.getByText(/1980–2025 · 46\syears/)).toBeTruthy()

    fireEvent.click(button(/full analysis/))
    expect(urlParam('region')).toBe('MX-SON')
    expect(urlParam('var')).toBe('air_temperature')
  })

  it('«Atrás» vuelve al paso anterior y «Salir» devuelve el foco al botón de entrada', async () => {
    const { entry } = await renderDetective()
    fireEvent.click(entry)
    fireEvent.click(button(/^Water/))
    fireEvent.click(button(/Does it rain more or less/))
    fireEvent.click(button(/Back/))
    expect(document.activeElement).toBe(heading(/Which change do you want to investigate\?/))
    fireEvent.click(button(/Back/))
    expect(document.activeElement).toBe(heading(/Which part of the climate interests you\?/))
    fireEvent.click(button(/Exit/))
    expect(document.activeElement).toBe(button(/Detective mode/))
  })

  it('la lista de estados tiene las regiones del catálogo agrupadas por país', async () => {
    const { entry } = await renderDetective()
    fireEvent.click(entry)
    fireEvent.click(button(/Heat and cold/))
    fireEvent.click(button(/Is it hotter/))
    const select = screen.getByRole('combobox', { name: /pick a state of Mexico or the United States/i })
    expect(select.querySelectorAll('option[value]:not([value=""])')).toHaveLength(catalog.regions.length)
    expect([...select.querySelectorAll('optgroup')].map(g => g.label)).toEqual(['Mexico', 'United States'])
    fireEvent.change(select, { target: { value: 'MX-BCN' } })
    fireEvent.click(button(/Continue/))
    expect(heading(/in Baja California between/)).toBeTruthy()
  })

  it('si falla la carga de la serie muestra «Reintentar» y no inventa resultado', async () => {
    const { entry } = await renderDetective(() => 0, { 'data/trends/series/air_temperature/MX-SON.json': null })
    fireEvent.click(entry)
    fireEvent.click(button(/Heat and cold/))
    fireEvent.click(button(/Is it hotter/))
    fireEvent.click(button(/Desert/))
    fireEvent.click(button(/^Not sure$/))
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not load/)
    expect(button(/Retry/)).toBeTruthy()
    expect(screen.queryByText('Not enough evidence')).toBeNull()
  })

  it('«Sorpréndeme» está en la pantalla de grupos y no repite el caso anterior (T015)', async () => {
    const { entry } = await renderDetective(() => 0)
    fireEvent.click(entry)
    fireEvent.click(button(/Surprise me/))
    expect(document.activeElement).toBe(heading(/What do you think happened/))
    expect(heading(/happened to rainfall in Hidalgo/)).toBeTruthy()

    fireEvent.click(button(/Back/))
    expect(document.activeElement).toBe(heading(/Which part of the climate interests you\?/))
    fireEvent.click(button(/Surprise me/))
    expect(screen.queryByRole('heading', { name: /in Hidalgo/ })).toBeNull()
    expect(heading(/in Veracruz/)).toBeTruthy()
  })

  it('desactiva un tipo de lugar si ninguna de sus regiones tiene dato de la variable (T020)', async () => {
    const map = JSON.parse(TREND_FIXTURES['data/trends/map/air_temperature.json'])
    const full = map.windows['1980-2025'] as (number | null)[]
    for (const id of ['MX-SON', 'US-AZ', 'US-NV']) full[map.regions.indexOf(id)] = null
    const { entry } = await renderDetective(() => 0, { 'data/trends/map/air_temperature.json': map })
    fireEvent.click(entry)
    fireEvent.click(button(/Heat and cold/))
    fireEvent.click(button(/Is it hotter/))
    const desert = button(/Desert/) as HTMLButtonElement
    await waitFor(() => expect(desert.disabled).toBe(true))
    expect(desert.textContent).toMatch(/There are no data on this topic/)
    expect((button(/Humid tropics/) as HTMLButtonElement).disabled).toBe(false)
  })

  it('la nieve solo ofrece lugares fríos y estados de EE. UU. (FR-E17)', async () => {
    const { entry } = await renderDetective(() => 0, { 'data/trends/catalog.json': catalogWith('snow_water_equivalent') })
    fireEvent.click(entry)
    fireEvent.click(button(/^Water/))
    fireEvent.click(button(/Is there less snow/))
    for (const name of [/Cold or mountains/, /US Northeast/, /US Pacific coast/]) expect(button(name)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Desert/ })).toBeNull()
    const select = screen.getByRole('combobox', { name: /pick a US state/i })
    expect([...select.querySelectorAll('optgroup')].map(g => g.label)).toEqual(['United States'])
    expect(select.querySelector('option[value^="MX-"]')).toBeNull()
  })

  it('ofrece «un lugar donde pasó lo contrario» solo si los archivos lo confirman (T030, FR-E19)', async () => {
    const files = (tla: string) => ({
      'data/trends/catalog.json': catalogWith('soil_moisture'),
      'data/trends/series/soil_moisture/MX-BCN.json': seriesWith('soil_moisture', 'MX-BCN', 'increasing'),
      'data/trends/series/soil_moisture/MX-TLA.json': seriesWith('soil_moisture', 'MX-TLA', tla),
    })
    const reach = async () => {
      fireEvent.click(button(/^Water/))
      fireEvent.click(button(/ground drier/))
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MX-BCN' } })
      fireEvent.click(button(/Continue/))
      fireEvent.click(button(/^It increased$/))
      await screen.findByText(/You got it!/)
    }

    let { entry } = await renderDetective(() => 0, files('decreasing'))
    fireEvent.click(entry)
    await reach()
    const action = await screen.findByRole('button', { name: /Investigate Tlaxcala/ })
    expect(screen.getByText(/In Tlaxcala, the trend in soil moisture went the opposite way/)).toBeTruthy()
    expect(screen.getByText(/opposite way/).textContent).not.toMatch(/because|due to|cause/i)
    fireEvent.click(action)
    expect(document.activeElement).toBe(heading(/What do you think happened to soil moisture in Tlaxcala/))

    cleanup()
    ;({ entry } = await renderDetective(() => 0, files('inconclusive')))
    fireEvent.click(entry)
    await reach()
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(screen.queryByRole('button', { name: /Investigate Tlaxcala/ })).toBeNull()
  })

  it('todo el recorrido usa controles nativos alcanzables con Tab y mueve el foco a cada paso (T021, SC-E02)', async () => {
    // jsdom no simula Tab ni la activación con Enter/Espacio (haría falta @testing-library/user-event, una
    // dependencia que decide 002). Se comprueba lo que la hace posible: solo <button>/<select> nativos, ninguno
    // fuera del orden de tabulación, y el foco en el título de cada paso. Enter/Espacio en un <button> es click.
    const { entry } = await renderDetective()
    const operable = () => {
      const flow = document.querySelector('.detective-flow')!
      const clickable = [...flow.querySelectorAll('[onclick], [role="button"], div[tabindex], span[tabindex]')]
      expect(clickable).toHaveLength(0)
      for (const el of flow.querySelectorAll('button, select')) expect((el as HTMLElement).tabIndex).toBeGreaterThanOrEqual(0)
    }
    entry.focus(); fireEvent.click(entry)
    operable()
    expect(document.activeElement).toBe(heading(/Which part of the climate interests you\?/))
    const group = button(/Heat and cold/); group.focus(); fireEvent.click(group)
    operable()
    expect(document.activeElement).toBe(heading(/Which change do you want to investigate\?/))
    const topic = button(/Is it hotter/); topic.focus(); fireEvent.click(topic)
    operable()
    expect(document.activeElement).toBe(heading(/Where do you want to investigate it\?/))
    const select = screen.getByRole('combobox', { name: /pick a state of Mexico or the United States/i }) as HTMLSelectElement
    select.focus(); fireEvent.change(select, { target: { value: 'MX-SON' } })
    fireEvent.submit(select.form!)
    operable()
    expect(document.activeElement).toBe(heading(/What do you think happened/))
    const p = button(/^It decreased$/); p.focus(); fireEvent.click(p)
    expect(document.activeElement).toBe(heading(/What the data show/))
    expect(await screen.findByRole('button', { name: /full analysis/ })).toBeTruthy()
  })

  it('si falla el catálogo, el botón de entrada queda desactivado con el motivo (T016)', async () => {
    vi.stubGlobal('fetch', vi.fn(fixtureFetch({ overrides: { 'data/trends/catalog.json': null } })))
    vi.resetModules()
    ;(await import('../../../lib/data')).clearDataCache()
    const { default: DetectiveMode } = await import('./DetectiveMode')
    await act(async () => { render(<DetectiveMode />) })
    expect(await screen.findByText(/could not load the data list/)).toBeTruthy()
    expect((button(/Detective mode/) as HTMLButtonElement).disabled).toBe(true)
  })
})
