/**
 * Entrada del globo (005). Sin props: lee y escribe useAppState().
 * Une la geografía, el mapa de tendencias (archivo de 003) y la escena 3D; sin WebGL muestra la tabla.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { markWebglUnavailable, toSearch, useAppState } from '../../app/state'
import { UI_COPY, VARIABLE_COPY } from '../../content'
import { loadCatalog, loadMap, windowKey, type Catalog, type MapFile } from '../../lib/data'
import { GLOBE_COPY } from './copy'
import EarthGlobe, { type EarthGlobeHandle } from './EarthGlobe'
import Fallback from './Fallback'
import { formatSlope, type RegionRow } from './format'
import { COUNTRY_NAMES, GLOBAL_VIEW, loadGlobeFeatures, type GlobeFeature } from './geo'
import MapLegend, { type LayerStatus } from './MapLegend'
import { paletteIndex, readPalette, valuesForWindow, withAlpha } from './mapColors'
import RegionTable from './RegionTable'
import { prefersLiteTextures, textureUrls } from './textures'

/** Si el globo no arranca en este tiempo, se pasa a la vista sin WebGL. */
const TEXTURE_TIMEOUT_MS = 25_000
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const NO_BREAKS: number[] = []
const NO_LABELS: string[] = []

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    onChange => {
      const mq = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null
      mq?.addEventListener('change', onChange)
      return () => mq?.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches,
  )
}

/** Carga con reintento; `undefined` = cargando, `null` = falló. */
function useLoaded<T>(key: string, load: () => Promise<T>): { value: T | null | undefined; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; value: T | null } | null>(null)
  const id = `${key}#${attempt}`
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  useEffect(() => {
    let live = true
    loadRef.current()
      .then(value => { if (live) setResult({ id, value }) })
      .catch(() => { if (live) setResult({ id, value: null }) })
    return () => { live = false }
  }, [id])
  return { value: result?.id === id ? result.value : undefined, retry: () => setAttempt(a => a + 1) }
}

