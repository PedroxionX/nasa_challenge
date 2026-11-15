/**
 * Datos fijos del modo detective (008 T002) y filtros puros contra el catálogo.
 * Son ids, no textos: los textos visibles viven en `content/` (DETECTIVE_COPY).
 *
 * No usa la lista fija de variables del frontend: las variables salen de `catalog.variables`, así el flujo
 * funciona igual antes y después de que 007 convierta el id de variable en texto libre.
 */
import type { Catalog, MapFile, RegionInfo } from '../../../lib/data'
import type { GroupId, PlaceId } from '../../../content'

/**
 * Grupos de la pregunta 1 y sus temas, en orden de aparición (FR-E15, revisión 2026-11-15: 14 variables).
 * Un grupo solo se muestra si alguno de sus temas está publicado en el catálogo.
 */
export const GROUPS: Readonly<Record<GroupId, readonly string[]>> = {
  heat: ['air_temperature', 'max_air_temperature', 'min_air_temperature', 'soil_temperature'],
  water: ['precipitation', 'soil_moisture', 'evapotranspiration', 'runoff', 'snow_water_equivalent'],
  air: ['specific_humidity', 'total_precipitable_water', 'total_ozone'],
  particles: ['aerosol_optical_depth', 'dust_optical_depth'],
}
export const GROUP_IDS = Object.keys(GROUPS) as GroupId[]

/** Todos los temas, en orden. */
export const TOPIC_IDS: readonly string[] = GROUP_IDS.flatMap(g => GROUPS[g])

/** Tipos de lugar de la pregunta 2. Sin ciudad (D.C. es más pequeña que una celda) ni «donde más cambia». */
export const PLACES: Readonly<Record<PlaceId, readonly string[]>> = {
  desert: ['MX-SON', 'US-AZ', 'US-NV'],
  tropical: ['MX-CHP', 'MX-TAB', 'US-HI'],
  farmland: ['US-IN', 'US-IA', 'US-KS'],
  cold: ['US-AK', 'US-CO'],
  northeast: ['US-ME', 'US-NH', 'US-NY', 'US-MA'],
  pacific: ['US-OR', 'US-WA', 'US-CA'],
  southeast: ['US-GA', 'US-SC', 'US-FL'],
}
export const PLACE_IDS = Object.keys(PLACES) as PlaceId[]

/** Lugares que ofrece cada grupo (FR-E17): donde sus variables dan resultados útiles; ≤ 5 para que quepa. */
const GROUP_PLACES: Readonly<Record<GroupId, readonly PlaceId[]>> = {
  heat: ['desert', 'tropical', 'farmland', 'cold', 'northeast'],
  water: ['desert', 'tropical', 'farmland', 'cold', 'northeast'],
  air: ['northeast', 'desert', 'tropical', 'cold'],
  particles: ['desert', 'pacific', 'southeast', 'farmland'],
}

/**
 * La nieve casi no existe en México: el pipeline publica allí «baja» con pendiente −0.000. Para ese tema solo
 * se ofrecen lugares fríos y estados de EE. UU. (spec 008, sesión 2026-11-15).
 */
const SNOW = 'snow_water_equivalent'
const SNOW_PLACES: readonly PlaceId[] = ['cold', 'northeast', 'pacific']

export function groupOf(variableId: string): GroupId | null {
  return GROUP_IDS.find(g => GROUPS[g].includes(variableId)) ?? null
}

/** Tipos de lugar que se ofrecen para un tema (antes de comprobar datos). */
export function placesForTopic(variableId: string): readonly PlaceId[] {
  if (variableId === SNOW) return SNOW_PLACES
  const g = groupOf(variableId)
  return g ? GROUP_PLACES[g] : ['desert', 'tropical', 'farmland', 'cold']
}

/** Países cuyos estados se pueden elegir en «O elige un estado» para un tema. */
export function countriesForTopic(variableId: string): readonly string[] {
  return variableId === SNOW ? ['US'] : ['MX', 'US']
}

export interface Case { regionId: string; variableId: string }

/** Casos de «Sorpréndeme», fijados por el equipo con los resultados publicados (2026-11-14 y 2026-11-15). */
export const CURATED_CASES: readonly Case[] = [
  { regionId: 'MX-HID', variableId: 'precipitation' },
  { regionId: 'MX-VER', variableId: 'precipitation' },
  { regionId: 'US-HI', variableId: 'soil_moisture' },
  { regionId: 'US-FL', variableId: 'evapotranspiration' },
  { regionId: 'MX-CHH', variableId: 'air_temperature' },
  { regionId: 'MX-CMX', variableId: 'soil_temperature' },
  { regionId: 'US-MA', variableId: 'min_air_temperature' },
  { regionId: 'US-ME', variableId: 'snow_water_equivalent' },
  { regionId: 'MX-CHH', variableId: 'dust_optical_depth' },
  { regionId: 'US-OR', variableId: 'aerosol_optical_depth' },
]

