/**
 * Armazón adaptable (002 T005): cabecera, escenario y panel (escritorio) u hoja inferior (móvil).
 * Coloca las cinco entradas de features/ sin props; cada una lee useAppState().
 * Expone en :root --panel-inset-right y --panel-inset-bottom (px) para que el globo sepa qué zona queda libre.
 * Solo 002 edita este archivo.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnalysisPanel } from '../features/analysis'
import { GlobeStage } from '../features/globe'
import { MethodsSheet, WelcomeCard } from '../features/guide'
import { QueryBar } from '../features/query'
import { UI_COPY } from '../content'
import { loadCatalog } from '../lib/data'
import ErrorBoundary from './ErrorBoundary'
import { configureState, dismissStateNotice, markWebglUnavailable, useAppState, useStateNotice } from './state'
import './shell.css'

/** Igual que el punto de corte de shell.css. */
export const DESKTOP_QUERY = '(min-width: 900px)'

type Sheet = 'peek' | 'half' | 'full'
const NEXT_SHEET: Record<Sheet, Sheet> = { peek: 'half', half: 'full', full: 'peek' }
const SHEET_LABEL: Record<Sheet, string> = { peek: 'Mostrar más', half: 'Ampliar', full: 'Reducir' }

function setInsets(right: number, bottom: number) {
  const s = document.documentElement.style
  s.setProperty('--panel-inset-right', `${Math.round(right)}px`)
  s.setProperty('--panel-inset-bottom', `${Math.round(bottom)}px`)
}

export default function Shell() {
  const { regionId, webgl } = useAppState()
  const notice = useStateNotice()
  const [catalogFailed, setCatalogFailed] = useState(false)
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  // La altura de la hoja se recuerda por región: al elegir otra vuelve a la media.
  const [sheetFor, setSheetFor] = useState<{ region: string | null; sheet: Sheet }>({ region: null, sheet: 'half' })
  const sheet: Sheet = sheetFor.region === regionId ? sheetFor.sheet : 'half'
  const setSheet = (next: Sheet) => setSheetFor({ region: regionId, sheet: next })
  const panelRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const methodsRef = useRef<HTMLDialogElement>(null)

  // El catálogo fija años y regiones válidos.
  useEffect(() => {
    let live = true
    loadCatalog()
      .then(c => {
        if (!live) return
        setCatalogFailed(false)
        configureState({
          firstYear: c.period.first_year,
          lastYear: c.period.last_complete_year,
          regionIds: c.regions.map(r => r.id),
        })
      })
      .catch(() => live && setCatalogFailed(true))
    return () => { live = false }
  }, [catalogAttempt])

  // Zona que ocupa el panel sobre el escenario.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const stage = stageRef.current
    if (!panel || !stage) { setInsets(0, 0); return }
    const measure = () => {
      const p = panel.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      if (window.matchMedia?.(DESKTOP_QUERY).matches) setInsets(Math.max(0, s.right - p.left), 0)
      else setInsets(0, Math.max(0, s.bottom - p.top))
    }
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(panel)
    ro?.observe(stage)
    // La hoja anima su altura: medir también al terminar la transición.
    panel.addEventListener('transitionend', measure)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      panel.removeEventListener('transitionend', measure)
      window.removeEventListener('resize', measure)
      setInsets(0, 0)
    }
  }, [regionId, sheet])

  const openMethods = () => {
    const d = methodsRef.current
    if (d && typeof d.showModal === 'function') d.showModal()
    else d?.setAttribute('open', '')
  }
  const closeMethods = () => {
    const d = methodsRef.current
    if (d && typeof d.close === 'function') d.close()
    else d?.removeAttribute('open')
  }

  return (
    <div className="shell" data-panel={regionId ? 'open' : 'closed'} data-sheet={sheet}>
      <header className="shell-header">
        <div className="shell-brand">
          <h1>{UI_COPY.appName}</h1>
          <p>{UI_COPY.tagline}</p>
        </div>
        <div className="shell-query">
          <ErrorBoundary zone="buscador"><QueryBar /></ErrorBoundary>
        </div>
        <button type="button" className="shell-help" onClick={openMethods} aria-haspopup="dialog">
          Métodos
        </button>
      </header>

      {(notice || catalogFailed) && (
        <div className="shell-notices">
          {notice && (
            <p className="shell-notice" role="status">
              {notice}
              <button type="button" onClick={dismissStateNotice} aria-label="Cerrar aviso">✕</button>
            </p>
          )}
          {catalogFailed && (
            <p className="shell-notice" role="alert">
              No pudimos cargar el catálogo de datos.
              <button type="button" onClick={() => setCatalogAttempt(a => a + 1)}>{UI_COPY.retry}</button>
            </p>
          )}
        </div>
      )}

      <main className="shell-stage" ref={stageRef} aria-label="Globo" data-webgl={webgl}>
        <ErrorBoundary zone="globo" onError={markWebglUnavailable} resetKeys={[webgl]}>
          <GlobeStage />
        </ErrorBoundary>
        {!regionId && (
          <section className="shell-welcome" aria-label="Bienvenida">
            <ErrorBoundary zone="bienvenida"><WelcomeCard /></ErrorBoundary>
          </section>
        )}
      </main>

      {regionId && (
        <aside className="shell-panel" ref={panelRef} aria-label="Análisis">
          <button
            type="button"
            className="shell-sheet-handle"
            onClick={() => setSheet(NEXT_SHEET[sheet])}
            aria-label={SHEET_LABEL[sheet]}
          >
            <span aria-hidden="true" />
          </button>
          <div className="shell-panel-body">
            <ErrorBoundary zone="análisis" resetKeys={[regionId]}><AnalysisPanel /></ErrorBoundary>
          </div>
        </aside>
      )}

      <dialog className="shell-methods" ref={methodsRef} aria-label="Métodos y fuentes">
        <button type="button" className="shell-methods-close" onClick={closeMethods}>Cerrar</button>
        <ErrorBoundary zone="métodos"><MethodsSheet /></ErrorBoundary>
      </dialog>
    </div>
  )
}
