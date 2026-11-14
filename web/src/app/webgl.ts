/** ¿Puede este navegador dibujar el globo? Se evalúa una vez al arrancar. */
export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
