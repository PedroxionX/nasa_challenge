import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

let explode = true
function Bomb() {
  if (explode) throw new Error('boom')
  return <p>bien</p>
}

afterEach(() => { cleanup(); explode = true; vi.restoreAllMocks() })

describe('ErrorBoundary', () => {
  it('aísla el fallo de una zona, avisa y permite reintentar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()
    render(<><ErrorBoundary zone="globo" onError={onError}><Bomb /></ErrorBoundary><p>vecino</p></>)
    expect(screen.getByRole('alert').textContent).toContain('globo')
    expect(screen.getByText('vecino')).toBeTruthy()
    expect(onError).toHaveBeenCalledOnce()
    explode = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('bien')).toBeTruthy()
  })

  it('vuelve a intentarlo cuando cambian resetKeys', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(<ErrorBoundary zone="z" resetKeys={[1]}><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeTruthy()
    explode = false
    rerender(<ErrorBoundary zone="z" resetKeys={[2]}><Bomb /></ErrorBoundary>)
    expect(screen.getByText('bien')).toBeTruthy()
  })
})
