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
  const entry = screen.getByRole('button', { name: /Modo detective/ })
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

    expect(document.activeElement).toBe(heading(/¿Qué parte del clima te interesa\?/))
    // Solo grupos con temas publicados: los fixtures tienen temperatura (Calor y frío) y precipitación (Agua).
    expect(button(/Calor y frío/)).toBeTruthy()
    expect(button(/^💧 Agua|Agua/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Lo que flota en el aire/ })).toBeNull()
    fireEvent.click(button(/Calor y frío/))

    expect(document.activeElement).toBe(heading(/¿Qué cambio quieres investigar\?/))
    expect(screen.getAllByText(/Pregunta 1 de 3/)).toHaveLength(1)
    expect(button(/Hace más calor/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /noches son menos frías/ })).toBeNull()
    fireEvent.click(button(/Hace más calor/))

    expect(document.activeElement).toBe(heading(/¿Dónde quieres investigarlo\?/))
    for (const name of [/Desierto/, /Trópico húmedo/, /Zona agrícola/, /Frío o montaña/, /Noreste de EE\. UU\./]) {
      expect(button(name)).toBeTruthy()
    }
    // Ningún tipo de lugar es una ciudad ni «donde más cambia» (CDMX solo aparece como estado en la lista).
    expect(screen.queryByRole('button', { name: /ciudad/i })).toBeNull()
    expect(screen.queryByText(/más cambia/i)).toBeNull()
    fireEvent.click(button(/Desierto/))

    expect(document.activeElement).toBe(heading(/¿Qué crees que pasó/))
    expect(heading(/pasó con la temperatura del aire en Sonora entre 1980 y 2025/)).toBeTruthy()
    fireEvent.click(button(/^Aumentó$/))

    expect(document.activeElement).toBe(heading(/Lo que muestran los datos/))
    // En los fixtures, MX-SON · temperatura 1980–2025 es «inconclusive».
    await screen.findByText('Sin evidencia suficiente')
    expect(screen.getByText(/Todavía no se puede saber si acertaste/)).toBeTruthy()
    expect(screen.getByText(/1980–2025 · 46\saños/)).toBeTruthy()

    fireEvent.click(button(/análisis completo/))
    expect(urlParam('region')).toBe('MX-SON')
    expect(urlParam('var')).toBe('air_temperature')
  })

  it('«Atrás» vuelve al paso anterior y «Salir» devuelve el foco al botón de entrada', async () => {
    const { entry } = await renderDetective()
    fireEvent.click(entry)
    fireEvent.click(button(/Agua/))
    fireEvent.click(button(/Llueve más o menos/))
    fireEvent.click(button(/Atrás/))
    expect(document.activeElement).toBe(heading(/¿Qué cambio quieres investigar\?/))
    fireEvent.click(button(/Atrás/))
    expect(document.activeElement).toBe(heading(/¿Qué parte del clima te interesa\?/))
    fireEvent.click(button(/Salir/))
    expect(document.activeElement).toBe(button(/Modo detective/))
  })

  it('la lista de estados tiene las regiones del catálogo agrupadas por país', async () => {
    const { entry } = await renderDetective()
    fireEvent.click(entry)
    fireEvent.click(button(/Calor y frío/))
    fireEvent.click(button(/Hace más calor/))
    const select = screen.getByRole('combobox', { name: /elige un estado de México o Estados Unidos/ })
    expect(select.querySelectorAll('option[value]:not([value=""])')).toHaveLength(catalog.regions.length)
    expect([...select.querySelectorAll('optgroup')].map(g => g.label)).toEqual(['México', 'Estados Unidos'])
    fireEvent.change(select, { target: { value: 'MX-BCN' } })
    fireEvent.click(button(/Continuar/))
    expect(heading(/en Baja California entre/)).toBeTruthy()
  })

  it('si falla la carga de la serie muestra «Reintentar» y no inventa resultado', async () => {
    const { entry } = await renderDetective(() => 0, { 'data/trends/series/air_temperature/MX-SON.json': null })
    fireEvent.click(entry)
    fireEvent.click(button(/Calor y frío/))
    fireEvent.click(button(/Hace más calor/))
    fireEvent.click(button(/Desierto/))
    fireEvent.click(button(/^No sé$/))
    expect((await screen.findByRole('alert')).textContent).toMatch(/No pudimos cargar/)
    expect(button(/Reintentar/)).toBeTruthy()
    expect(screen.queryByText('Sin evidencia suficiente')).toBeNull()
  })

  it('«Sorpréndeme» está en la pantalla de grupos y no repite el caso anterior (T015)', async () => {
    const { entry } = await renderDetective(() => 0)
    fireEvent.click(entry)
    fireEvent.click(button(/Sorpréndeme/))
    expect(document.activeElement).toBe(heading(/¿Qué crees que pasó/))
    expect(heading(/pasó con la lluvia en Hidalgo/)).toBeTruthy()

    fireEvent.click(button(/Atrás/))
    expect(document.activeElement).toBe(heading(/¿Qué parte del clima te interesa\?/))
    fireEvent.click(button(/Sorpréndeme/))
    expect(screen.queryByRole('heading', { name: /en Hidalgo/ })).toBeNull()
    expect(heading(/en Veracruz/)).toBeTruthy()
  })

  it('desactiva un tipo de lugar si ninguna de sus regiones tiene dato de la variable (T020)', async () => {
    const map = JSON.parse(TREND_FIXTURES['data/trends/map/air_temperature.json'])
    const full = map.windows['1980-2025'] as (number | null)[]
    for (const id of ['MX-SON', 'US-AZ', 'US-NV']) full[map.regions.indexOf(id)] = null
    const { entry } = await renderDetective(() => 0, { 'data/trends/map/air_temperature.json': map })
    fireEvent.click(entry)
    fireEvent.click(button(/Calor y frío/))
    fireEvent.click(button(/Hace más calor/))
    const desert = button(/Desierto/) as HTMLButtonElement
    await waitFor(() => expect(desert.disabled).toBe(true))
    expect(desert.textContent).toMatch(/No hay datos de este tema/)
    expect((button(/Trópico húmedo/) as HTMLButtonElement).disabled).toBe(false)
  })

  it('la nieve solo ofrece lugares fríos y estados de EE. UU. (FR-E17)', async () => {
    const { entry } = await renderDetective(() => 0, { 'data/trends/catalog.json': catalogWith('snow_water_equivalent') })
    fireEvent.click(entry)
    fireEvent.click(button(/Agua/))
    fireEvent.click(button(/Hay menos nieve/))
    for (const name of [/Frío o montaña/, /Noreste de EE\. UU\./, /Costa del Pacífico/]) expect(button(name)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Desierto/ })).toBeNull()
    const select = screen.getByRole('combobox', { name: /elige un estado de Estados Unidos/ })
    expect([...select.querySelectorAll('optgroup')].map(g => g.label)).toEqual(['Estados Unidos'])
    expect(select.querySelector('option[value^="MX-"]')).toBeNull()
  })

  it('ofrece «un lugar donde pasó lo contrario» solo si los archivos lo confirman (T030, FR-E19)', async () => {
    const files = (tla: string) => ({
      'data/trends/catalog.json': catalogWith('soil_moisture'),
      'data/trends/series/soil_moisture/MX-BCN.json': seriesWith('soil_moisture', 'MX-BCN', 'increasing'),
      'data/trends/series/soil_moisture/MX-TLA.json': seriesWith('soil_moisture', 'MX-TLA', tla),
    })
    const reach = async () => {
      fireEvent.click(button(/Agua/))
      fireEvent.click(button(/tierra está más seca/))
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MX-BCN' } })
      fireEvent.click(button(/Continuar/))
      fireEvent.click(button(/^Aumentó$/))
      await screen.findByText(/¡Acertaste!/)
    }

    let { entry } = await renderDetective(() => 0, files('decreasing'))
    fireEvent.click(entry)
    await reach()
    const action = await screen.findByRole('button', { name: /Investigar Tlaxcala/ })
    expect(screen.getByText(/En Tlaxcala, la tendencia de la humedad del suelo fue en la dirección contraria/)).toBeTruthy()
    expect(screen.getByText(/dirección contraria/).textContent).not.toMatch(/porque|debido a|causa/i)
    fireEvent.click(action)
    expect(document.activeElement).toBe(heading(/¿Qué crees que pasó con la humedad del suelo en Tlaxcala/))

    cleanup()
    ;({ entry } = await renderDetective(() => 0, files('inconclusive')))
    fireEvent.click(entry)
    await reach()
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(screen.queryByRole('button', { name: /Investigar Tlaxcala/ })).toBeNull()
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
    expect(document.activeElement).toBe(heading(/¿Qué parte del clima te interesa\?/))
    const group = button(/Calor y frío/); group.focus(); fireEvent.click(group)
    operable()
    expect(document.activeElement).toBe(heading(/¿Qué cambio quieres investigar\?/))
    const topic = button(/Hace más calor/); topic.focus(); fireEvent.click(topic)
    operable()
    expect(document.activeElement).toBe(heading(/¿Dónde quieres investigarlo\?/))
    const select = screen.getByRole('combobox', { name: /elige un estado de México o Estados Unidos/ }) as HTMLSelectElement
    select.focus(); fireEvent.change(select, { target: { value: 'MX-SON' } })
    fireEvent.submit(select.form!)
    operable()
    expect(document.activeElement).toBe(heading(/¿Qué crees que pasó/))
    const p = button(/^Disminuyó$/); p.focus(); fireEvent.click(p)
    expect(document.activeElement).toBe(heading(/Lo que muestran los datos/))
    expect(await screen.findByRole('button', { name: /análisis completo/ })).toBeTruthy()
  })

  it('si falla el catálogo, el botón de entrada queda desactivado con el motivo (T016)', async () => {
    vi.stubGlobal('fetch', vi.fn(fixtureFetch({ overrides: { 'data/trends/catalog.json': null } })))
    vi.resetModules()
    ;(await import('../../../lib/data')).clearDataCache()
    const { default: DetectiveMode } = await import('./DetectiveMode')
    await act(async () => { render(<DetectiveMode />) })
    expect(await screen.findByText(/no pudimos cargar la lista de datos/)).toBeTruthy()
    expect((button(/Modo detective/) as HTMLButtonElement).disabled).toBe(true)
  })
})
