import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeriesFile } from '../../lib/data'
import { fixtureFetch, TREND_FIXTURES } from '../../lib/testing/fixtures'
import { configureLikeShell, withoutOptionalColumns } from './testData'

// Fixtures sintéticos compartidos de 002 (nunca web/public/data/trends/, que es de 003 y cambia).
// `overrides`: cuerpo que sustituye un archivo, o un código HTTP para simular un fallo del servidor.
type Override = string | number
let overrides: Record<string, Override> = {}
let requested: string[] = []

function serve() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = decodeURIComponent(String(input).replace(/^\/+/, ''))
    requested.push(path)
    const o = overrides[path]
    if (typeof o === 'number') return new Response('', { status: o })
    const bodies = Object.fromEntries(Object.entries(overrides).filter(([, v]) => typeof v === 'string')) as Record<string, string>
    return fixtureFetch({ overrides: bodies })(input)
  }))
}

async function renderPanel(search: string, withQuery = false) {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  const data = await import('../../lib/data')
  data.clearDataCache()
  const catalogBody = overrides['data/trends/catalog.json'] ?? TREND_FIXTURES['data/trends/catalog.json']
  configureLikeShell(await import('../../app/state'), data, JSON.parse(String(catalogBody)))
  const { default: AnalysisPanel } = await import('./AnalysisPanel')
  const QueryBar = withQuery ? (await import('../query/QueryBar')).default : null
  await act(async () => {
    render(<>{QueryBar && <QueryBar />}<AnalysisPanel /></>)
  })
}

const panel = () => screen.getByRole('article')
const params = () => new URLSearchParams(window.location.search)

beforeEach(() => { overrides = {}; requested = []; serve() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

/** Reglas que todo resultado debe cumplir (SC-A01, FR-A01, FR-A05, constitución II). */
function expectMandatory() {
  const text = panel().textContent ?? ''
  const facts = panel().querySelector<HTMLElement>('.result-facts')!
  for (const label of ['Period', 'Complete years (n)', 'Units', 'Method', 'Source']) {
    expect(within(facts).getByText(label)).toBeTruthy()
  }
  expect(text).toMatch(/α = 0\.05/)
  expect(text).not.toMatch(/years to (be|become) significant/i)
  expect(text).not.toMatch(/fuerte|moderada|clara/i)
  expect(text).not.toMatch(/\d,\d/) // punto decimal (FR-A08)
  expect(screen.getByText(/Synthetic sample data/)).toBeTruthy()
}

describe('AnalysisPanel · los cinco estados (T004)', () => {
  it('increasing: veredicto, cambio, intervalo y evidencia sin calificativos', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    expect(await screen.findByText('Rising')).toBeTruthy()
    expect(screen.getByText('+0.38 °C per decade')).toBeTruthy()
    expect(panel().textContent).toMatch(/\+0\.33 to \+0\.45 °C per decade/)
    expect(screen.getByText(/There is evidence of a trend/)).toBeTruthy()
    expect(screen.getByText('p < 0.001', { selector: 'dfn' })).toBeTruthy()
    expect(screen.getByText('α = 0.05', { selector: 'dfn' })).toBeTruthy()
    expect(within(panel().querySelector<HTMLElement>('.result-facts')!).getByText('46')).toBeTruthy()
    expectMandatory()
  })

  it('decreasing: menos tipográfico y un decimal en mm', async () => {
    await renderPanel('?region=MX-BCN&var=precipitation')
    expect(await screen.findByText('Falling')).toBeTruthy()
    expect(screen.getByText('−30.1 mm per decade')).toBeTruthy()
    expectMandatory()
  })

  it('inconclusive: «Sin evidencia suficiente» con p y α, nunca «no hay cambio»', async () => {
    await renderPanel('?region=MX-SON&var=air_temperature')
    expect(await screen.findAllByText('Not enough evidence')).toHaveLength(2) // veredicto y fila «Evidencia»
    expect(panel().textContent).not.toMatch(/no hay cambio|shows no change|has not changed|is not changing/i)
    expect(screen.getByText(/^p = 0\.\d{3}$/, { selector: 'dfn' })).toBeTruthy()
    expect(screen.getByText('α = 0.05', { selector: 'dfn' })).toBeTruthy()
    expectMandatory()
  })

  it('insufficient: sin pendiente, intervalo ni p', async () => {
    await renderPanel('?region=MX-CMX&var=air_temperature')
    expect(await screen.findByText('Not enough data')).toBeTruthy()
    const text = panel().textContent ?? ''
    expect(text).not.toMatch(/per decade\)?$/m)
    expect(text).not.toMatch(/p [=<]/)
    expect(screen.queryByText('95% interval')).toBeNull()
    expect(text).toMatch(/Fewer than 30 complete years/)
    expectMandatory()
  })

  it('invalid: sin cifras de tendencia y con el escalón explicado', async () => {
    await renderPanel('?region=US-TX&var=air_temperature')
    expect(await screen.findByText('Analysis not valid')).toBeTruthy()
    expect(panel().textContent).not.toMatch(/p [=<]/)
    expect(panel().textContent).toMatch(/abrupt jump around 2001/)
    // La gráfica muestra los valores anuales y explica por qué no hay recta.
    expect(document.querySelector('.trend-chart.is-muted')).not.toBeNull()
    expect(document.querySelector('.trend-chart-notice')?.textContent).toMatch(/No trend line\. The analysis is not valid/)
    expect(document.querySelector('.trend-chart-sen')).toBeNull()
    expectMandatory()
  })
})