export default function GlobeStage() {
  const { regionId, variableId, from, to, webgl, setRegion } = useAppState()
  const globe = useRef<EarthGlobeHandle>(null)
  const tableDialog = useRef<HTMLDialogElement>(null)
  const [ready, setReady] = useState(false)
  const reducedMotion = useReducedMotion()
  const lite = useMemo(() => prefersLiteTextures(), [])
  const palette = useMemo(() => readPalette(), [])

  const geo = useLoaded<GlobeFeature[]>(webgl ? 'geo' : 'geo-off', () => (webgl ? loadGlobeFeatures() : Promise.resolve([])))
  const catalog = useLoaded<Catalog>('catalog', loadCatalog)
  const map = useLoaded<MapFile>(`map-${variableId}`, () => loadMap(variableId))

  // ---------- Capa de datos ----------
  const values = useMemo(
    () => (map.value ? valuesForWindow(map.value, windowKey(from, to)) : null),
    [map.value, from, to],
  )
  const status: LayerStatus = map.value === undefined ? 'loading' : map.value === null ? 'error' : values ? 'ready' : 'no-window'
  const breaks = map.value?.classes.breaks ?? NO_BREAKS
  const labels = map.value?.classes.labels ?? NO_LABELS
  const unit = map.value?.unit ?? null
  const classCount = breaks.length + 1

  const fills = useMemo(() => ({
    classes: palette.classes.map(c => withAlpha(c, palette.fillOpacity)),
    noData: withAlpha(palette.noData, 0.7),
  }), [palette])

  const regionFill = useCallback((id: string) => {
    if (!values) return undefined
    const v = values.get(id)
    if (!v || v.kind === 'no-data') return fills.noData
    return fills.classes[paletteIndex(v.classIndex, classCount, fills.classes.length)]
  }, [values, fills, classCount])

  const regionNote = useCallback((id: string) => {
    if (!values) return undefined
    const v = values.get(id)
    return v?.kind === 'value' ? `${formatSlope(v.value)} ${unit ?? ''}`.trim() : GLOBE_COPY.noData
  }, [values, unit])

  // ---------- Filas para la tabla (catálogo; si falla, los nombres del GeoJSON) ----------
  const rows = useMemo<RegionRow[]>(() => {
    const base = catalog.value
      ? catalog.value.regions.map(r => ({ id: r.id, name: r.name, country: r.country }))
      : (geo.value ?? []).flatMap(f => (f.kind === 'region' ? [f.properties] : []))
    return base.map(r => {
      const v = values?.get(r.id)
      return {
        id: r.id,
        name: r.name,
        country: COUNTRY_NAMES[r.country],
        value: v?.kind === 'value' ? v.value : null,
        label: v?.kind === 'value' ? labels[v.classIndex] ?? null : null,
      }
    })
  }, [catalog.value, geo.value, values, labels])

  const variableLabel = VARIABLE_COPY[variableId].short
  const caption = `${GLOBE_COPY.tableTitle} · ${variableLabel} · ${from}–${to}`
  const tableUnit = values ? unit : null

  // ---------- Cámara ----------
  useEffect(() => {
    if (ready && regionId) globe.current?.flyToRegion(regionId)
  }, [ready, regionId])

  const globalView = () => {
    setRegion(null)
    globe.current?.flyTo(GLOBAL_VIEW)
  }

  // ---------- Fallos de arranque: textura principal o tiempo máximo ----------
  useEffect(() => {
    if (!webgl || ready) return
    const probe = new Image()
    probe.onerror = () => markWebglUnavailable()
    probe.src = textureUrls(lite).surface
    const timer = window.setTimeout(markWebglUnavailable, TEXTURE_TIMEOUT_MS)
    return () => {
      probe.onerror = null
      window.clearTimeout(timer)
    }
  }, [webgl, ready, lite])

  const openTable = () => {
    const d = tableDialog.current
    if (d && typeof d.showModal === 'function') d.showModal()
    else d?.setAttribute('open', '')
  }
  const closeTable = () => {
    const d = tableDialog.current
    if (d && typeof d.close === 'function') d.close()
    else d?.removeAttribute('open')
  }
  const hrefFor = (id: string) => toSearch({ regionId: id, variableId, from, to }, window.location.search)
  const pick = (id: string) => {
    setRegion(id)
    closeTable()
  }

  if (!webgl) {
    return (
      <Fallback
        rows={rows}
        unit={tableUnit}
        caption={caption}
        selectedId={regionId}
        onPick={setRegion}
        hrefFor={hrefFor}
        failed={catalog.value === null}
      />
    )
  }

  return (
    <>
      {geo.value && geo.value.length > 0 && (
        <EarthGlobe
          ref={globe}
          features={geo.value}
          selectedId={regionId}
          onSelect={setRegion}
          regionFill={regionFill}
          regionNote={regionNote}
          selectedColor={palette.selected}
          decorative={status === 'error'}
          reducedMotion={reducedMotion}
          lite={lite}
          initialView={GLOBAL_VIEW}
          onReady={() => setReady(true)}
          onContextLost={markWebglUnavailable}
        />
      )}

      {!ready && (
        <p className="globe-status" role="status">
          {geo.value === null ? (
            <>
              {GLOBE_COPY.mapsError}{' '}
              <button type="button" onClick={geo.retry}>{UI_COPY.retry}</button>
            </>
          ) : GLOBE_COPY.loading}
        </p>
      )}

      <MapLegend
        status={status}
        variableLabel={variableLabel}
        unit={unit}
        breaks={breaks}
        labels={labels}
        palette={palette}
        regionCount={rows.length}
        from={from}
        to={to}
        onRetry={map.retry}
        onOpenTable={openTable}
        onGlobalView={globalView}
      />

      <dialog className="globe-table-dialog" ref={tableDialog} aria-label={GLOBE_COPY.tableTitle}>
        <button type="button" className="globe-table-close" onClick={closeTable}>{GLOBE_COPY.close}</button>
        <RegionTable rows={rows} unit={tableUnit} caption={caption} selectedId={regionId} onPick={pick} hrefFor={hrefFor} />
      </dialog>
    </>
  )
}
