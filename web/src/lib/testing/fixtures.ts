/**
 * Fixtures de prueba compartidos (002). Solo para pruebas: la aplicación no importa este módulo.
 *
 * Sirve los archivos SINTÉTICOS de `lib/__fixtures__/trends/` en las mismas URL que usa `lib/data.ts`
 * (`data/trends/...`), con el comportamiento real de Vite y de los alojamientos estáticos: un archivo
 * ausente NO da 404, sino `index.html` con 200 y `text/html`.
 *
 * Las pruebas no deben leer `web/public/data/trends/`: es de 003 y sus cifras reales cambian.
 *
 *   import { fixtureFetch } from '../../lib/testing/fixtures'
 *   beforeEach(() => { clearDataCache(); vi.stubGlobal('fetch', vi.fn(fixtureFetch())) })
 */

const RAW = import.meta.glob('../__fixtures__/trends/**/*.json', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

/** Contenido de cada fixture por su ruta pública, p. ej. `data/trends/series/air_temperature/MX-BCN.json`. */
export const TREND_FIXTURES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [k.replace('../__fixtures__/', 'data/'), v]),
)

/** Lo que devuelve un servidor de SPA para un archivo que no existe. */
export const INDEX_HTML = '<!doctype html><html lang="es"><head><title>Trend Detective</title></head><body><div id="root"></div></body></html>'

/** Ruta pública de una URL pedida por `lib/data.ts` (quita `BASE_URL` y barras iniciales). */
function publicPath(input: RequestInfo | URL): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
  const path = decodeURIComponent(new URL(raw, 'http://localhost/').pathname)
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '')
  return (base && path.startsWith(base + '/') ? path.slice(base.length) : path).replace(/^\/+/, '')
}

export interface FixtureFetchOptions {
  /** Archivos que sustituyen o añaden a los fixtures, por ruta pública. `null` = el archivo no existe. */
  overrides?: Record<string, string | object | null>
}

/** Implementación de `fetch` que sirve los fixtures. Envuélvela en `vi.fn(...)` para poder espiarla. */
export function fixtureFetch(options: FixtureFetchOptions = {}): (input: RequestInfo | URL) => Promise<Response> {
  return async input => {
    const path = publicPath(input)
    const override = options.overrides && path in options.overrides ? options.overrides[path] : undefined
    const body = override === undefined ? TREND_FIXTURES[path] : override
    if (body === undefined || body === null) {
      return new Response(INDEX_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } })
    }
    const text = typeof body === 'string' ? body : JSON.stringify(body)
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}
