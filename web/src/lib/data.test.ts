import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DataError, clearDataCache, loadCatalog, loadMap, loadSeries, pickWindow, windowKey,
  type SeriesFile,
} from './data'

const COLUMNS = ['start', 'end', 'n', 'slope_decade', 'ci_low', 'ci_high', 'p', 'p_uncorrected',
  'r1', 'ols_slope_decade', 'ols_p', 'status', 'flags']

const series = (over: Partial<SeriesFile> = {}): SeriesFile => ({
  schema_version: 1,
  region: 'MX-BCN',
  variable: 'T2M',
  unit: '°C',
  years: [1981, 1982],
  values: [0, 0],
  excluded_years: [],
  partial_year: null,
  provenance: {
    source: 's', product: 'p', api_version: 'v', parameter: 'T2M', unit_declared: 'C', grid: 'g',
    spatial_method: 'm', n_cells: 1, retrieved_at_utc: 't', requests: 'r', transformations: [], is_synthetic: true,
  },
  diagnostics: { step_year: null, autocorr_significant: false },
  windows: {
    columns: COLUMNS,
    rows: [
      [1981, 2025, 45, 0.46, 0.307, 0.59, 0.000016, 0.000003, 0.08, 0.423, 0.000001, 'increasing', []],
      [1990, 1999, 10, null, null, null, null, null, null, null, null, 'invalid', ['short']],
    ],
  },
  ...over,
})

const catalog = {
  schema_version: 1, built_at_utc: 't', alpha: 0.05,
  period: { first_year: 1981, last_complete_year: 2025, min_window_years: 10 },
  method: { slope: 'theil-sen', test: 'mk', interval: 'sen', contrast: 'ols' },
  variables: [], regions: [],
}

let fetchMock: ReturnType<typeof vi.fn>
const respond = (body: unknown, status = 200) =>
  Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))

beforeEach(() => {
  clearDataCache()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('carga', () => {
  it('lee el catálogo de data/trends/', async () => {
    fetchMock.mockReturnValueOnce(respond(catalog))
    await expect(loadCatalog()).resolves.toMatchObject({ alpha: 0.05 })
    expect(fetchMock.mock.calls[0][0]).toMatch(/data\/trends\/catalog\.json$/)
  })

  it('archivo ausente → DataError not_found', async () => {
    fetchMock.mockReturnValueOnce(respond('', 404))
    const err = await loadSeries('T2M', 'MX-XXX').catch(e => e)
    expect(err).toBeInstanceOf(DataError)
    expect(err.kind).toBe('not_found')
  })

  it('schema_version desconocido → DataError schema_version', async () => {
    fetchMock.mockReturnValueOnce(respond({ ...catalog, schema_version: 2 }))
    await expect(loadCatalog()).rejects.toMatchObject({ name: 'DataError', kind: 'schema_version' })
  })

  it('fallo de red → DataError network', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(loadMap('T2M')).rejects.toMatchObject({ kind: 'network' })
  })

  it('JSON roto → DataError parse', async () => {
    fetchMock.mockReturnValueOnce(respond('{no es json'))
    await expect(loadCatalog()).rejects.toMatchObject({ kind: 'parse' })
  })

  it('serie sin procedencia o con columnas incompletas → DataError invalid', async () => {
    fetchMock.mockReturnValueOnce(respond({ ...series(), provenance: undefined }))
    await expect(loadSeries('T2M', 'MX-BCN')).rejects.toMatchObject({ kind: 'invalid' })
    clearDataCache()
    fetchMock.mockReturnValueOnce(respond(series({ windows: { columns: ['start', 'end'], rows: [] } })))
    await expect(loadSeries('T2M', 'MX-BCN')).rejects.toMatchObject({ kind: 'invalid' })
  })

  it('mapa con una ventana de longitud distinta a regions → invalid', async () => {
    fetchMock.mockReturnValueOnce(respond({
      schema_version: 1, variable: 'T2M', unit: '°C/década', regions: ['A', 'B'],
      windows: { '1981-2025': [0.1] }, classes: { breaks: [], labels: [] },
    }))
    await expect(loadMap('T2M')).rejects.toMatchObject({ kind: 'invalid' })
  })

  it('guarda en caché los aciertos y permite reintentar tras un fallo', async () => {
    fetchMock.mockReturnValueOnce(respond('', 500)).mockReturnValueOnce(respond(catalog))
    await expect(loadCatalog()).rejects.toBeInstanceOf(DataError)
    await expect(loadCatalog()).resolves.toBeTruthy()
    await loadCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('pickWindow', () => {
  it('convierte la fila en objeto con los nombres del contrato', () => {
    const row = pickWindow(series(), 1981, 2025)
    expect(row).toEqual({
      start: 1981, end: 2025, n: 45, slope_decade: 0.46, ci_low: 0.307, ci_high: 0.59,
      p: 0.000016, p_uncorrected: 0.000003, r1: 0.08, ols_slope_decade: 0.423, ols_p: 0.000001,
      status: 'increasing', flags: [],
    })
  })

  it('respeta el orden de columnas declarado en el archivo', () => {
    const s = series()
    const order = [...COLUMNS].reverse()
    s.windows = { columns: order, rows: s.windows.rows.map(r => [...r].reverse()) }
    expect(pickWindow(s, 1981, 2025)?.slope_decade).toBe(0.46)
  })

  it('mantiene los nulos como nulos', () => {
    expect(pickWindow(series(), 1990, 1999)).toMatchObject({ slope_decade: null, p: null, status: 'invalid', flags: ['short'] })
  })

  it('periodo sin fila (p. ej. < 10 años) → null', () => {
    expect(pickWindow(series(), 2020, 2025)).toBeNull()
  })
})

it('windowKey coincide con las claves de map/', () => {
  expect(windowKey(1981, 2025)).toBe('1981-2025')
})
