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
import CloseButton from '../lib/ui/CloseButton'
import { ChevronIcon } from '../lib/ui/icons'
import { loadCatalog, variableIds, variablePeriod } from '../lib/data'
import ErrorBoundary from './ErrorBoundary'
import { configureState, dismissStateNotice, markWebglUnavailable, useAppState, useStateNotice } from './state'
import { useMapPlaybackPlaying } from './playback'
import './shell.css'

/** Igual que el punto de corte de shell.css. */
export const DESKTOP_QUERY = '(min-width: 900px), (min-width: 600px) and (max-height: 500px)'
/** Pantallas donde la bienvenida y la hoja van acopladas abajo (incluye teléfonos en horizontal). */
const COMPACT_QUERY = '(max-width: 899px), (max-height: 500px)'

type Sheet = 'peek' | 'half' | 'full'
const NEXT_SHEET: Record<Sheet, Sheet> = { peek: 'half', half: 'full', full: 'peek' }
/** Lo que hará el asa al tocarla; se lee en la propia asa, junto a una flecha con la dirección. */
const SHEET_LABEL: Record<Sheet, string> = { peek: 'Show analysis', half: 'Expand analysis', full: 'Show globe' }

function setInsets(right: number, bottom: number) {
  const s = document.documentElement.style
  s.setProperty('--panel-inset-right', `${Math.round(right)}px`)
  s.setProperty('--panel-inset-bottom', `${Math.round(bottom)}px`)
}

