import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeriesFile } from '../../lib/data'
import { configureLikeShell, withoutOptionalColumns } from './testData'

// Sirve web/public/data/trends/ como el servidor de Vite; `overrides` sustituye o rompe archivos concretos.
const FILES = import.meta.glob('../../../public/data/trends/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
type Override = string | number // cuerpo JSON o código de estado HTTP
let overrides: Record<string, Override> = {}
let requested: string[] = []

function serve() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = decodeURIComponent(String(input).replace(/^\/+/, ''))
    requested.push(path)
    const o = overrides[path]
    if (typeof o === 'number') return new Response('', { status: o })
    const body = o ?? FILES[`../../../public/${path}`]
    return body === undefined
      ? new Response('', { status: 404 })
      : new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
}

async function renderPanel(search: string, withQuery = false) {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  const data = await import('../../lib/data')
  data.clearDataCache()
  const catalogBody = overrides['data/trends/catalog.json'] ?? FILES['../../../public/data/trends/catalog.json']
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
  for (const label of ['Periodo', 'Años completos (n)', 'Unidades', 'Método', 'Procedencia']) {
    expect(within(facts).getByText(label)).toBeTruthy()
  }
  expect(text).toMatch(/α = 0\.05/)
  expect(text).not.toMatch(/años para ser significativo/i)
  expect(text).not.toMatch(/fuerte|moderada|clara/i)
  expect(text).not.toMatch(/\d,\d/) // punto decimal (FR-A08)
  expect(screen.getByText(/Datos de ejemplo sintéticos/)).toBeTruthy()
}

describe('AnalysisPanel · los cinco estados (T004)', () => {
  it('increasing: veredicto, cambio, intervalo y evidencia sin calificativos', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    expect(await screen.findByText('Sube')).toBeTruthy()
    expect(screen.getByText('+0.38 °C por década')).toBeTruthy()
    expect(panel().textContent).toMatch(/de \+0\.33 a \+0\.45 °C por década/)
    expect(screen.getByText(/Hay evidencia de tendencia/)).toBeTruthy()
    expect(panel().textContent).toMatch(/p < 0\.001; α = 0\.05/)
    expect(within(panel().querySelector<HTMLElement>('.result-facts')!).getByText('46')).toBeTruthy()
    expectMandatory()
  })

  it('decreasing: menos tipográfico y un decimal en mm', async () => {
    await renderPanel('?region=MX-BCN&var=precipitation')
    expect(await screen.findByText('Baja')).toBeTruthy()
    expect(screen.getByText('−30.1 mm por década')).toBeTruthy()
    expectMandatory()
  })

  it('inconclusive: «Sin evidencia suficiente» con p y α, nunca «no hay cambio»', async () => {
    await renderPanel('?region=MX-SON&var=air_temperature')
    expect(await screen.findAllByText('Sin evidencia suficiente')).toHaveLength(2) // veredicto y fila «Evidencia»
    expect(panel().textContent).not.toMatch(/no hay cambio/i)
    expect(panel().textContent).toMatch(/p = 0\.\d{3}; α = 0\.05/)
    expectMandatory()
  })

  it('insufficient: sin pendiente, intervalo ni p', async () => {
    await renderPanel('?region=MX-CMX&var=air_temperature')
    expect(await screen.findByText('Datos insuficientes')).toBeTruthy()
    const text = panel().textContent ?? ''
    expect(text).not.toMatch(/por década\)?$/m)
    expect(text).not.toMatch(/p [=<]/)
    expect(screen.queryByText('Intervalo del 95 %')).toBeNull()
    expect(text).toMatch(/Menos de 30 años completos/)
    expectMandatory()
  })

  it('invalid: sin cifras de tendencia y con el escalón explicado', async () => {
    await renderPanel('?region=US-TX&var=air_temperature')
    expect(await screen.findByText('Análisis no válido')).toBeTruthy()
    expect(panel().textContent).not.toMatch(/p [=<]/)
    expect(panel().textContent).toMatch(/salto brusco hacia 2001/)
    // La gráfica muestra los valores anuales y explica por qué no hay recta.
    expect(document.querySelector('.trend-chart.is-muted')).not.toBeNull()
    expect(document.querySelector('.trend-chart-notice')?.textContent).toMatch(/Sin recta de tendencia\. El análisis no es válido/)
    expect(document.querySelector('.trend-chart-sen')).toBeNull()
    expectMandatory()
  })
})

