/**
 * ESBOZO de 002 (T007): el globo del prototipo conectado a useAppState. Dueño tras la fusión: 005.
 * Pendiente de 005: desplazamiento según --panel-inset-*, Fallback con tabla, mapa coloreado, pausa en reposo.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState } from '../../app/state'
import { UI_COPY } from '../../content'
import EarthGlobe, { type EarthGlobeHandle } from './EarthGlobe'
import { GLOBAL_VIEW, loadGlobeFeatures, type GlobeFeature } from './geo'

export default function GlobeStage() {
  const { regionId, webgl, setRegion } = useAppState()
  const globe = useRef<EarthGlobeHandle>(null)
  const [features, setFeatures] = useState<GlobeFeature[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [userStopped, setUserStopped] = useState(false)

  useEffect(() => {
    if (!webgl) return
    loadGlobeFeatures().then(setFeatures).catch(() => setError(true))
  }, [webgl])

  useEffect(() => {
    if (ready && regionId) globe.current?.flyToRegion(regionId)
  }, [ready, regionId, features])

  const stop = useCallback(() => setUserStopped(true), [])

  if (!webgl) {
    return (
      <div className="stub stub-globe-fallback" role="status">
        <span className="stub-tag">Esbozo · 005</span>
        <p>{UI_COPY.noWebgl}</p>
      </div>
    )
  }

  return (
    <>
      {features.length > 0 && (
        <EarthGlobe
          ref={globe}
          features={features}
          selectedId={regionId}
          onSelect={f => setRegion(f?.properties.id ?? null)}
          autoRotate={!regionId && !userStopped}
          onUserInteract={stop}
          showClouds={!regionId}
          initialView={GLOBAL_VIEW}
          onReady={() => setReady(true)}
        />
      )}
      {!ready && (
        <p className="stub-globe-loading" role="status">
          {error ? 'No se pudieron cargar los mapas.' : 'Cargando la Tierra…'}
        </p>
      )}
      <div className="stub stub-globe-tools">
        <span className="stub-tag">Esbozo · 005</span>
        <button type="button" onClick={() => { setRegion(null); globe.current?.flyTo(GLOBAL_VIEW) }}>Vista global</button>
      </div>
    </>
  )
}
