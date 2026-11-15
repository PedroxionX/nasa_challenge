import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UI_COPY } from '../content'
import { clearDataCache } from '../lib/data'
import { fixtureFetch } from '../lib/testing/fixtures'

// Fixtures sintéticos de lib/__fixtures__ (no web/public/data/trends/, que es de 003 y tiene datos reales).
// Un archivo ausente se responde como Vite: 200 con index.html. El 404 real lo cubre lib/data.test.ts.
function serveFromPublic() {
  vi.stubGlobal('fetch', vi.fn(fixtureFetch()))
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
  it('sin WebGL (jsdom) el armazón sigue en pie con sus zonas', async () => {
    await renderShell()
    expect(screen.getByRole('banner')).toBeTruthy()
    const main = screen.getByRole('main', { name: 'Globo' })
    // Un solo landmark «Bienvenida»: lo pone el armazón; la tarjeta de 006 no debe repetirlo.
    expect(screen.getByRole('region', { name: 'Bienvenida' })).toBeTruthy()
    // El texto del aviso es de 006 (UI_COPY); el armazón solo garantiza que la zona del globo lo muestra.
    expect(within(main).getAllByText(UI_COPY.noWebgl).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Métodos' })).toBeTruthy()
  })

  it('elegir un ejemplo abre el panel con el archivo sintético rotulado', async () => {
    await renderShell()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Baja California/ })) })
    // Acotado al panel (la tabla del globo de 005 también dice «Sube») y texto exacto
    // (la frase explicativa de 006 también empieza por «Sube»).
    const panel = screen.getByRole('complementary', { name: 'Análisis' })
    await within(panel).findByText('Sube')
    expect(within(panel).getAllByText(UI_COPY.synthetic).length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Bienvenida' })).toBeNull()
    expect(window.location.search).toContain('region=MX-BCN')
  })

  it('un enlace viejo (?var=PRECTOTCORR) abre la precipitación con su propio periodo', async () => {
    await renderShell('?region=MX-BCN&var=PRECTOTCORR')
    const panel = screen.getByRole('complementary', { name: 'Análisis' })
    // Texto exacto: con el panel real, /^Baja/ también encaja con el título «Baja California» (aviso de 004).
    await within(panel).findByText('Baja')
    expect(within(panel).getAllByText(/2001–2025/).length).toBeGreaterThan(0)
    expect(window.location.search).toContain('var=precipitation')
    expect(window.location.search).toContain('from=2001')
    expect(screen.queryByText(/no existe|no es válido/)).toBeNull()
  })

  it('abre un resumen y vuelve directamente al globo desde la lectura sin perder la región', async () => {
    const { container } = await renderShell('?region=MX-BCN')
    const shell = container.querySelector('.shell')!
    expect(shell.getAttribute('data-sheet')).toBe('peek')
    fireEvent.click(screen.getByRole('button', { name: 'Ver análisis' }))
    expect(shell.getAttribute('data-sheet')).toBe('half')
    fireEvent.click(screen.getByRole('button', { name: 'Ver globo' }))
    expect(shell.getAttribute('data-sheet')).toBe('peek')
    expect(window.location.search).toContain('region=MX-BCN')
    fireEvent.click(screen.getByRole('button', { name: 'Ver análisis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar análisis' }))
    expect(shell.getAttribute('data-sheet')).toBe('full')
    container.querySelector<HTMLDivElement>('.shell-panel-body')!.scrollTop = 900
    fireEvent.click(screen.getByRole('button', { name: 'Ver globo' }))
    expect(shell.getAttribute('data-sheet')).toBe('peek')
    expect(container.querySelector<HTMLDivElement>('.shell-panel-body')!.scrollTop).toBe(0)
  })

  it('una región nueva vuelve al resumen y muestra el resultado desde el principio', async () => {
    const { container } = await renderShell('?region=MX-BCN')
    const body = container.querySelector<HTMLDivElement>('.shell-panel-body')!
    fireEvent.click(screen.getByRole('button', { name: 'Ver análisis' }))
    body.scrollTop = 900
    fireEvent.change(screen.getByRole('combobox', { name: 'Buscar un estado' }), { target: { value: 'Texas' } })
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Buscar un estado' }), { key: 'Enter' })
    expect(container.querySelector('.shell')!.getAttribute('data-sheet')).toBe('peek')
    expect(body.scrollTop).toBe(0)
    expect(window.location.search).toContain('region=US-TX')
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
