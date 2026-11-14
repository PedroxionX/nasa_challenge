/**
 * Límite de errores por zona: si una funcionalidad falla al dibujarse, el resto del armazón sigue en pie.
 * Solo 002 edita este archivo.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Nombre de la zona, para el mensaje y la consola. */
  zone: string
  children: ReactNode
  onError?: (error: Error) => void
  /** Si cambia alguno de estos valores, la zona vuelve a intentarse. */
  resetKeys?: unknown[]
}

interface State { error: Error | null; keys: unknown[] }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, keys: this.props.resetKeys ?? [] }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const keys = props.resetKeys ?? []
    const changed = keys.length !== state.keys.length || keys.some((k, i) => !Object.is(k, state.keys[i]))
    return changed ? { error: null, keys } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.zone}]`, error, info.componentStack)
    this.props.onError?.(error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="zone-error" role="alert">
        <p>Esta parte ({this.props.zone}) no se pudo mostrar.</p>
        <button type="button" onClick={() => this.setState({ error: null })}>Reintentar</button>
      </div>
    )
  }
}