export default function Shell() {
  const { regionId, compareId, variableId, from, to, webgl } = useAppState()
  const playing = useMapPlaybackPlaying({ regionId, compareId, variableId, from, to })
  const notice = useStateNotice()
  const [catalogFailed, setCatalogFailed] = useState(false)
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  // Una región nueva empieza con su resumen (asomada); ampliar es una decisión explícita.
  const [sheetFor, setSheetFor] = useState<{ region: string | null; sheet: Sheet }>({ region: null, sheet: 'peek' })
  const [wasPlaying, setWasPlaying] = useState(playing)
  if (playing !== wasPlaying) {
    setWasPlaying(playing)
    if (playing && webgl && !window.matchMedia?.(DESKTOP_QUERY).matches) setSheetFor({ region: regionId, sheet: 'peek' })
  }
  const sheet: Sheet = sheetFor.region === regionId ? sheetFor.sheet : 'peek'
  const setSheet = (next: Sheet) => setSheetFor({ region: regionId, sheet: next })
  const panelRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const methodsRef = useRef<HTMLDialogElement>(null)
  const welcomeRef = useRef<HTMLElement>(null)
  const panelBodyRef = useRef<HTMLDivElement>(null)

  // En móvil, Play despeja el globo y mantiene un control de pausa visible en la leyenda.
  useEffect(() => {
    if (!playing || !webgl || window.matchMedia?.(DESKTOP_QUERY).matches) return
    if (panelRef.current?.contains(document.activeElement)) {
      document.querySelector<HTMLButtonElement>('[aria-label="Pause map playback"]')?.focus({ preventScroll: true })
    }
  }, [playing, regionId, webgl])

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

  // Zona que ocupa el panel sobre el escenario.
  useLayoutEffect(() => {
    // Con región, lo que tapa es el panel; sin ella, en móvil, la bienvenida (va acoplada abajo como la hoja).
    const panel = panelRef.current ?? welcomeRef.current
    const stage = stageRef.current
    if (!panel || !stage) { setInsets(0, 0); return }
    const isPanel = panel === panelRef.current
    const measure = () => {
      const p = panel.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const compact = window.matchMedia?.(COMPACT_QUERY).matches
      // Sin WebGL no hay globo que despejar: la bienvenida no reserva sitio.
      if (!isPanel && (!compact || !webgl)) setInsets(0, 0)
      else if (window.matchMedia?.(DESKTOP_QUERY).matches) setInsets(isPanel ? Math.max(0, s.right - p.left) : 0, 0)
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
          <ErrorBoundary zone="search"><QueryBar /></ErrorBoundary>
        </div>
        <button type="button" className="shell-help" onClick={openMethods} aria-haspopup="dialog">
          Methods
        </button>
      </header>

      {(notice || catalogFailed) && (
        <div className="shell-notices">
          {notice && (
            <p className="shell-notice" role="status">
              {notice}
              <CloseButton label="Dismiss notice" onClick={dismissStateNotice} />
            </p>
          )}
          {catalogFailed && (
            <p className="shell-notice" role="alert">
              We could not load the data catalog.
              <button type="button" onClick={() => setCatalogAttempt(a => a + 1)}>{UI_COPY.retry}</button>
            </p>
          )}
        </div>
      )}

      <main className="shell-stage" ref={stageRef} aria-label="Globe" data-webgl={webgl}>
        <ErrorBoundary zone="globe" onError={markWebglUnavailable} resetKeys={[webgl]}>
          <GlobeStage />
        </ErrorBoundary>
        {!regionId && (
          <section className="shell-welcome" ref={welcomeRef} aria-label="Welcome">
            <ErrorBoundary zone="welcome"><WelcomeCard /></ErrorBoundary>
          </section>
        )}
      </main>

      {regionId && (
        <aside className="shell-panel" ref={panelRef} aria-label="Analysis">
          <div className="shell-sheet-controls">
            <button
              type="button"
              className="shell-sheet-handle"
              onClick={() => setSheet(NEXT_SHEET[sheet])}
              aria-controls="analysis-panel-body"
            >
              <span className="shell-sheet-grip" aria-hidden="true" />
              <span className="shell-sheet-action">
                <ChevronIcon size={16} up={sheet !== 'full'} />
                {SHEET_LABEL[sheet]}
              </span>
            </button>
            {sheet === 'half' && (
              <button type="button" className="shell-sheet-back" onClick={() => setSheet('peek')} aria-controls="analysis-panel-body">
                Show globe
              </button>
            )}
          </div>
          <div
            className="shell-panel-body" id="analysis-panel-body" ref={panelBodyRef}
            onFocusCapture={e => {
              // El resumen recorta el contenido: al tabular hacia él, ampliarlo antes de leerlo.
              if (sheet !== 'peek' || window.matchMedia?.(DESKTOP_QUERY).matches) return
              const target = e.target
              // El navegador puede desplazar incluso overflow:hidden antes de emitir focus.
              // La cabecera sigue operable en el resumen; el resto necesita la hoja abierta.
              if (target.closest('.panel-header')) return
              setSheet('full')
              requestAnimationFrame(() => target.scrollIntoView?.({ block: 'nearest' }))
            }}
          >
            {/* 007: con una segunda región (vs=) el panel muestra la comparación; sin ella, el análisis y su entrada. */}
            {compareId ? (
              <ErrorBoundary zone="comparison" resetKeys={[regionId, compareId]}><ComparePanel /></ErrorBoundary>
            ) : (
              <>
                <ErrorBoundary zone="analysis" resetKeys={[regionId]}><AnalysisPanel /></ErrorBoundary>
                <ErrorBoundary zone="comparison" resetKeys={[regionId]}><CompareEntry /></ErrorBoundary>
              </>
            )}
          </div>
        </aside>
      )}

      <dialog
        className="dialog shell-methods" ref={methodsRef} aria-labelledby="methods-title"
        onClick={e => { if (e.target === e.currentTarget) closeMethods() }}
      >
        <div className="dialog-bar">
          <h2 className="dialog-title" id="methods-title">Methods and sources</h2>
          <CloseButton label={UI_COPY.close} onClick={closeMethods} />
        </div>
        <div className="dialog-body">
          <ErrorBoundary zone="methods"><MethodsSheet /></ErrorBoundary>
        </div>
      </dialog>
    </div>
  )
}
