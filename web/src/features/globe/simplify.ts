/**
 * Simplificación SOLO para dibujar (005 T007): cada parte de un MultiPolygon cuesta varias
 * llamadas de dibujo, así que las islas diminutas se omiten en la escena. Los archivos GeoJSON
 * no se tocan: el pipeline (003) los usa completos para promediar.
 */
import type { Geometry } from './geo'

type Ring = number[][]

/** Área del anillo en grados² (fórmula del polígono); basta para comparar tamaños. */
export function ringArea(ring: Ring): number {
  let a = 0
  for (let i = 0; i + 1 < ring.length; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  return Math.abs(a) / 2
}

/** Omite las partes menores que `minArea`; la mayor se conserva siempre. */
export function dropTinyParts(geometry: Geometry, minArea: number): Geometry {
  if (geometry.type !== 'MultiPolygon') return geometry
  const parts = geometry.coordinates as Ring[][]
  const areas = parts.map(p => ringArea(p[0]))
  const largest = areas.indexOf(Math.max(...areas))
  const kept = parts.filter((_, i) => i === largest || areas[i] >= minArea)
  return kept.length === parts.length ? geometry : { type: 'MultiPolygon', coordinates: kept }
}
