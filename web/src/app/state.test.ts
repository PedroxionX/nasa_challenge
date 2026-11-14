import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSearch, toSearch, type StateLimits } from './state'

const LIMITS: StateLimits = { firstYear: 1981, lastYear: 2025, regionIds: null }

describe('parseSearch', () => {
  it('lee una URL válida', () => {
    const { state, notices } = parseSearch('?region=MX-BCN&var=precipitation&from=1990&to=2020', LIMITS)
    expect(state).toEqual({ regionId: 'MX-BCN', variableId: 'precipitation', from: 1990, to: 2020 })
    expect(notices).toEqual([])
  })

  it('sin parámetros usa los predeterminados sin avisar', () => {
    expect(parseSearch('', LIMITS)).toEqual({
      state: { regionId: null, variableId: 'air_temperature', from: 1981, to: 2025 }, notices: [],
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

  it('sin WebGL el estado lo refleja (jsdom no tiene WebGL)', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    expect(result.current.webgl).toBe(false)
  })
})
