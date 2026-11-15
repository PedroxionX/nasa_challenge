import { describe, expect, it } from 'vitest'
import type { Catalog, MapFile } from '../../../lib/data'
import { TREND_FIXTURES } from '../../../lib/testing/fixtures'
import {
  availableCases, availableGroups, availableTopics, contrastFor, countriesForTopic, CURATED_CASES, GROUPS, pick,
  PLACES, placeRegions, placesForTopic, regionsByCountry, TOPIC_IDS, withData,
} from './options'

const base = JSON.parse(TREND_FIXTURES['data/trends/catalog.json']) as Catalog
// Catálogo con las variables de GLDAS (PR #13). El id es texto libre en 007; aquí se fuerza el tipo.
const withGldas = {
  ...base,
  variables: [
    ...base.variables,
    { ...base.variables[0], id: 'soil_moisture', label: 'Humedad del suelo' },
    { ...base.variables[0], id: 'evapotranspiration', label: 'Evapotranspiración' },
  ],
} as unknown as Catalog
// Catálogo con las 14 variables de `main` (2026-11-15).
const withAll = {
  ...base,
  variables: TOPIC_IDS.map(id => ({ ...base.variables[0], id, label: id })),
} as unknown as Catalog

describe('options (008 T003)', () => {
  it('ofrece solo los temas cuya variable publica el catálogo', () => {
    expect(availableTopics(base)).toEqual(['air_temperature', 'precipitation'])
    expect(availableTopics(withGldas)).toEqual(['air_temperature', 'precipitation', 'soil_moisture', 'evapotranspiration'])
  })

  it('filtra los casos curados por variable publicada', () => {
    expect(availableCases(base).map(c => c.variableId).sort()).toEqual(['air_temperature', 'precipitation', 'precipitation'])
    expect(availableCases(withGldas)).toHaveLength(5)
    expect(availableCases(withAll)).toHaveLength(CURATED_CASES.length)
  })

  it('los tipos de lugar no incluyen ciudades pequeñas', () => {
    const all = Object.values(PLACES).flat()
    expect(all).not.toContain('US-DC')
    expect(all).not.toContain('MX-CMX')
  })

  it('placeRegions devuelve solo regiones del catálogo', () => {
    expect(placeRegions('desert', base)).toEqual(['MX-SON', 'US-AZ', 'US-NV'])
    const sinSonora = { ...base, regions: base.regions.filter(r => r.id !== 'MX-SON') }
    expect(placeRegions('desert', sinSonora)).toEqual(['US-AZ', 'US-NV'])
  })

  it('agrupa por país, México primero, ordenado por nombre', () => {
    const groups = regionsByCountry(base)
    expect(groups.map(g => g.country)).toEqual(['MX', 'US'])
    const names = groups[0].regions.map(r => r.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
    expect(groups.reduce((n, g) => n + g.regions.length, 0)).toBe(base.regions.length)
  })

  it('withData deja solo regiones con dato en la ventana; sin mapa no filtra (T020)', () => {
    const map = {
      schema_version: 1, variable: 'air_temperature', unit: '°C/década', regions: ['MX-SON', 'US-AZ', 'US-NV'],
      windows: { '1980-2025': [null, 0.5, -0.1] }, classes: { breaks: [], labels: [] },
    } as unknown as MapFile
    expect(withData(['MX-SON', 'US-AZ', 'US-NV'], map, '1980-2025')).toEqual(['US-AZ', 'US-NV'])
    expect(withData(['MX-SON', 'US-CO'], map, '1980-2025')).toEqual([])
    expect(withData(['MX-SON'], null, '1980-2025')).toEqual(['MX-SON'])
    expect(withData(['MX-SON'], map, '2001-2025')).toEqual(['MX-SON'])
  })

  it('pick evita el elemento indicado si hay alternativa', () => {
    expect(pick([1, 2, 3], () => 0, x => x === 1)).toBe(2)
    expect(pick([1], () => 0, x => x === 1)).toBe(1)
    expect(pick([], () => 0)).toBeNull()
    expect(pick([1, 2, 3], () => 0.999)).toBe(3)
  })
})

describe('grupos, lugares y contrastes (008 T027)', () => {
  it('los 14 temas están en exactamente un grupo', () => {
    const all = Object.values(GROUPS).flat()
    expect(all).toHaveLength(14)
    expect(new Set(all).size).toBe(14)
  })

  it('solo se muestran grupos con algún tema publicado', () => {
    expect(availableGroups(base)).toEqual(['heat', 'water'])
    expect(availableGroups(withAll)).toEqual(['heat', 'water', 'air', 'particles'])
    expect(availableTopics(withAll, 'particles')).toEqual(['aerosol_optical_depth', 'dust_optical_depth'])
  })

  it('cada tema ofrece como mucho 5 tipos de lugar; la nieve, solo fríos y sin México (FR-E17)', () => {
    for (const id of TOPIC_IDS) expect(placesForTopic(id).length).toBeLessThanOrEqual(5)
    expect(placesForTopic('snow_water_equivalent')).toEqual(['cold', 'northeast', 'pacific'])
    expect(countriesForTopic('snow_water_equivalent')).toEqual(['US'])
    expect(countriesForTopic('air_temperature')).toEqual(['MX', 'US'])
    expect(placesForTopic('aerosol_optical_depth')).toContain('pacific')
    expect(PLACES.northeast).toEqual(['US-ME', 'US-NH', 'US-NY', 'US-MA'])
  })

  it('regionsByCountry puede limitarse a un país', () => {
    const us = regionsByCountry(base, ['US'])
    expect(us.map(g => g.country)).toEqual(['US'])
  })

  it('contrastFor devuelve el otro lugar del par en los dos sentidos', () => {
    expect(contrastFor('aerosol_optical_depth', 'US-OR')).toBe('US-GA')
    expect(contrastFor('aerosol_optical_depth', 'US-GA')).toBe('US-OR')
    expect(contrastFor('soil_moisture', 'MX-TLA')).toBe('MX-BCN')
    expect(contrastFor('air_temperature', 'US-OR')).toBeNull()
  })
})
