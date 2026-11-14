/**
 * Fronteras de los países de fondo como UNA sola geometría de líneas (005 T007).
 * Antes eran 175 polígonos transparentes con tres llamadas de dibujo cada uno.
 */
import * as THREE from 'three'
import type { Geometry } from './geo'

type Position = number[]
type Ring = Position[]

/** Grados máximos por tramo: los tramos largos se subdividen para seguir la curvatura. */
const MAX_STEP_DEG = 4

function ringsOf(geometry: Geometry): Ring[] {
  return geometry.type === 'Polygon'
    ? (geometry.coordinates as Ring[])
    : (geometry.coordinates as Ring[][]).flat()
}

/**
 * Lista plana de pares [lng, lat, lng, lat] (un par por segmento).
 * Se omiten los saltos del antimeridiano y los vértices repetidos.
 */
export function borderSegments(geometries: Geometry[]): number[] {
  const out: number[] = []
  for (const geometry of geometries) {
    for (const ring of ringsOf(geometry)) {
      for (let i = 0; i + 1 < ring.length; i++) {
        const [lng0, lat0] = ring[i]
        const [lng1, lat1] = ring[i + 1]
        const dLng = lng1 - lng0
        const dLat = lat1 - lat0
        if (Math.abs(dLng) > 180) continue
        if (dLng === 0 && dLat === 0) continue
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dLng), Math.abs(dLat)) / MAX_STEP_DEG))
        for (let k = 0; k < steps; k++) {
          const a = k / steps
          const b = (k + 1) / steps
          out.push(lng0 + dLng * a, lat0 + dLat * a, lng0 + dLng * b, lat0 + dLat * b)
        }
      }
    }
  }
  return out
}

/** Construye el objeto de líneas. Quien lo crea lo libera (geometría y material). */
export function buildBorderLines(
  geometries: Geometry[],
  toScene: (lat: number, lng: number) => { x: number; y: number; z: number },
  opacity: number,
): THREE.LineSegments {
  const segments = borderSegments(geometries)
  const positions = new Float32Array((segments.length / 2) * 3)
  for (let i = 0, j = 0; i < segments.length; i += 2, j += 3) {
    const p = toScene(segments[i + 1], segments[i])
    positions[j] = p.x
    positions[j + 1] = p.y
    positions[j + 2] = p.z
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false })
  return new THREE.LineSegments(geometry, material)
}
