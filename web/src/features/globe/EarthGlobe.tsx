import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref, type RefObject } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import { asset } from '../../lib/assets'
import { COUNTRY_NAMES, viewForGeometry, type GlobeFeature, type View } from './geo'
import './globe.css'

export interface EarthGlobeHandle {
  flyTo: (view: View, ms?: number) => void
  flyToRegion: (id: string, ms?: number) => void
}

interface Props {
  ref?: Ref<EarthGlobeHandle>
  features: GlobeFeature[]
  selectedId: string | null
  onSelect: (feature: Extract<GlobeFeature, { kind: 'region' }> | null) => void
  /** Color de relleno por región (p. ej. tendencia). Si regresa undefined se usa el color neutro. */
  regionColor?: (id: string) => string | undefined
  autoRotate: boolean
  onUserInteract?: () => void
  showClouds: boolean
  initialView: View
  onReady?: () => void
}

const TEXTURES = asset('textures')
const CLOUDS_ALT = 0.004
const CLOUDS_SPEED = -0.006 // grados por cuadro

const COLORS = {
  regionFill: 'rgba(255, 255, 255, 0.06)',
  regionHover: 'rgba(56, 189, 248, 0.45)',
  regionSelected: 'rgba(250, 204, 21, 0.55)',
  regionStroke: 'rgba(255, 255, 255, 0.75)',
  regionSide: 'rgba(255, 255, 255, 0.12)',
  countryStroke: 'rgba(255, 255, 255, 0.22)',
  transparent: 'rgba(0, 0, 0, 0)',
}

/** Tamaño real del contenedor (más fiable que window en móviles y al redimensionar). */
function useElementSize(el: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    if (!el.current) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    observer.observe(el.current)
    return () => observer.disconnect()
  }, [el])
  return size
}

export default function EarthGlobe({
  ref,
  features,
  selectedId,
  onSelect,
  regionColor,
  autoRotate,
  onUserInteract,
  showClouds,
  initialView,
  onReady,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const cloudsRef = useRef<THREE.Mesh | null>(null)
  const initialViewRef = useRef(initialView) // solo se aplica al arrancar
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { w, h } = useElementSize(containerRef)

  // Material del océano con brillo especular (reflejo del sol en el agua).
  const globeMaterial = useMemo(() => {
    const material = new THREE.MeshPhongMaterial()
    material.bumpScale = 10
    new THREE.TextureLoader().load(`${TEXTURES}/earth-water.png`, tex => {
      material.specularMap = tex
      material.specular = new THREE.Color('#5a6b80')
      material.shininess = 18
      material.needsUpdate = true
    })
    return material
  }, [])

  useImperativeHandle(ref, () => ({
    flyTo: (view, ms = 1500) => globeRef.current?.pointOfView(view, ms),
    flyToRegion: (id, ms = 1500) => {
      const f = features.find(x => x.kind === 'region' && x.properties.id === id)
      if (f) globeRef.current?.pointOfView(viewForGeometry(f.geometry), ms)
    },
  }), [features])

  // Configuración inicial de cámara, controles y capa de nubes.
  useEffect(() => {
    const globe = globeRef.current
    if (!ready || !globe) return

    globe.pointOfView(initialViewRef.current, 0)
    const controls = globe.controls()
    controls.autoRotateSpeed = 0.35
    controls.minDistance = globe.getGlobeRadius() * 1.15
    controls.maxDistance = globe.getGlobeRadius() * 6
    controls.enableDamping = true

    let frame = 0
    let disposed = false
    let clouds: THREE.Mesh | null = null
    new THREE.TextureLoader().load(`${TEXTURES}/clouds.png`, tex => {
      if (disposed) return
      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globe.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }),
      )
      cloudsRef.current = clouds
      globe.scene().add(clouds)
      const spin = () => {
        if (clouds) clouds.rotation.y += (CLOUDS_SPEED * Math.PI) / 180
        frame = requestAnimationFrame(spin)
      }
      spin()
    })

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      if (clouds) {
        globe.scene().remove(clouds)
        clouds.geometry.dispose()
        ;(clouds.material as THREE.Material).dispose()
      }
      cloudsRef.current = null
    }
  }, [ready])

  useEffect(() => {
    const globe = globeRef.current
    if (ready && globe) globe.controls().autoRotate = autoRotate
  }, [ready, autoRotate])

  useEffect(() => {
    if (cloudsRef.current) cloudsRef.current.visible = showClouds
  }, [showClouds, ready])

  // Avisar al padre cuando el usuario arrastra el globo (para pausar la rotación).
  useEffect(() => {
    const globe = globeRef.current
    if (!ready || !globe || !onUserInteract) return
    const controls = globe.controls()
    controls.addEventListener('start', onUserInteract)
    return () => controls.removeEventListener('start', onUserInteract)
  }, [ready, onUserInteract])

  const capColor = (obj: object) => {
    const f = obj as GlobeFeature
    if (f.kind === 'country') return COLORS.transparent
    const id = f.properties.id
    if (id === selectedId) return COLORS.regionSelected
    if (id === hoverId) return COLORS.regionHover
    return regionColor?.(id) ?? COLORS.regionFill
  }

  const altitude = (obj: object) => {
    const f = obj as GlobeFeature
    if (f.kind === 'country') return 0.006
    const id = f.properties.id
    return id === selectedId || id === hoverId ? 0.02 : 0.008
  }

  return (
    <div ref={containerRef} className="globe-container">
    <Globe
      ref={globeRef}
      width={w}
      height={h}
      onGlobeReady={() => {
        setReady(true)
        onReady?.()
      }}
      animateIn
      globeImageUrl={`${TEXTURES}/earth-blue-marble.jpg`}
      bumpImageUrl={`${TEXTURES}/earth-topology.png`}
      backgroundImageUrl={`${TEXTURES}/night-sky.png`}
      globeMaterial={globeMaterial}
      showAtmosphere
      atmosphereColor="#7cc4ff"
      atmosphereAltitude={0.2}
      polygonsData={features}
      polygonCapColor={capColor}
      polygonSideColor={(obj: object) =>
        (obj as GlobeFeature).kind === 'region' ? COLORS.regionSide : COLORS.transparent}
      polygonStrokeColor={(obj: object) =>
        (obj as GlobeFeature).kind === 'region' ? COLORS.regionStroke : COLORS.countryStroke}
      polygonAltitude={altitude}
      polygonsTransitionDuration={250}
      polygonLabel={(obj: object) => {
        const f = obj as GlobeFeature
        return f.kind === 'region'
          ? `<div class="globe-tooltip"><b>${f.properties.name}</b><span>${COUNTRY_NAMES[f.properties.country]} · Clic para investigar</span></div>`
          : ''
      }}
      onPolygonHover={(obj: object | null) => {
        const f = obj as GlobeFeature | null
        setHoverId(f?.kind === 'region' ? f.properties.id : null)
        document.body.style.cursor = f?.kind === 'region' ? 'pointer' : ''
      }}
      onPolygonClick={(obj: object) => {
        const f = obj as GlobeFeature
        onSelect(f.kind === 'region' ? f : null)
      }}
      onGlobeClick={() => onSelect(null)}
    />
    </div>
  )
}
