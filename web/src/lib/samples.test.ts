// Los archivos de web/public/data/trends/ cargan con los lectores reales y cumplen las reglas del contrato
// (revisión 2026-11-14): periodo por variable, ventanas ≥ 10 años, mapa coherente con las series.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OPTIONAL_WINDOW_COLUMNS, VARIABLE_IDS, clearDataCache, loadCatalog, loadMap, loadSeries, pickWindow, variablePeriod,
  windowKey,
} from './data'

const FILES = import.meta.glob('../../public/data/trends/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const seriesFiles = Object.keys(FILES)
  .map(k => k.match(/series\/([^/]+)\/([^/]+)\.json$/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map(m => ({ variable: m[1], region: m[2] }))

beforeEach(() => {
  clearDataCache()
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const body = FILES[`../../public/${String(input).replace(/^\/+/, '')}`]
    return body === undefined ? new Response('', { status: 404 }) : new Response(body, { status: 200 })
  }))
})
afterEach(() => vi.unstubAllGlobals())

const windowsBetween = (first: number, last: number) => {
  const n = last - first + 1 - 10 + 1
  return n > 0 ? (n * (n + 1)) / 2 : 0
}

describe('datos de ejemplo', () => {
  it('el catálogo declara las dos variables con su periodo y producto', async () => {
    const c = await loadCatalog()
    expect(c.variables.map(v => v.id).sort()).toEqual([...VARIABLE_IDS].sort())
    expect(variablePeriod(c, 'air_temperature')).toEqual({ firstYear: 1980, lastYear: 2025 })
    expect(variablePeriod(c, 'precipitation')).toEqual({ firstYear: 2001, lastYear: 2025 })
    for (const v of c.variables) expect(v.product_short_name && v.product_version).toBeTruthy()
    expect(c.regions).toHaveLength(84)
  })

  it('hay series de ambas variables', () => {
    expect(new Set(seriesFiles.map(s => s.variable))).toEqual(new Set(VARIABLE_IDS))
  })

  it.each(seriesFiles)('series/$variable/$region carga, está rotulada como sintética y cubre el periodo de su variable', async ({ variable, region }) => {
    const c = await loadCatalog()
    const id = variable as (typeof VARIABLE_IDS)[number]
    const s = await loadSeries(id, region)
    const { firstYear, lastYear } = variablePeriod(c, id)
    expect(s.provenance.is_synthetic).toBe(true)
    expect(s.provenance).toMatchObject({ short_name: expect.any(String), version: expect.any(String), granules: expect.any(Number) })
    expect(s.windows.rows).toHaveLength(windowsBetween(firstYear, lastYear))
    expect(s.windows.columns.slice(-4)).toEqual([...OPTIONAL_WINDOW_COLUMNS])
    const full = pickWindow(s, firstYear, lastYear)!
    expect(full).not.toBeNull()
    if (full.slope_decade !== null) expect(full.ci_low! <= full.slope_decade && full.slope_decade <= full.ci_high!).toBe(true)
    const relative = c.variables.find(v => v.id === id)!.relative_change
    if (!relative) expect(full.slope_decade_pct).toBeNull()
    expect(pickWindow(s, firstYear - 1, lastYear)).toBeNull()
  })

  it.each([...VARIABLE_IDS])('map/%s tiene las ventanas de su variable y coincide con las series', async id => {
    const c = await loadCatalog()
    const m = await loadMap(id)
    const { firstYear, lastYear } = variablePeriod(c, id)
    const relative = c.variables.find(v => v.id === id)!.relative_change
    expect(Object.keys(m.windows)).toHaveLength(windowsBetween(firstYear, lastYear))
    expect(m.unit).toBe(relative ? '%/década' : `${c.variables.find(v => v.id === id)!.unit_annual}/década`)
    for (const { region } of seriesFiles.filter(s => s.variable === id)) {
      const row = pickWindow(await loadSeries(id, region), firstYear, lastYear)!
      const expected = relative ? row.slope_decade_pct : row.slope_decade
      expect(m.windows[windowKey(firstYear, lastYear)][m.regions.indexOf(region)]).toBe(expected ?? null)
    }
  })

  it('ningún archivo publica «años para detectar»', () => {
    for (const [name, body] of Object.entries(FILES)) expect(body, name).not.toMatch(/detect/i)
  })
})
