import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EarthGlobe, { type EarthGlobeHandle } from './components/EarthGlobe'
import RegionPanel from './components/RegionPanel'
import {
  COUNTRY_NAMES,
  COUNTRY_VIEWS,
  GLOBAL_VIEW,
  loadGlobeFeatures,
  type CountryCode,
  type GlobeFeature,
  type RegionProps,
} from './lib/geo'

const COUNTRIES = Object.keys(COUNTRY_NAMES) as CountryCode[]

export default function App() {
  const globe = useRef<EarthGlobeHandle>(null)
  const [features, setFeatures] = useState<GlobeFeature[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<RegionProps | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [showClouds, setShowClouds] = useState(true)

  useEffect(() => {
    loadGlobeFeatures()
      .then(setFeatures)
      .catch(() => setError('No se pudieron cargar los mapas.'))
  }, [])

  const regions = useMemo(
    () => features
      .flatMap(f => (f.kind === 'region' ? [f.properties] : []))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [features],
  )

  const selectRegion = useCallback((region: RegionProps | null) => {
    setSelected(region)
    if (region) {
      setAutoRotate(false)
      globe.current?.flyToRegion(region.id)
    }
  }, [])

  const stopRotation = useCallback(() => setAutoRotate(false), [])

  return (
    <main className="app">
      {features.length > 0 && (
        <EarthGlobe
          ref={globe}
          features={features}
          selectedId={selected?.id ?? null}
          onSelect={f => selectRegion(f?.properties ?? null)}
          autoRotate={autoRotate}
          onUserInteract={stopRotation}
          showClouds={showClouds}
          initialView={GLOBAL_VIEW}
          onReady={() => setReady(true)}
        />
      )}

      {!ready && (
        <div className="loader">
          {error ?? <><span className="spinner" />Cargando la Tierra…</>}
        </div>
      )}

      <header className="brand">
        <h1>Trend Detective</h1>
        <p>NASA Space Apps 2026 · Earth System Trend Detective</p>
      </header>

      <nav className="toolbar" aria-label="Controles del globo">
        {COUNTRIES.map(c => (
          <button key={c} onClick={() => { setAutoRotate(false); globe.current?.flyTo(COUNTRY_VIEWS[c]) }}>
            {COUNTRY_NAMES[c]}
          </button>
        ))}
        <button onClick={() => { setSelected(null); globe.current?.flyTo(GLOBAL_VIEW) }}>Vista global</button>
        <button className={autoRotate ? 'active' : ''} onClick={() => setAutoRotate(r => !r)}>
          {autoRotate ? 'Pausar rotación' : 'Rotar'}
        </button>
        <button className={showClouds ? 'active' : ''} onClick={() => setShowClouds(c => !c)}>Nubes</button>
        <select
          value={selected?.id ?? ''}
          onChange={e => selectRegion(regions.find(r => r.id === e.target.value) ?? null)}
          aria-label="Ir a un estado"
        >
          <option value="">Ir a un estado…</option>
          {COUNTRIES.map(c => (
            <optgroup key={c} label={COUNTRY_NAMES[c]}>
              {regions.filter(r => r.country === c).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </optgroup>
          ))}
        </select>
      </nav>

      <RegionPanel region={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
