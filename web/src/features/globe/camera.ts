/**
 * Geometría de cámara respecto a la zona que tapa el panel (005 T002).
 * El armazón publica en :root --panel-inset-right y --panel-inset-bottom (px).
 */
export interface Insets {
  right: number
  bottom: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Lee las variables que escribe el armazón. Sin ellas (o en pruebas) devuelve ceros. */
export function readInsets(): Insets {
  const s = getComputedStyle(document.documentElement)
  const px = (name: string) => Number.parseFloat(s.getPropertyValue(name)) || 0
  return { right: px('--panel-inset-right'), bottom: px('--panel-inset-bottom') }
}

/**
 * Desplazamiento de vista (para `camera.setViewOffset`) que lleva el centro de la escena
 * al centro de la zona libre: la mitad de lo que tapa el panel, hacia la izquierda y hacia arriba.
 */
export function viewOffsetFor(w: number, h: number, insets: Insets): { x: number; y: number } {
  if (w <= 0 || h <= 0) return { x: 0, y: 0 }
  return {
    x: clamp(insets.right, 0, w * 0.8) / 2,
    y: clamp(insets.bottom, 0, h * 0.8) / 2,
  }
}

/**
 * La zona libre es menor que el lienzo: la cámara se aleja en proporción para que
 * la región siga cabiendo. Acotado para no alejarse en exceso con paneles muy grandes.
 */
export function altitudeFactor(w: number, h: number, insets: Insets): number {
  if (w <= 0 || h <= 0) return 1
  const freeW = clamp(w - insets.right, w * 0.2, w) / w
  const freeH = clamp(h - insets.bottom, h * 0.2, h) / h
  return clamp(1 / Math.min(freeW, freeH), 1, 1.8)
}
