/** Texturas del globo (005 T007). En pantallas pequeñas o táctiles se usan las de 2048 px. */
import { asset } from '../../lib/assets'

const BASE = asset('textures')

export function prefersLiteTextures(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 899px), (pointer: coarse)').matches
}

export function textureUrls(lite: boolean) {
  const size = lite ? '-2k' : ''
  return {
    surface: `${BASE}/earth-blue-marble${size}.jpg`,
    sky: lite ? `${BASE}/night-sky-2k.jpg` : `${BASE}/night-sky.png`,
    clouds: `${BASE}/clouds${size}.png`,
    bump: `${BASE}/earth-topology.png`,
    water: `${BASE}/earth-water.png`,
  }
}