/**
 * Pares «un lugar donde pasó lo contrario» (FR-E19). Solo se ofrecen si los archivos publicados confirman
 * direcciones opuestas con evidencia (useContrast); la lista sola no basta.
 */
export const CONTRASTS: readonly { variableId: string; regions: readonly [string, string] }[] = [
  { variableId: 'aerosol_optical_depth', regions: ['US-OR', 'US-GA'] },
  { variableId: 'soil_moisture', regions: ['MX-BCN', 'MX-TLA'] },
  { variableId: 'soil_temperature', regions: ['US-PR', 'MX-CMX'] },
]

/** El otro lugar del par para este caso, o `null`. */
export function contrastFor(variableId: string, regionId: string): string | null {
  const pair = CONTRASTS.find(c => c.variableId === variableId && c.regions.includes(regionId))
  if (!pair) return null
  return pair.regions[0] === regionId ? pair.regions[1] : pair.regions[0]
}

export const caseKey = (c: Case) => `${c.regionId}:${c.variableId}`

const hasVariable = (catalog: Catalog, id: string) => catalog.variables.some(v => v.id === id)
const hasRegion = (catalog: Catalog, id: string) => catalog.regions.some(r => r.id === id)

/** Temas cuya variable está publicada en el catálogo (de un grupo, o de todos). */
export function availableTopics(catalog: Catalog, groupId?: GroupId): string[] {
  return (groupId ? GROUPS[groupId] : TOPIC_IDS).filter(id => hasVariable(catalog, id))
}

/** Grupos con al menos un tema publicado. */
export function availableGroups(catalog: Catalog): GroupId[] {
  return GROUP_IDS.filter(g => availableTopics(catalog, g).length > 0)
}

/** Regiones del tipo de lugar presentes en el catálogo. */
export function placeRegions(placeId: PlaceId, catalog: Catalog): string[] {
  return PLACES[placeId].filter(id => hasRegion(catalog, id))
}

/**
 * Regiones de `regionIds` con dato publicado en el mapa de la variable para la ventana `key` («desde-hasta»):
 * `windows[key][i] === null` significa «sin dato» (T020). Sin mapa (no cargó o falla) no se filtra nada:
 * se decide solo con el catálogo y la revelación informará si falta la serie.
 */
export function withData(regionIds: readonly string[], map: MapFile | null, key: string): string[] {
  if (!map) return [...regionIds]
  const values = map.windows[key]
  if (!values) return [...regionIds]
  return regionIds.filter(id => {
    const i = map.regions.indexOf(id)
    return i >= 0 && values[i] !== null && values[i] !== undefined
  })
}

/** Casos curados cuya variable y región están en el catálogo. */
export function availableCases(catalog: Catalog): Case[] {
  return CURATED_CASES.filter(c => hasVariable(catalog, c.variableId) && hasRegion(catalog, c.regionId))
}

/** Regiones del catálogo agrupadas por país (México primero) y ordenadas por nombre, para «Mi estado». */
export function regionsByCountry(
  catalog: Catalog,
  countries: readonly string[] = ['MX', 'US'],
): { country: string; regions: RegionInfo[] }[] {
  const order = ['MX', 'US']
  const rank = (c: string) => (order.includes(c) ? order.indexOf(c) : order.length)
  const groups = new Map<string, RegionInfo[]>()
  for (const r of catalog.regions) {
    if (countries.includes(r.country)) groups.set(r.country, [...(groups.get(r.country) ?? []), r])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([country, regions]) => ({ country, regions: [...regions].sort((x, y) => x.name.localeCompare(y.name, 'es')) }))
}

/**
 * Elemento al azar de `list`, distinto de `avoid` si hay alternativa. `rand` se inyecta en las pruebas.
 * Devuelve `null` con la lista vacía.
 */
export function pick<T>(list: readonly T[], rand: () => number = Math.random, avoid?: (x: T) => boolean): T | null {
  if (list.length === 0) return null
  const pool = avoid && list.some(x => !avoid(x)) ? list.filter(x => !avoid(x)) : list
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
}
