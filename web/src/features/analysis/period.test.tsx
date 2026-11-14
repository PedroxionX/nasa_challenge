import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickWindow, type Catalog, type SeriesFile } from '../../lib/data'
import { periodOptions, windowsEndingAt } from './analysisData'
import { fmtInterval, fmtSigned } from './format'
import catalogJson from '../../../public/data/trends/catalog.json'
import bcnJson from '../../../public/data/trends/series/T2M/MX-BCN.json'

const catalog = catalogJson as unknown as Catalog
const bcn = bcnJson as unknown as SeriesFile

const FILES = import.meta.glob('../../../public/data/trends/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
function serve() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = decodeURIComponent(String(input).replace(/^\/+/, ''))
    const body = FILES[`../../../public/${path}`]
    return body === undefined
      ? new Response('', { status: 404 })
      : new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
}

async function renderPanel(search: string) {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  ;(await import('../../lib/data')).clearDataCache()
  const { default: AnalysisPanel } = await import('./AnalysisPanel')
  await act(async () => { render(<AnalysisPanel />) })
  await screen.findByRole('group', { name: 'Periodo' })
}

const params = () => new URLSearchParams(window.location.search)
const select = (name: string) => screen.getByRole('combobox', { name }) as HTMLSelectElement
const optionYears = (s: HTMLSelectElement) => [...s.options].map(o => Number(o.value))

beforeEach(() => serve())
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('periodOptions (FR-A06)', () => {
  it('con el periodo completo ofrece solo combinaciones de al menos 10 años', () => {
    const { starts, ends } = periodOptions(catalog, 1981, 2025)
    expect(starts[0]).toBe(1981)
    expect(starts.at(-1)).toBe(2016)
    expect(ends[0]).toBe(1990)
    expect(ends.at(-1)).toBe(2025)
  })

  it('cada lista depende del otro extremo: nunca invertido ni corto', () => {
    const { starts, ends } = periodOptions(catalog, 2000, 2012)
    expect(Math.max(...starts)).toBe(2003)
    expect(Math.min(...ends)).toBe(2009)
  })

  it('un periodo corto llegado por URL se refleja en las listas', () => {
    const { starts, ends } = periodOptions(catalog, 2020, 2025)
    expect(starts).toContain(2020)
    expect(ends).toEqual([2025])
  })
})

describe('windowsEndingAt (FR-A07)', () => {
  it('devuelve las filas del archivo con ese año final, ordenadas por año inicial', () => {
    const rows = windowsEndingAt(bcn, 2025)
    expect(rows).toHaveLength(36) // 1981…2016
    expect(rows[0].start).toBe(1981)
    expect(rows.at(-1)!.start).toBe(2016)
    expect(rows.every(r => r.end === 2025)).toBe(true)
    expect(rows[0]).toEqual(pickWindow(bcn, 1981, 2025))
  })
})

describe('PeriodControl (T007)', () => {
  it('dos listas nativas «Desde» y «Hasta»; «Usar todo el periodo» inactivo con el periodo completo', async () => {
    await renderPanel('?region=MX-BCN&var=T2M')
    expect(optionYears(select('Desde')).at(-1)).toBe(2016)
    expect(optionYears(select('Hasta'))[0]).toBe(1990)
    expect((screen.getByRole('button', { name: 'Usar todo el periodo' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText(/Estás viendo/)).toBeNull()
  })

  it('cambiar «Desde» actualiza el periodo y restringe «Hasta»; nunca queda invertido', async () => {
    await renderPanel('?region=MX-BCN&var=T2M')
    await act(async () => { fireEvent.change(select('Desde'), { target: { value: '2000' } }) })
    expect(params().get('from')).toBe('2000')
    const ends = optionYears(select('Hasta'))
    expect(Math.min(...ends)).toBe(2009)
    await act(async () => { fireEvent.change(select('Hasta'), { target: { value: '2009' } }) })
    expect(params().get('to')).toBe('2009')
    expect(Math.max(...optionYears(select('Desde')))).toBe(2000)
    for (const f of optionYears(select('Desde'))) expect(2009 - f + 1).toBeGreaterThanOrEqual(10)
  })

  it('«Usar todo el periodo» vuelve a 1981–2025', async () => {
    await renderPanel('?region=MX-BCN&var=T2M&from=2000&to=2020')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Usar todo el periodo' })) })
    expect(params().get('from')).toBe('1981')
    expect(params().get('to')).toBe('2025')
  })
})

describe('PeriodVariation (T008)', () => {
  it('el aviso solo aparece fuera del periodo completo', async () => {
    await renderPanel('?region=MX-BCN&var=T2M&from=2000&to=2025')
    expect(screen.getByText('Estás viendo 2000–2025.')).toBeTruthy()
    expect(screen.getAllByText(/Estás viendo/)).toHaveLength(1) // no se repite en «En palabras»
  })

  it('la vista de variación marca el año elegido y su tabla coincide con las filas del archivo', async () => {
    await renderPanel('?region=MX-BCN&var=T2M&from=2000&to=2025')
    const toggle = screen.getByRole('button', { name: 'Ver cómo cambia según el año inicial' })
    expect(document.querySelector('.variation-chart')).toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.variation-chart')).not.toBeNull()
    expect(document.querySelector('.variation-current')).not.toBeNull()

    const section = screen.getByRole('region', { name: 'Aviso de periodo' })
    fireEvent.click(within(section).getByRole('button', { name: 'Ver como tabla' }))
    const table = within(section).getByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(36)
    const current = bodyRows.find(r => r.getAttribute('aria-current') === 'true')!
    const expected = pickWindow(bcn, 2000, 2025)!
    expect(within(current).getByRole('rowheader').textContent).toBe('2000')
    expect(current.textContent).toContain(fmtSigned(expected.slope_decade, 2))
    expect(current.textContent).toContain(fmtInterval(expected.ci_low, expected.ci_high, 2))
  })
})
