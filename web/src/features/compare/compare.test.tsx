import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMPARE_COPY, UI_COPY } from '../../content'
import type { Catalog, CompareFile, CompareIndex, SeriesFile } from '../../lib/data'
import { fixtureFetch, TREND_FIXTURES } from '../../lib/testing/fixtures'

// Fixtures sintéticos compartidos de 002, con su `compare/` generado por pipeline/compare_build.py.
// `overrides`: cuerpo que sustituye o añade un archivo, `null` = no existe, o un código HTTP para simular un fallo.
type Override = string | number | object | null
let overrides: Record<string, Override> = {}

function serve() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = decodeURIComponent(String(input).replace(/^\/+/, ''))
    const o = overrides[path]
    if (typeof o === 'number') return new Response('', { status: o })
    const bodies = Object.fromEntries(Object.entries(overrides).filter(([, v]) => typeof v !== 'number')) as Record<string, string | object | null>
    return fixtureFetch({ overrides: bodies })(input)
  }))
}

const fixture = <T,>(path: string) => JSON.parse(TREND_FIXTURES[`data/trends/${path}`]) as T
const currentCatalog = () => (overrides['data/trends/catalog.json'] as Catalog | undefined) ?? fixture<Catalog>('catalog.json')

/** Estado nuevo leído de la URL y configurado con el catálogo, igual que hace el armazón. */
async function freshState(search: string) {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  const data = await import('../../lib/data')
  data.clearDataCache()
  const catalog = currentCatalog()
  ;(await import('../../app/state')).configureState({
    firstYear: catalog.period.first_year, lastYear: catalog.period.last_complete_year,
    regionIds: catalog.regions.map(r => r.id), periods: data.variablePeriods(catalog),
    variableIds: catalog.variables.map(v => v.id),
  })
}

async function renderCompare(search: string) {
  await freshState(search)
  const { default: ComparePanel } = await import('./ComparePanel')
  await act(async () => { render(<ComparePanel />) })
}

const panel = () => screen.getByRole('article')
const params = () => new URLSearchParams(window.location.search)
const difference = () => screen.getByRole('region', { name: COMPARE_COPY.differenceHeading })

