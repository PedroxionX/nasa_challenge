/**
 * Armazón adaptable (002 T005): cabecera, escenario y panel (escritorio) u hoja inferior (móvil).
 * Coloca las entradas de features/ sin props; cada una lee useAppState().
 * Expone en :root --panel-inset-right y --panel-inset-bottom (px) para que el globo sepa qué zona queda libre.
 * Solo 002 edita este archivo.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnalysisPanel } from '../features/analysis'
import { CompareEntry, ComparePanel } from '../features/compare'
import { GlobeStage } from '../features/globe'
import { MethodsSheet, WelcomeCard } from '../features/guide'
import { QueryBar } from '../features/query'
import { UI_COPY } from '../content'
import { loadCatalog, variableIds, variablePeriod } from '../lib/data'
import ErrorBoundary from './ErrorBoundary'
import { configureState, dismissStateNotice, markWebglUnavailable, useAppState, useStateNotice } from './state'
import './shell.css'

/** Igual que el punto de corte de shell.css. */
export const DESKTOP_QUERY = '(min-width: 900px), (min-width: 600px) and (max-height: 500px)'

type Sheet = 'peek' | 'half' | 'full'
const NEXT_SHEET: Record<Sheet, Sheet> = { peek: 'half', half: 'full', full: 'peek' }
const SHEET_LABEL: Record<Sheet, string> = { peek: 'Ver análisis', half: 'Ampliar análisis', full: 'Ver globo' }

function setInsets(right: number, bottom: number) {
  const s = document.documentElement.style
  s.setProperty('--panel-inset-right', `${Math.round(right)}px`)
  s.setProperty('--panel-inset-bottom', `${Math.round(bottom)}px`)
}

export default function Shell() {
  const { regionId, compareId, variableId, webgl } = useAppState()
  const notice = useStateNotice()
  const [catalogFailed, setCatalogFailed] = useState(false)
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  // Una región nueva empieza con su resumen; ampliar es una decisión explícita.
  const [sheetFor, setSheetFor] = useState<{ region: string | null; sheet: Sheet }>({ region: null, sheet: 'peek' })
  const sheet: Sheet = sheetFor.region === regionId ? sheetFor.sheet : 'peek'
  const setSheet = (next: Sheet) => setSheetFor({ region: regionId, sheet: next })
  const panelRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const welcomeRef = useRef<HTMLElement>(null)
  const panelBodyRef = useRef<HTMLDivElement>(null)
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
          variableIds: variableIds(c),
          periods: Object.fromEntries(variableIds(c).map(id => [id, variablePeriod(c, id)])),
        })
      })
      .catch(() => live && setCatalogFailed(true))
    return () => { live = false }
  }, [catalogAttempt])

  // Cada consulta empieza desde el título, incluso después de leer hasta el final de otra.
  useLayoutEffect(() => {
    if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0
  }, [regionId, compareId, variableId])

  useLayoutEffect(() => {
    if (sheet === 'peek' && panelBodyRef.current) panelBodyRef.current.scrollTop = 0
  }, [sheet])

  // Zona ocupada por el panel o por la bienvenida compacta sobre el escenario.
  useLayoutEffect(() => {
    const panel = panelRef.current ?? welcomeRef.current
    const stage = stageRef.current
    if (!panel || !stage) { setInsets(0, 0); return }
    const measure = () => {
      const p = panel.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const compact = window.matchMedia?.('(max-width: 899px), (max-height: 500px)').matches
      if (!regionId && (!compact || !webgl)) setInsets(0, 0)
      else if (window.matchMedia?.(DESKTOP_QUERY).matches) setInsets(Math.max(0, s.right - p.left), 0)
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
  }, [regionId, sheet, webgl])

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
          <section className="shell-welcome" ref={welcomeRef} aria-label="Bienvenida">
            <ErrorBoundary zone="bienvenida"><WelcomeCard /></ErrorBoundary>
          </section>
        )}
      </main>

      {regionId && (
        <aside className="shell-panel" ref={panelRef} aria-label="Análisis">
          <div className="shell-sheet-controls">
          <button
            type="button"
            className="shell-sheet-handle"
            onClick={() => setSheet(NEXT_SHEET[sheet])}
            aria-label={SHEET_LABEL[sheet]}
            aria-controls="analysis-panel-body"
          >
            <span aria-hidden="true" />
            <span className="shell-sheet-action">{SHEET_LABEL[sheet]}</span>
          </button>
          {sheet === 'half' && (
            <button type="button" className="shell-sheet-back" onClick={() => setSheet('peek')} aria-controls="analysis-panel-body">Ver globo</button>
          )}
          </div>
          <div className="shell-panel-body" id="analysis-panel-body" ref={panelBodyRef}>
            {/* 007: con una segunda región (vs=) el panel muestra la comparación; sin ella, el análisis y su entrada. */}
            {compareId ? (
              <ErrorBoundary zone="comparación" resetKeys={[regionId, compareId]}><ComparePanel /></ErrorBoundary>
            ) : (
              <>
                <ErrorBoundary zone="análisis" resetKeys={[regionId]}><AnalysisPanel /></ErrorBoundary>
                <ErrorBoundary zone="comparación" resetKeys={[regionId]}><CompareEntry /></ErrorBoundary>
              </>
            )}
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
