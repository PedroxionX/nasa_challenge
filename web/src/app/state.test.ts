import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSearch, toSearch, type StateLimits } from './state'

const LIMITS: StateLimits = { firstYear: 1981, lastYear: 2025, regionIds: null }

describe('parseSearch', () => {
  it('lee una URL válida', () => {
    const { state, notices } = parseSearch('?region=MX-BCN&var=precipitation&from=1990&to=2020', LIMITS)
    expect(state).toEqual({ regionId: 'MX-BCN', compareId: null, variableId: 'precipitation', from: 1990, to: 2020 })
    expect(notices).toEqual([])
  })

  it('sin parámetros usa los predeterminados sin avisar', () => {
    expect(parseSearch('', LIMITS)).toEqual({
      state: { regionId: null, compareId: null, variableId: 'air_temperature', from: 1981, to: 2025 }, notices: [],
    })
  })

  it.each([
    ['?var=SST', { variableId: 'air_temperature' }],
    ['?from=1900&to=2020', { from: 1981, to: 2025 }],
    ['?from=2020&to=1990', { from: 1981, to: 2025 }],
    ['?from=abc', { from: 1981, to: 2025 }],
    ['?to=2099', { from: 1981, to: 2025 }],
    ['?region=bcn', { regionId: null }],
  ])('%s → predeterminado y aviso', (search, expected) => {
    const { state, notices } = parseSearch(search, LIMITS)
    expect(state).toMatchObject(expected)
    expect(notices).toHaveLength(1)
  })

  it('con catálogo, una región desconocida vuelve a null', () => {
    const limits = { ...LIMITS, regionIds: new Set(['MX-BCN']) }
    expect(parseSearch('?region=MX-SON', limits).state.regionId).toBeNull()
    expect(parseSearch('?region=MX-BCN', limits).state.regionId).toBe('MX-BCN')
  })

  it('las variables salen del catálogo: una nueva se acepta y una ausente se rechaza', () => {
    const limits = { ...LIMITS, variableIds: new Set(['air_temperature', 'precipitation', 'soil_moisture']) }
    expect(parseSearch('?var=soil_moisture', limits)).toMatchObject({ state: { variableId: 'soil_moisture' }, notices: [] })
    const missing = parseSearch('?var=total_ozone', limits)
    expect(missing.state.variableId).toBe('air_temperature')
    expect(missing.notices).toHaveLength(1)
  })

  it('sin catálogo solo se comprueba el formato del id de variable', () => {
    expect(parseSearch('?var=total_ozone', LIMITS)).toMatchObject({ state: { variableId: 'total_ozone' }, notices: [] })
    expect(parseSearch('?var=Ozone!', LIMITS).notices).toHaveLength(1)
  })

  it('si el catálogo no trae la predeterminada, se usa su primera variable', () => {
    const limits = { ...LIMITS, variableIds: new Set(['soil_moisture', 'runoff']) }
    expect(parseSearch('', limits).state.variableId).toBe('soil_moisture')
  })

  it('traduce los ids anteriores de la URL sin avisar', () => {
    expect(parseSearch('?var=T2M', LIMITS)).toMatchObject({ state: { variableId: 'air_temperature' }, notices: [] })
    expect(parseSearch('?var=PRECTOTCORR', LIMITS)).toMatchObject({ state: { variableId: 'precipitation' }, notices: [] })
  })

  it('valida el periodo contra el de la variable', () => {
    const limits: StateLimits = { ...LIMITS, periods: { precipitation: { firstYear: 2001, lastYear: 2025 } } }
    expect(parseSearch('?var=precipitation', limits).state).toMatchObject({ from: 2001, to: 2025 })
    const bad = parseSearch('?var=precipitation&from=1990&to=2020', limits)
    expect(bad.state).toMatchObject({ from: 2001, to: 2025 })
    expect(bad.notices).toHaveLength(1)
    expect(parseSearch('?var=air_temperature&from=1990&to=2020', limits).state).toMatchObject({ from: 1990, to: 2020 })
  })

  it('admite periodos de menos de 10 años (la interfaz mostrará «datos insuficientes»)', () => {
    expect(parseSearch('?from=2020&to=2025', LIMITS).state).toMatchObject({ from: 2020, to: 2025 })
  })
})

