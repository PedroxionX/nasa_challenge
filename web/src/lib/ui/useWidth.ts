import { useEffect, useRef, useState } from 'react'

/**
 * Ancho disponible de un contenedor, para trazar las gráficas SVG a su tamaño real: así el texto de los ejes
 * mide lo mismo en todas (no se escala con el viewBox) y ninguna gráfica desborda su panel.
 */
export function useWidth<T extends HTMLElement = HTMLDivElement>(fallback = 320, min = 240) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(min, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return { ref, width }
}
