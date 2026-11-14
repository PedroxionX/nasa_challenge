import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDataCache } from '../lib/data'

// Sirve web/public/data/trends/ como el servidor de Vite (y Vercel): un archivo ausente NO da 404,
// sino index.html con 200 y text/html. El 404 real lo cubre lib/data.test.ts.
const FILES = import.meta.glob('../../public/data/trends/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const INDEX_HTML = '<!doctype html><html lang="es"><head><title>Trend Detective</title></head><body><div id="root"></div></body></html>'
function serveFromPublic() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = decodeURIComponent(String(input).replace(/^\/+/, ''))
    const body = FILES[`../../public/${path}`]
    return body === undefined
      ? new Response(INDEX_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } })
      : new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
}

async function renderShell(search = '') {
  window.history.replaceState(null, '', `/${search}`)
  vi.resetModules()
  const { default: Shell } = await import('./Shell')
  const data = await import('../lib/data')
  data.clearDataCache()
  let utils!: ReturnType<typeof render>
  await act(async () => { utils = render(<Shell />) })
  return utils
}

beforeEach(() => { clearDataCache(); serveFromPublic() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Shell', () => {
  it('sin WebGL (jsdom) el armazón sigue en pie con sus cinco zonas rotuladas', async () => {
    await renderShell()
    expect(screen.getByRole('banner')).toBeTruthy()
    expect(screen.getByRole('main', { name: 'Globo' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Bienvenida' })).toBeTruthy()
    expect(screen.getByText(/no puede mostrar el globo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Métodos' })).toBeTruthy()
    // Buscador, globo y bienvenida visibles con rótulo de esbozo; análisis aparece al elegir región.
    expect(screen.getAllByText(/^Esbozo · /).length).toBeGreaterThanOrEqual(3)
  })

  it('elegir un ejemplo abre el panel con el archivo sintético rotulado', async () => {
    await renderShell()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Baja California/ })) })
    // Acotado al panel: otras zonas (p. ej. la tabla del globo de 005) también pueden decir «Sube».
    const panel = screen.getByRole('complementary', { name: 'Análisis' })
    await within(panel).findByText(/^Sube/)
    expect(within(panel).getByText(/Datos de ejemplo sintéticos/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Bienvenida' })).toBeNull()
    expect(window.location.search).toContain('region=MX-BCN')
  })

  it('un enlace viejo (?var=PRECTOTCORR) abre la precipitación con su propio periodo', async () => {
    await renderShell('?region=MX-BCN&var=PRECTOTCORR')
    const panel = screen.getByRole('complementary', { name: 'Análisis' })
    await within(panel).findByText(/^Baja/)
    expect(within(panel).getAllByText(/2001–2025/).length).toBeGreaterThan(0)
    expect(window.location.search).toContain('var=precipitation')
    expect(window.location.search).toContain('from=2001')
    expect(screen.queryByText(/no existe|no es válido/)).toBeNull()
  })

  it('la hoja inferior cambia de altura con su asa: media → completa → asomada', async () => {
    const { container } = await renderShell('?region=MX-BCN')
    const shell = container.querySelector('.shell')!
    expect(shell.getAttribute('data-sheet')).toBe('half')
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar' }))
    expect(shell.getAttribute('data-sheet')).toBe('full')
    fireEvent.click(screen.getByRole('button', { name: 'Reducir' }))
    expect(shell.getAttribute('data-sheet')).toBe('peek')
  })

  it('una región sin archivo muestra «sin datos» sin romper el armazón', async () => {
    await renderShell('?region=MX-JAL')
    await screen.findByText('No hay datos para esta región.')
    expect(screen.getByRole('banner')).toBeTruthy()
  })

  it('una región inexistente en la URL avisa y vuelve al predeterminado', async () => {
    await renderShell('?region=MX-XXX')
    expect(await screen.findByText(/«MX-XXX» no existe/)).toBeTruthy()
    expect(window.location.search).not.toContain('MX-XXX')
  })

  it('si el catálogo falla, avisa y permite reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    await renderShell()
    expect(await screen.findByText(/No pudimos cargar el catálogo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