describe('AnalysisPanel · términos y supuestos (T012, T014)', () => {
  it('intervalo, p, α y recta de Sen tienen su definición desplegable, accesible con teclado', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Rising')
    for (const name of ['95% interval', 'p-value', 'α (alpha)', 'Sen line']) {
      const buttons = screen.getAllByRole('button', { name: `What “${name}” means` })
      expect(buttons.length).toBeGreaterThan(0)
      const button = buttons[0]
      const definition = document.getElementById(button.getAttribute('aria-controls')!)!
      expect(definition.hidden).toBe(true)
      fireEvent.click(button)
      expect(button.getAttribute('aria-expanded')).toBe('true')
      expect(definition.hidden).toBe(false)
      expect(definition.textContent).toMatch(new RegExp(`^${name.replace(/[()]/g, '\\$&')}:`))
    }
  })

  it('Escape cierra la definición sin cerrar el panel', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Rising')
    const button = screen.getByRole('button', { name: 'What “p-value” means' })
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(params().get('region')).toBe('MX-BCN')
    expect(screen.getByRole('article')).toBeTruthy()
  })

  it('«Detalles técnicos» declara los supuestos del método (FR-012)', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Rising')
    const details = screen.getByText('Technical details').closest('details')!
    expect(within(details).getByText('Assumptions')).toBeTruthy()
    expect(details.textContent).toMatch(/monotonic change/)
    expect(details.textContent).toMatch(/α = 0\.05, set before looking at the data/)
  })
})

