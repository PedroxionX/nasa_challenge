import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSearch, toSearch, type StateLimits } from './state'

const LIMITS: StateLimits = { firstYear: 1981, lastYear: 2025, regionIds: null }

describe('parseSearch', () => {
  it('lee una URL válida', () => {
    const { state, notices } = parseSearch('?region=MX-BCN&var=PRECTOTCORR&from=1990&to=2020', LIMITS)
    expect(state).toEqual({ regionId: 'MX-BCN', variableId: 'PRECTOTCORR', from: 1990, to: 2020 })
    expect(notices).toEqual([])
  })

  it('sin parámetros usa los predeterminados sin avisar', () => {
    expect(parseSearch('', LIMITS)).toEqual({
      state: { regionId: null, variableId: 'T2M', from: 1981, to: 2025 }, notices: [],
    })
  })

  it.each([
    ['?var=SST', { variableId: 'T2M' }],
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

  it('admite periodos de menos de 10 años (la interfaz mostrará «datos insuficientes»)', () => {
    expect(parseSearch('?from=2020&to=2025', LIMITS).state).toMatchObject({ from: 2020, to: 2025 })
  })
})

describe('toSearch', () => {
  it('escribe el formato del contrato y conserva otros parámetros', () => {
    const s = toSearch({ regionId: 'MX-BCN', variableId: 'T2M', from: 1981, to: 2025 }, '?demo=1')
    expect(s).toBe('?demo=1&region=MX-BCN&var=T2M&from=1981&to=2025')
  })
  it('omite region cuando no hay selección', () => {
    expect(toSearch({ regionId: null, variableId: 'T2M', from: 1981, to: 2025 })).not.toContain('region')
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
    const mod = await freshState('?region=US-TX&var=PRECTOTCORR&from=1995&to=2024')
    const { result } = renderHook(() => mod.useAppState())
    expect(result.current).toMatchObject({ regionId: 'US-TX', variableId: 'PRECTOTCORR', from: 1995, to: 2024 })
  })

  it('los cambios se reflejan en la URL y en todos los lectores', async () => {
    const mod = await freshState('')
    const a = renderHook(() => mod.useAppState())
    const b = renderHook(() => mod.useAppState())
    act(() => a.result.current.setRegion('MX-SON'))
    act(() => a.result.current.setVariable('PRECTOTCORR'))
    act(() => a.result.current.setPeriod(2010, 1990))
    expect(b.result.current).toMatchObject({ regionId: 'MX-SON', variableId: 'PRECTOTCORR', from: 1990, to: 2010 })
    expect(window.location.search).toBe('?region=MX-SON&var=PRECTOTCORR&from=1990&to=2010')
    act(() => a.result.current.resetPeriod())
    expect(b.result.current).toMatchObject({ from: 1981, to: 2025 })
  })

  it('setPeriod recorta al rango disponible', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    act(() => result.current.setPeriod(1900, 2100))
    expect(result.current).toMatchObject({ from: 1981, to: 2025 })
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

  it('sin WebGL el estado lo refleja (jsdom no tiene WebGL)', async () => {
    const mod = await freshState('')
    const { result } = renderHook(() => mod.useAppState())
    expect(result.current.webgl).toBe(false)
  })
})