beforeEach(() => { overrides = {}; serve() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

/** Lo que toda comparación con prueba publicada debe enseñar (SC-K02) y lo que nunca puede decir (FR-K08). */
function expectMandatory() {
  const text = panel().textContent ?? ''
  expect(text).toMatch(/α = 0\.05/)
  expect(text).toMatch(/años completos comunes/)
  expect(text).toMatch(/Theil-Sen/)                          // método
  expect(within(difference()).getByText('Cómo se mide')).toBeTruthy()   // base de la diferencia
  expect(screen.getByText('Procedencia de las dos series')).toBeTruthy()
  expect(text).toMatch(/NASA|Fixture|sintétic/i)
  expect(text).not.toMatch(/cambian igual|no hay diferencia|mejor|peor|años para/i)
  expect(text).not.toMatch(/\d,\d/) // punto decimal (FR-K09)
  expect(screen.getAllByText(UI_COPY.synthetic).length).toBeGreaterThan(0)
}

describe('ComparePanel · prueba de la diferencia (T013)', () => {
  it('inconclusive: no dice que cambien igual y enseña la diferencia en el orden del archivo', async () => {
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    expect(await screen.findByText('Sin evidencia suficiente de que difieran')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Baja California frente a Texas')
    expect(difference().textContent).toContain('Baja California − Texas: +0.07 °C por década')
    expect(difference().textContent).toMatch(/de −0\.03 a \+0\.17/)
    expect(difference().textContent).toMatch(/p = 0\.130; α = 0\.05/)
    expect(difference().textContent).toMatch(/1980–2025 · 46 años completos comunes/)
    expect(panel().textContent).toContain('Esto no demuestra que cambien igual')
    expectMandatory()
  })

  it('differ con base relativa: puntos porcentuales y explicación de la base', async () => {
    await renderCompare('?region=MX-BCN&vs=MX-SON&var=precipitation')
    expect(await screen.findByText('Las tendencias difieren')).toBeTruthy()
    expect(difference().textContent).toContain('Baja California − Sonora: −22.6 puntos porcentuales por década')
    expect(within(difference()).getByText(COMPARE_COPY.relativeBasis)).toBeTruthy()
    expect(panel().textContent).toContain(COMPARE_COPY.notCause)
    expectMandatory()
  })

  it('el orden A/B no cambia el signo: la diferencia se nombra siempre en el orden del archivo', async () => {
    await renderCompare('?region=US-TX&vs=MX-BCN&var=air_temperature')
    await screen.findByText('Sin evidencia suficiente de que difieran')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Texas frente a Baja California')
    expect(difference().textContent).toContain('Baja California − Texas: +0.07 °C por década')
  })

  it('cada región por separado: mismas cifras que su serie, y sin cifras si su análisis no es válido', async () => {
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    const each = await screen.findByRole('region', { name: COMPARE_COPY.eachHeading })
    const [, rowA, rowB] = within(each).getAllByRole('row')
    expect(rowA.textContent).toMatch(/A.*Baja California.*Sube.*\+0\.38.*de \+0\.33 a \+0\.45.*p < 0\.001.*46/)
    expect(rowB.textContent).toMatch(/B.*Texas.*Análisis no válido/)
    expect(rowB.textContent).not.toMatch(/[+−]\d/)
  })

  it('variables con cambio relativo muestran también el % de cada región, leído del archivo', async () => {
    await renderCompare('?region=MX-BCN&vs=MX-SON&var=precipitation')
    const each = await screen.findByRole('region', { name: COMPARE_COPY.eachHeading })
    expect(within(each).getAllByRole('row')[1].textContent).toMatch(/−30\.1 \(−\d+\.\d %\)/)
  })

  it('las dos series tienen gráfica propia y alternativa en tabla con los valores del archivo', async () => {
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    await screen.findByText(COMPARE_COPY.chartHeading)
    expect(screen.getAllByRole('img')).toHaveLength(2)
    const toggle = screen.getByRole('button', { name: 'Ver como tabla' })
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const table = screen.getByRole('table', { name: /Valores anuales/ })
    const a = fixture<SeriesFile>('series/air_temperature/MX-BCN.json')
    const b = fixture<SeriesFile>('series/air_temperature/US-TX.json')
    const first = within(table).getAllByRole('row')[1]
    expect(first.textContent).toContain(String(a.years[0]))
    expect(first.textContent).toContain(String(a.values[0]))
    expect(first.textContent).toContain(String(b.values[0]))
  })
})

describe('ComparePanel · periodo (T015)', () => {
  it('un periodo sin prueba publicada lo dice, enseña cada región y ofrece el publicado más cercano', async () => {
    await renderCompare('?region=MX-BCN&vs=MX-SON&var=air_temperature&from=1990&to=2020')
    expect(await screen.findByText(COMPARE_COPY.noWindow(2025))).toBeTruthy()
    expect(screen.queryByRole('region', { name: COMPARE_COPY.differenceHeading })).toBeNull()
    expect(screen.getByRole('region', { name: COMPARE_COPY.eachHeading })).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ver 1990–2025' })) })
    expect(params().get('from')).toBe('1990')
    expect(params().get('to')).toBe('2025')
    expect(difference()).toBeTruthy()
  })

  it('«Desde» solo ofrece los años publicados y cambia el periodo', async () => {
    await renderCompare('?region=MX-BCN&vs=MX-SON&var=precipitation')
    const select = await screen.findByLabelText(COMPARE_COPY.startLabel) as HTMLSelectElement
    const index = fixture<CompareIndex>('compare/index.json')
    expect([...select.options].map(o => Number(o.value))).toEqual(index.variables.precipitation.starts)
    expect(screen.getByText('hasta 2025')).toBeTruthy()
    await act(async () => { fireEvent.change(select, { target: { value: '2010' } }) })
    expect(params().get('from')).toBe('2010')
    expect(difference().textContent).toMatch(/2010–2025 · 16 años completos comunes/)
  })
})

describe('ComparePanel · estados (T016)', () => {
  it('variable sin prueba publicada: aviso, no error, y los dos resultados siguen ahí', async () => {
    const index = fixture<CompareIndex>('compare/index.json')
    overrides['data/trends/compare/index.json'] = { ...index, variables: { precipitation: index.variables.precipitation } }
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    expect(await screen.findByText(COMPARE_COPY.notPublished)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('region', { name: COMPARE_COPY.eachHeading })).toBeTruthy()
    expect(screen.queryByLabelText(COMPARE_COPY.startLabel)).toBeNull()
  })

  it('sin compare/ publicado tampoco es un error', async () => {
    overrides['data/trends/compare/index.json'] = null
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    expect(await screen.findByText(COMPARE_COPY.notPublished)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('par no comparable: dice por qué y no enseña ninguna diferencia', async () => {
    const file = fixture<CompareFile>('compare/air_temperature/MX-BCN.json')
    const { 'US-TX': _removed, ...partners } = file.partners
    overrides['data/trends/compare/air_temperature/MX-BCN.json'] = { ...file, partners, not_comparable: { 'US-TX': 'different_product' } }
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    expect(await screen.findByText(COMPARE_COPY.notComparable.different_product)).toBeTruthy()
    expect(screen.queryByRole('region', { name: COMPARE_COPY.differenceHeading })).toBeNull()
  })

  it('una región sin datos se nombra; no se presenta como error', async () => {
    await renderCompare('?region=MX-BCN&vs=MX-JAL&var=air_temperature')
    expect(await screen.findByText('No hay datos de Jalisco para esta variable.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('un fallo de carga se explica y reintentar recupera sin recargar', async () => {
    overrides['data/trends/compare/air_temperature/MX-BCN.json'] = 500
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(COMPARE_COPY.loadError)
    delete overrides['data/trends/compare/air_temperature/MX-BCN.json']
    await act(async () => { fireEvent.click(within(alert).getByRole('button', { name: UI_COPY.retry })) })
    expect(await screen.findByText('Sin evidencia suficiente de que difieran')).toBeTruthy()
  })

  it('insufficient: veredicto y explicación, sin cifras de la diferencia', async () => {
    const file = fixture<CompareFile>('compare/air_temperature/MX-BCN.json')
    const rows = file.partners['US-TX'].map((r, i) => (i === 0 ? [7, null, null, null, null, 'insufficient'] : r))
    overrides['data/trends/compare/air_temperature/MX-BCN.json'] = { ...file, partners: { ...file.partners, 'US-TX': rows } }
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    expect(await screen.findByText('Datos insuficientes para comparar')).toBeTruthy()
    expect(difference().textContent).not.toMatch(/Intervalo|p [=<]/)
    expect(panel().textContent).toMatch(/comparten 7 años completos/)
  })
})

describe('Entrada y salida de la comparación (T012, FR-K01)', () => {
  it('la lista ofrece los demás estados por país y elegir uno abre la comparación', async () => {
    await freshState('?region=MX-BCN&var=air_temperature')
    const { default: CompareEntry } = await import('./CompareEntry')
    await act(async () => { render(<CompareEntry />) })
    const select = screen.getByLabelText(COMPARE_COPY.entryLabel) as HTMLSelectElement
    await waitFor(() => expect(select.disabled).toBe(false))
    expect(within(select).getAllByRole('group').map(g => g.getAttribute('label'))).toEqual(['México', 'Estados Unidos'])
    expect([...select.options].some(o => o.value === 'MX-BCN')).toBe(false) // la principal no se ofrece
    expect(select.options).toHaveLength(84) // 83 estados + la opción vacía
    await act(async () => { fireEvent.change(select, { target: { value: 'US-TX' } }) })
    expect(params().get('vs')).toBe('US-TX')
  })

  it('Escape y el botón quitan la comparación y dejan abierta la región principal', async () => {
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    await screen.findByText('Sin evidencia suficiente de que difieran')
    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(params().get('vs')).toBeNull()
    expect(params().get('region')).toBe('MX-BCN')
    cleanup()
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: COMPARE_COPY.remove })) })
    expect(params().get('vs')).toBeNull()
  })

  it('la segunda región se cambia desde la propia comparación', async () => {
    await renderCompare('?region=MX-BCN&vs=US-TX&var=air_temperature')
    await screen.findByText('Sin evidencia suficiente de que difieran')
    await act(async () => { fireEvent.change(screen.getByLabelText(/Estado comparado/), { target: { value: 'MX-SON' } }) })
    expect(params().get('vs')).toBe('MX-SON')
    expect((await screen.findByRole('heading', { level: 2 })).textContent).toBe('Baja California frente a Sonora')
  })

  it('el armazón muestra la entrada bajo el análisis y la comparación cuando la URL trae vs=', async () => {
    window.history.replaceState(null, '', '/?region=MX-BCN&var=air_temperature')
    vi.resetModules()
    ;(await import('../../lib/data')).clearDataCache()
    const { default: Shell } = await import('../../app/Shell')
    await act(async () => { render(<Shell />) })
    const aside = screen.getByRole('complementary', { name: 'Análisis' })
    const select = await within(aside).findByLabelText(COMPARE_COPY.entryLabel) as HTMLSelectElement
    await within(aside).findByText('Sube')
    await waitFor(() => expect(select.disabled).toBe(false))
    await act(async () => { fireEvent.change(select, { target: { value: 'MX-SON' } }) })
    expect(await within(aside).findByRole('heading', { level: 2, name: 'Baja California frente a Sonora' })).toBeTruthy()
    expect(within(aside).queryByLabelText(COMPARE_COPY.entryLabel)).toBeNull()
  })
})

describe('Cualquier variable del catálogo (SC-K01, FR-K11)', () => {
  // Una variable que no existe: se añade al catálogo y se publican sus archivos. No se toca ningún archivo de código.
  const NEW = 'indice_inventado'
  function publishInventedVariable() {
    const catalog = fixture<Catalog>('catalog.json')
    overrides['data/trends/catalog.json'] = {
      ...catalog,
      variables: [...catalog.variables, {
        id: NEW, label: 'Índice inventado', definition: 'Una magnitud de prueba que no existe.', kind: 'otra_cosa',
        unit_annual: 'zz', aggregation: 'otra', relative_change: true, first_year: 2001, last_complete_year: 2025,
        product_short_name: 'INVENTADO', product_version: '9',
      }],
    }
    for (const region of ['MX-BCN', 'MX-SON']) {
      const s = fixture<SeriesFile>(`series/precipitation/${region}.json`)
      overrides[`data/trends/series/${NEW}/${region}.json`] = { ...s, variable: NEW, unit: 'zz' }
    }
    const index = fixture<CompareIndex>('compare/index.json')
    overrides['data/trends/compare/index.json'] = { ...index, variables: { ...index.variables, [NEW]: index.variables.precipitation } }
    overrides[`data/trends/compare/${NEW}/MX-BCN.json`] = { ...fixture<CompareFile>('compare/precipitation/MX-BCN.json'), variable: NEW }
  }

  it('una variable nueva se compara con su etiqueta y su unidad, sin cambiar código', async () => {
    publishInventedVariable()
    await renderCompare(`?region=MX-BCN&vs=MX-SON&var=${NEW}`)
    expect(await screen.findByText('Las tendencias difieren')).toBeTruthy()
    expect(params().get('var')).toBe(NEW)
    expect(panel().textContent).toContain('Índice inventado · 2001–2025')
    expect(screen.getByRole('columnheader', { name: 'Cambio por década (zz)' })).toBeTruthy()
    expect(difference().textContent).toContain('puntos porcentuales por década')
    expectMandatory()
  })

  it('el selector la ofrece y el panel de análisis la muestra con los textos del catálogo', async () => {
    publishInventedVariable()
    await freshState('?region=MX-BCN')
    const { default: QueryBar } = await import('../query/QueryBar')
    const { default: AnalysisPanel } = await import('../analysis/AnalysisPanel')
    await act(async () => { render(<><QueryBar /><AnalysisPanel /></>) })
    const select = await screen.findByRole('combobox', { name: 'Variable' })
    await act(async () => { fireEvent.change(select, { target: { value: NEW } }) })
    expect(params().get('var')).toBe(NEW)
    const analysis = screen.getByRole('article')
    await within(analysis).findByText('Baja')
    expect(analysis.textContent).toContain('Índice inventado · 2001–2025')
    expect(analysis.textContent).toContain('zz por década')
  })

  it('el selector es una lista desplegable con las variables del catálogo', async () => {
    publishInventedVariable()
    const catalog = overrides['data/trends/catalog.json'] as Catalog
    overrides['data/trends/catalog.json'] = {
      ...catalog, variables: [...catalog.variables, { ...catalog.variables[2], id: 'otra_inventada', label: 'Otra inventada' }],
    }
    await freshState('?region=MX-BCN')
    const { default: QueryBar } = await import('../query/QueryBar')
    await act(async () => { render(<QueryBar />) })
    const select = await screen.findByRole('combobox', { name: 'Variable' }) as HTMLSelectElement
    expect([...select.options].map(o => o.textContent)).toEqual(['Temperatura', 'Precipitación', 'Índice inventado', 'Otra inventada'])
    await act(async () => { fireEvent.change(select, { target: { value: NEW } }) })
    expect(params().get('var')).toBe(NEW)
  })

  it('el código de la comparación no nombra ninguna variable, unidad ni producto', () => {
    const sources = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const published = ['air_temperature', 'precipitation', 'soil_moisture', 'evapotranspiration', 'T2M', 'MERRA', 'IMERG', 'GLDAS', '°C']
    const words = [...published, ...fixture<Catalog>('catalog.json').variables.flatMap(v => [v.id, v.label])]
    for (const [file, source] of Object.entries(sources)) {
      if (/\.test\.tsx?$/.test(file)) continue
      // Los comentarios pueden poner ejemplos; el código, no.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      for (const word of words) expect(code.includes(word), `${file} nombra «${word}»`).toBe(false)
    }
  })
})