describe('AnalysisPanel · carga, error y sin datos (T005)', () => {
  it('región con n_cells 0 en el catálogo: «sin datos» sin pedir su archivo', async () => {
    const catalog = JSON.parse(TREND_FIXTURES['data/trends/catalog.json'])
    catalog.regions.find((r: { id: string }) => r.id === 'MX-JAL').n_cells = 0
    overrides['data/trends/catalog.json'] = JSON.stringify(catalog)
    await renderPanel('?region=MX-JAL&var=air_temperature')
    expect(await screen.findByText('There are no data for this region.')).toBeTruthy()
    expect(requested.some(p => p.includes('series/'))).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('archivo inexistente (el servidor responde index.html): «sin datos», no error', async () => {
    await renderPanel('?region=MX-JAL&var=air_temperature')
    expect(await screen.findByText('There are no data for this region.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('error de red: avisa y se recupera con «Reintentar» sin recargar', async () => {
    overrides['data/trends/series/air_temperature/MX-BCN.json'] = 500
    await renderPanel('?region=MX-BCN&var=air_temperature')
    expect(await screen.findByText('We could not load the data for this state.')).toBeTruthy()
    delete overrides['data/trends/series/air_temperature/MX-BCN.json']
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
    expect(await screen.findByText('Rising')).toBeTruthy()
  })

  it('periodo sin fila (menos de 10 años): «Faltan años» y vuelve al periodo completo', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature&from=2020&to=2025')
    expect(await screen.findByText(/Years are missing/)).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use full period' })) })
    expect(await screen.findByText('Rising')).toBeTruthy()
    expect(params().get('from')).toBe('1980')
  })
})

describe('AnalysisPanel · teclado y anuncio (T006)', () => {
  it('Escape deselecciona la región y devuelve el foco al buscador', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature', true)
    await screen.findByText('Rising')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(params().get('region')).toBeNull())
    await waitFor(() => expect(document.activeElement?.id).toBe('region-search'))
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('tras cambiar el periodo, Escape devuelve el foco en el acto (sin esperar a un cuadro de animación)', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature', true)
    await screen.findByText('Rising')
    const desde = screen.getByRole('combobox', { name: 'From' }) as HTMLSelectElement
    desde.focus()
    await act(async () => { fireEvent.change(desde, { target: { value: '2000' } }) })
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    act(() => { fireEvent.keyDown(desde, { key: 'Escape' }) })
    expect(document.activeElement?.id).toBe('region-search')
    expect(params().get('region')).toBeNull()
    expect(raf).not.toHaveBeenCalled()
  })

  it('el resultado se anuncia en una región viva', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Rising')
    const live = screen.getByRole('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toMatch(/Baja California.*Rising, \+0\.38 °C per decade/)
  })

  it('el botón de cerrar hace lo mismo que Escape', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Rising')
    fireEvent.click(screen.getByRole('button', { name: 'Close analysis' }))
    expect(params().get('region')).toBeNull()
  })
})

describe('AnalysisPanel · gráfica (T003) y % (T011)', () => {
  it('la tabla alternativa coincide con el archivo y anota el año parcial', async () => {
    const file = JSON.parse(TREND_FIXTURES['data/trends/series/air_temperature/MX-BCN.json']) as SeriesFile
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Rising')
    fireEvent.click(screen.getByRole('button', { name: 'View as table' }))
    const table = screen.getByRole('table')
    const first = within(table).getByRole('rowheader', { name: String(file.years[0]) }).closest('tr')!
    expect(first.textContent).toContain(String(file.values[0]))
    expect(within(table).getByText(new RegExp(`Year in progress: ${file.partial_year!.months_valid} of 12 months`))).toBeTruthy()
    // Periodo completo: el año parcial no cuenta como «fuera del periodo».
    expect(screen.queryByText('Outside the period chosen')).toBeNull()
  })

  it('con line_mid y columnas de %: dibuja la recta y muestra el % sin calcularlo', async () => {
    await renderPanel('?region=MX-BCN&var=precipitation')
    expect(await screen.findByText('Falling')).toBeTruthy()
    expect(screen.getByText('(−14.0 % per decade)')).toBeTruthy()
    expect(panel().textContent).toMatch(/−18\.8 to −7\.4 % per decade/)
    expect(document.querySelector('.trend-chart-sen')).not.toBeNull()
    expect(document.querySelector('.trend-chart-band')).not.toBeNull()
    expect(screen.getByText('Sen line')).toBeTruthy()
  })

  it('años excluidos: hueco con trama y nota en la tabla', async () => {
    await renderPanel('?region=MX-CMX&var=air_temperature')
    await screen.findByText('Not enough data')
    expect(document.querySelectorAll('.trend-chart-excluded').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'View as table' }))
    expect(screen.getAllByText('Incomplete year: excluded').length).toBeGreaterThan(0)
  })

  it('un archivo sin las columnas opcionales: solo mm por década, sin recta y sin error', async () => {
    const file = JSON.parse(TREND_FIXTURES['data/trends/series/precipitation/MX-BCN.json']) as SeriesFile
    overrides['data/trends/series/precipitation/MX-BCN.json'] = JSON.stringify(withoutOptionalColumns(file))
    await renderPanel('?region=MX-BCN&var=precipitation')
    await screen.findByText('Falling')
    expect(panel().textContent).not.toMatch(/%\s*per decade/)
    expect(document.querySelector('.trend-chart-sen')).toBeNull()
    expect(screen.getByText(/Trend line pending/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