describe('toSearch', () => {
  it('escribe el formato del contrato y conserva otros parámetros', () => {
    const s = toSearch({ regionId: 'MX-BCN', variableId: 'air_temperature', from: 1981, to: 2025 }, '?demo=1')
    expect(s).toBe('?demo=1&region=MX-BCN&var=air_temperature&from=1981&to=2025')
  })
  it('omite region cuando no hay selección', () => {
    expect(toSearch({ regionId: null, variableId: 'air_temperature', from: 1981, to: 2025 })).not.toContain('region')
  })
})

describe('useAppState', () => {
  // El almacén vive en el módulo: se recarga en cada prueba con la URL deseada.
  async function freshState(search: string) {
    window.history.replaceState(null, '', `/${search}`)
    vi.resetModules()
    return import('./state')
  }

  beforeEach(() => vi.restoreAllMocks())

  it('recargar una URL restaura región, variable y periodo', async () => {
    const mod = await freshState('?region=US-TX&var=precipitation&from=1995&to=2024')
    const { result } = renderHook(() => mod.useAppState())
    expect(result.current).toMatchObject({ regionId: 'US-TX', variableId: 'precipitation', from: 1995, to: 2024 })
  })

  it('los cambios se reflejan en la URL y en todos los lectores', async () => {
    const mod = await freshState('')
    const a = renderHook(() => mod.useAppState())
    const b = renderHook(() => mod.useAppState())
    act(() => a.result.current.setRegion('MX-SON'))
    act(() => a.result.current.setVariable('precipitation'))
    act(() => a.result.current.setPeriod(2010, 1990))
    expect(b.result.current).toMatchObject({ regionId: 'MX-SON', variableId: 'precipitation', from: 1990, to: 2010 })
    expect(window.location.search).toBe('?region=MX-SON&var=precipitation&from=1990&to=2010')
    act(() => a.result.current.resetPeriod())
    expect(b.result.current).toMatchObject({ from: 1980, to: 2025 })
  })

  it('setPeriod recorta al rango disponible', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    act(() => result.current.setPeriod(1900, 2100))
    expect(result.current).toMatchObject({ from: 1980, to: 2025 })
  })

  it('un valor inválido en la URL produce aviso que se puede descartar', async () => {
    const mod = await freshState('?var=NOPE')
    const { result } = renderHook(() => mod.useStateNotice())
    expect(result.current).toMatch(/NOPE/)
    act(() => mod.dismissStateNotice())
    expect(result.current).toBeNull()
  })

  it('configureState valida la región contra el catálogo y adopta su periodo', async () => {
    const mod = await freshState('?region=MX-ZZZ')
    const { result } = renderHook(() => mod.useAppState())
    act(() => mod.configureState({ firstYear: 1985, lastYear: 2024, regionIds: ['MX-BCN'] }))
    expect(result.current).toMatchObject({ regionId: null, from: 1985, to: 2024 })
    expect(window.location.search).not.toContain('region')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    act(() => result.current.setRegion('MX-ZZZ'))
    expect(result.current.regionId).toBeNull()
  })

  it('configureState conserva un periodo elegido en la URL', async () => {
    const mod = await freshState('?from=1990&to=2020')
    const { result } = renderHook(() => mod.useAppState())
    act(() => mod.configureState({ firstYear: 1981, lastYear: 2025, regionIds: [] }))
    expect(result.current).toMatchObject({ from: 1990, to: 2020 })
  })

  it('cada variable usa su periodo: completo si no se eligió, recortado si se eligió', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    act(() => mod.configureState({
      firstYear: 1980, lastYear: 2025, regionIds: ['MX-BCN'],
      periods: { air_temperature: { firstYear: 1980, lastYear: 2025 }, precipitation: { firstYear: 2001, lastYear: 2025 } },
    }))
    expect(result.current).toMatchObject({ from: 1980, to: 2025 })
    act(() => result.current.setVariable('precipitation'))
    expect(result.current).toMatchObject({ from: 2001, to: 2025 })
    expect(mod.getLimits()).toMatchObject({ firstYear: 2001, lastYear: 2025 })
    act(() => result.current.setVariable('air_temperature'))
    act(() => result.current.setPeriod(1990, 2015))
    act(() => result.current.setVariable('precipitation'))
    expect(result.current).toMatchObject({ from: 2001, to: 2015 })
    act(() => result.current.resetPeriod())
    expect(result.current).toMatchObject({ from: 2001, to: 2025 })
  })

  it('las variables válidas son las del catálogo (007 FR-K14)', async () => {
    const mod = await freshState('?var=soil_moisture')
    const { result } = renderHook(() => mod.useAppState())
    // Antes del catálogo se acepta por formato.
    expect(result.current.variableId).toBe('soil_moisture')
    act(() => mod.configureState({
      firstYear: 1980, lastYear: 2025, regionIds: ['MX-BCN'], variableIds: ['air_temperature', 'soil_moisture'],
      periods: { air_temperature: { firstYear: 1980, lastYear: 2025 }, soil_moisture: { firstYear: 2000, lastYear: 2025 } },
    }))
    expect(result.current).toMatchObject({ variableId: 'soil_moisture', from: 2000, to: 2025 })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    act(() => result.current.setVariable('inventada'))
    expect(result.current.variableId).toBe('soil_moisture')
  })

  it('una variable con buen formato que el catálogo no tiene vuelve a la predeterminada con aviso', async () => {
    const mod = await freshState('?var=inventada')
    const notice = renderHook(() => mod.useStateNotice())
    const { result } = renderHook(() => mod.useAppState())
    expect(notice.result.current).toBeNull()
    act(() => mod.configureState({ firstYear: 1980, lastYear: 2025, regionIds: [], variableIds: ['precipitation', 'air_temperature'] }))
    expect(result.current.variableId).toBe('air_temperature')
    expect(notice.result.current).toMatch(/inventada/)
  })

  it('si el catálogo no trae la variable del contrato, la predeterminada es su primera variable', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    act(() => mod.configureState({ firstYear: 2000, lastYear: 2025, regionIds: [], variableIds: ['soil_moisture'] }))
    expect(result.current.variableId).toBe('soil_moisture')
  })

  it('vs: segunda región en la URL, con sus reglas (007 FR-K01)', async () => {
    const mod = await freshState('?region=MX-BCN&vs=US-TX')
    const { result } = renderHook(() => mod.useAppState())
    expect(result.current).toMatchObject({ regionId: 'MX-BCN', compareId: 'US-TX' })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    act(() => result.current.setCompare('MX-BCN')) // la misma: se ignora
    expect(result.current.compareId).toBe('US-TX')
    act(() => result.current.setCompare('MX-SON'))
    expect(window.location.search).toContain('vs=MX-SON')
    act(() => result.current.setRegion('MX-SON')) // la principal pasa a ser la comparada: se quita la comparación
    expect(result.current).toMatchObject({ regionId: 'MX-SON', compareId: null })
    expect(window.location.search).not.toContain('vs=')
    act(() => result.current.setCompare('US-TX'))
    act(() => result.current.setRegion(null)) // sin principal no hay comparación
    expect(result.current).toMatchObject({ regionId: null, compareId: null })
    act(() => result.current.setCompare('US-TX'))
    expect(result.current.compareId).toBeNull()
  })

  it.each([
    ['?region=MX-BCN&vs=MX-BCN', 1],
    ['?region=MX-BCN&vs=zzz', 1],
    ['?vs=US-TX', 0],
  ])('%s → sin comparación', (search, notices) => {
    const parsed = parseSearch(search, LIMITS)
    expect(parsed.state.compareId).toBeNull()
    expect(parsed.notices).toHaveLength(notices)
  })

  it('sin WebGL el estado lo refleja (jsdom no tiene WebGL)', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    expect(result.current.webgl).toBe(false)
  })
})
