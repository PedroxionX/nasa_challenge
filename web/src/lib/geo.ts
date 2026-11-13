// Tipos y utilidades geográficas compartidas por el globo y los paneles.

type Position = number[]
type Ring = Position[]

export interface Geometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Ring[] | Ring[][]
}

export type CountryCode = 'MX' | 'US'

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  MX: 'México',
  US: 'Estados Unidos',
}

export interface RegionProps {
  id: string // ISO 3166-2, p. ej. "MX-BCN" o "US-CA"
  name: string
  country: CountryCode
}

export interface CountryProps {
  ISO_A3: string
  ADMIN: string
}

/** Feature que el globo dibuja: un estado de México o un país de fondo. */
export type GlobeFeature =
  | { kind: 'region'; properties: RegionProps; geometry: Geometry }
  | { kind: 'country'; properties: CountryProps; geometry: Geometry }

export interface View {
  lat: number
  lng: number
  altitude: number
}

export const COUNTRY_VIEWS: Record<CountryCode, View> = {
  MX: { lat: 23.5, lng: -102, altitude: 1.1 },
  US: { lat: 39, lng: -98, altitude: 1.4 },
}
export const GLOBAL_VIEW: View = { lat: 28, lng: -98, altitude: 2.6 }

function allPositions(geometry: Geometry): Position[] {
  if (geometry.type === 'Polygon') return (geometry.coordinates as Ring[]).flat()
  return (geometry.coordinates as Ring[][]).flat(2)
}

/** Vista de cámara centrada en una geometría, con altitud según su tamaño. */
export function viewForGeometry(geometry: Geometry): View {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of allPositions(geometry)) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const span = Math.max(maxLng - minLng, maxLat - minLat)
  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
    altitude: Math.min(1.2, Math.max(0.25, span / 18)),
  }
}

interface FeatureCollection<P> {
  features: { properties: P; geometry: Geometry }[]
}

// Países con análisis por estado. Para agregar otro: su GeoJSON con propiedades {id, name}
// (id ISO 3166-2) en /public/data, una entrada aquí y otra en CountryCode.
const REGION_SOURCES: { country: CountryCode; iso3: string; url: string }[] = [
  { country: 'MX', iso3: 'MEX', url: '/data/mx-states.geojson' },
  { country: 'US', iso3: 'USA', url: '/data/us-states.geojson' },
]

const getJson = <T,>(url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`)
    return r.json() as Promise<T>
  })

/** Carga los estados de los países analizados y el resto del mundo como fondo. */
export async function loadGlobeFeatures(): Promise<GlobeFeature[]> {
  const [countries, ...regionSets] = await Promise.all([
    getJson<FeatureCollection<CountryProps>>('/data/countries.geojson'),
    ...REGION_SOURCES.map(s => getJson<FeatureCollection<{ id: string; name: string }>>(s.url)),
  ])
  const analyzed = new Set(REGION_SOURCES.map(s => s.iso3))
  return [
    ...countries.features
      .filter(f => !analyzed.has(f.properties.ISO_A3))
      .map(f => ({ kind: 'country' as const, properties: f.properties, geometry: f.geometry })),
    ...regionSets.flatMap((set, i) =>
      set.features.map(f => ({
        kind: 'region' as const,
        properties: { id: f.properties.id, name: f.properties.name, country: REGION_SOURCES[i].country },
        geometry: f.geometry,
      })),
    ),
  ]
}