describe('AnalysisPanel · carga, error y sin datos (T005)', () => {
  it('región con n_cells 0 en el catálogo: «sin datos» sin pedir su archivo', async () => {
    const catalog = JSON.parse(FILES['../../../public/data/trends/catalog.json'])
    catalog.regions.find((r: { id: string }) => r.id === 'MX-JAL').n_cells = 0
    overrides['data/trends/catalog.json'] = JSON.stringify(catalog)
    await renderPanel('?region=MX-JAL&var=air_temperature')
    expect(await screen.findByText('No hay datos para esta región.')).toBeTruthy()
    expect(requested.some(p => p.includes('series/'))).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('archivo inexistente (404): «sin datos», no error', async () => {
    await renderPanel('?region=MX-JAL&var=air_temperature')
    expect(await screen.findByText('No hay datos para esta región.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('error de red: avisa y se recupera con «Reintentar» sin recargar', async () => {
    overrides['data/trends/series/air_temperature/MX-BCN.json'] = 500
    await renderPanel('?region=MX-BCN&var=air_temperature')
    expect(await screen.findByText('No pudimos cargar los datos de este estado.')).toBeTruthy()
    delete overrides['data/trends/series/air_temperature/MX-BCN.json']
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })) })
    expect(await screen.findByText('Sube')).toBeTruthy()
  })

  it('periodo sin fila (menos de 10 años): «Faltan años» y vuelve al periodo completo', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature&from=2020&to=2025')
    expect(await screen.findByText(/Faltan años/)).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Usar todo el periodo' })) })
    expect(await screen.findByText('Sube')).toBeTruthy()
    expect(params().get('from')).toBe('1980')
  })
})

describe('AnalysisPanel · teclado y anuncio (T006)', () => {
  it('Escape deselecciona la región y devuelve el foco al buscador', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature', true)
    await screen.findByText('Sube')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(params().get('region')).toBeNull())
    await waitFor(() => expect(document.activeElement?.id).toBe('region-search'))
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('tras cambiar el periodo, Escape devuelve el foco en el acto (sin esperar a un cuadro de animación)', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature', true)
    await screen.findByText('Sube')
    const desde = screen.getByRole('combobox', { name: 'Desde' }) as HTMLSelectElement
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
    await screen.findByText('Sube')
    const live = screen.getByRole('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toMatch(/Baja California.*Sube, \+0\.38 °C por década/)
  })

  it('el botón de cerrar hace lo mismo que Escape', async () => {
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Sube')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar análisis' }))
    expect(params().get('region')).toBeNull()
  })
})

describe('AnalysisPanel · gráfica (T003) y % (T011)', () => {
  it('la tabla alternativa coincide con el archivo y anota el año parcial', async () => {
    const file = JSON.parse(FILES['../../../public/data/trends/series/air_temperature/MX-BCN.json']) as SeriesFile
    await renderPanel('?region=MX-BCN&var=air_temperature')
    await screen.findByText('Sube')
    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    const table = screen.getByRole('table')
    const first = within(table).getByRole('rowheader', { name: String(file.years[0]) }).closest('tr')!
    expect(first.textContent).toContain(String(file.values[0]))
    expect(within(table).getByText(new RegExp(`Año en curso: ${file.partial_year!.months_valid} de 12 meses`))).toBeTruthy()
    // Periodo completo: el año parcial no cuenta como «fuera del periodo».
    expect(screen.queryByText('Fuera del periodo elegido')).toBeNull()
  })

  it('con line_mid y columnas de %: dibuja la recta y muestra el % sin calcularlo', async () => {
    await renderPanel('?region=MX-BCN&var=precipitation')
    expect(await screen.findByText('Baja')).toBeTruthy()
    expect(screen.getByText('(−14.0 % por década)')).toBeTruthy()
    expect(panel().textContent).toMatch(/de −18\.8 a −7\.4 % por década/)
    expect(document.querySelector('.trend-chart-sen')).not.toBeNull()
    expect(document.querySelector('.trend-chart-band')).not.toBeNull()
    expect(screen.getByText('Recta de Sen')).toBeTruthy()
  })

  it('años excluidos: hueco con trama y nota en la tabla', async () => {
    await renderPanel('?region=MX-CMX&var=air_temperature')
    await screen.findByText('Datos insuficientes')
    expect(document.querySelectorAll('.trend-chart-excluded').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    expect(screen.getAllByText('Año incompleto: excluido').length).toBeGreaterThan(0)
  })

  it('un archivo sin las columnas opcionales: solo mm por década, sin recta y sin error', async () => {
    const file = JSON.parse(FILES['../../../public/data/trends/series/precipitation/MX-BCN.json']) as SeriesFile
    overrides['data/trends/series/precipitation/MX-BCN.json'] = JSON.stringify(withoutOptionalColumns(file))
    await renderPanel('?region=MX-BCN&var=precipitation')
    await screen.findByText('Baja')
    expect(panel().textContent).not.toMatch(/%\s*por década/)
    expect(document.querySelector('.trend-chart-sen')).toBeNull()
    expect(screen.getByText(/Recta de tendencia pendiente/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
