/**
 * Escena 3D (005). Reparto de responsabilidades:
 *  · React (GlobeStage) posee el estado y decide qué se pinta.
 *  · react-globe.gl posee renderizador, cámara, controles y bucle de dibujo.
 *  · Este componente posee solo lo que crea —material del globo, textura especular, nubes y
 *    líneas de fronteras— y lo libera al desmontar.
 * El bucle se pausa en reposo y se reanuda con cualquier actividad (SC-G01).
 */
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref, type RefObject } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import { buildBorderLines } from './borders'
import { altitudeFactor, readInsets, viewOffsetFor } from './camera'
import { GLOBE_COPY } from './copy'
import { COUNTRY_NAMES, viewForGeometry, type GlobeFeature, type View } from './geo'
import { dropTinyParts } from './simplify'
import { textureUrls } from './textures'
import './globe.css'

export interface EarthGlobeHandle {
  flyTo: (view: View, ms?: number) => void
  flyToRegion: (id: string, ms?: number) => void
}

type RegionFeature = Extract<GlobeFeature, { kind: 'region' }>

interface Props {
  ref?: Ref<EarthGlobeHandle>
  features: GlobeFeature[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Relleno por región según los datos. `undefined` ⇒ relleno neutro. */
  regionFill?: (id: string) => string | undefined
  /** Segunda línea del tooltip (valor de la región o «Sin datos»). */
  regionNote?: (id: string) => string | undefined
  /** Color del contorno de la región elegida. */
  selectedColor: string
  /** Modo decorativo: nubes y rotación. Solo cuando no hay capa de datos que leer (FR-G02). */
  decorative: boolean
  reducedMotion: boolean
  /** Texturas de 2048 px en pantallas pequeñas o táctiles. */
  lite: boolean
  initialView: View
  onReady?: () => void
  onContextLost?: () => void
}

const CLOUDS_ALT = 0.004
const CLOUDS_SPEED = -0.006 // grados por cuadro
const BORDER_ALT = 0.004
const BORDER_OPACITY = 0.24
const ALT_BASE = 0.008
const ALT_HOVER = 0.016
const ALT_SELECTED = 0.045
const PIN_ALT = 0.07
/** Partes de un MultiPolygon menores que esto (grados²) no se dibujan: islas diminutas. */
const MIN_PART_AREA = 0.02
const MAX_ALTITUDE = 2.6
/** Resolución angular de las tapas: más fina que la de serie (5°) para polígonos cóncavos como Texas. */
const CAP_RESOLUTION = 3
const FLY_MS = 1500
const OFFSET_MS = 350
const IDLE_MS = 2500
const START_MS = 4000

const COLORS = {
  neutral: 'rgba(255, 255, 255, 0.06)',
  side: 'rgba(255, 255, 255, 0.10)',
  stroke: 'rgba(255, 255, 255, 0.55)',
}

/** `rgba(r, g, b, a)` o hexadecimal → color y opacidad para un material. */
function parseColor(css: string): { color: THREE.Color; opacity: number } {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(css.trim())
  if (!m) return { color: new THREE.Color(css), opacity: 1 }
  return { color: new THREE.Color(`rgb(${m[1]}, ${m[2]}, ${m[3]})`), opacity: m[4] === undefined ? 1 : Number(m[4]) }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const regionId = (obj: object) => (obj as RegionFeature).properties.id

/** Tamaño real del contenedor (más fiable que window en móviles y al redimensionar). */
function useElementSize(el: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    if (!el.current || typeof ResizeObserver === 'undefined') return
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
  regionFill,
  regionNote,
  selectedColor,
  decorative,
  reducedMotion,
  lite,
  initialView,
  onReady,
  onContextLost,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const { w, h } = useElementSize(containerRef)
  const [ready, setReady] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [userMoved, setUserMoved] = useState(false)

  const touch = useMemo(() => typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches, [])
  const urls = useMemo(() => textureUrls(lite), [lite])
  const regions = useMemo(
    () => features
      .filter((f): f is RegionFeature => f.kind === 'region')
      .map(f => ({ ...f, geometry: dropTinyParts(f.geometry, MIN_PART_AREA) })),
    [features],
  )
  const countries = useMemo(() => features.filter(f => f.kind === 'country'), [features])
  const rotating = decorative && !reducedMotion && !userMoved

  // Valores vigentes para temporizadores y oyentes (se sincronizan en efectos).
  const initialViewRef = useRef(initialView) // solo se aplica al arrancar
  const sizeRef = useRef({ w, h })
  const rotatingRef = useRef(rotating)
  const selectedRef = useRef(selectedId)
  const contextLostRef = useRef(onContextLost)
  const sleepTimer = useRef<number | undefined>(undefined)
  const offsetRef = useRef({ x: 0, y: 0 })
  const offsetFrame = useRef(0)
  const lastInsets = useRef('')

  useEffect(() => { contextLostRef.current = onContextLost }, [onContextLost])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  // ---------- Pausa en reposo ----------
  /** Reanuda el dibujo y programa la pausa. Mientras rota (modo decorativo) no se pausa. */
  const wake = useCallback((ms: number = IDLE_MS) => {
    const globe = globeRef.current
    if (!globe) return
    globe.resumeAnimation()
    window.clearTimeout(sleepTimer.current)
    sleepTimer.current = window.setTimeout(() => {
      if (!rotatingRef.current) globeRef.current?.pauseAnimation()
    }, ms)
  }, [])
  const onActivity = useCallback(() => wake(), [wake])

  // ---------- Cámara ----------
  const flyRegion = useCallback((id: string, ms: number) => {
    const f = regions.find(r => r.properties.id === id)
    const globe = globeRef.current
    if (!f || !globe) return
    const view = viewForGeometry(f.geometry)
    const factor = altitudeFactor(sizeRef.current.w, sizeRef.current.h, readInsets())
    const duration = reducedMotion ? 0 : ms
    globe.pointOfView({ ...view, altitude: Math.min(MAX_ALTITUDE, view.altitude * factor) }, duration)
    wake(duration + IDLE_MS)
  }, [regions, reducedMotion, wake])

  useImperativeHandle(ref, () => ({
    flyTo: (view, ms = FLY_MS) => {
      const duration = reducedMotion ? 0 : ms
      globeRef.current?.pointOfView(view, duration)
      wake(duration + IDLE_MS)
    },
    flyToRegion: (id, ms = FLY_MS) => flyRegion(id, ms),
  }), [flyRegion, reducedMotion, wake])

  /** Centra la escena en la zona que el panel deja libre (sin cambiar el tamaño del lienzo). */
  const syncInsets = useCallback((animate: boolean) => {
    const globe = globeRef.current
    if (!globe) return
    const { w: width, h: height } = sizeRef.current
    const camera = globe.camera() as THREE.PerspectiveCamera
    const apply = (x: number, y: number) => {
      if (x < 0.5 && y < 0.5) camera.clearViewOffset()
      else camera.setViewOffset(width, height, x, y, width, height)
      offsetRef.current = { x, y }
    }
    const insets = readInsets()
    const target = viewOffsetFor(width, height, insets)
    const from = offsetRef.current
    cancelAnimationFrame(offsetFrame.current)

    const key = `${insets.right}|${insets.bottom}|${width}|${height}`
    const changed = key !== lastInsets.current
    lastInsets.current = key

    const still = Math.abs(from.x - target.x) < 1 && Math.abs(from.y - target.y) < 1
    if (!animate || reducedMotion || still) {
      apply(target.x, target.y)
      wake()
    } else {
      const t0 = performance.now()
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / OFFSET_MS)
        const eased = 1 - (1 - k) ** 3
        apply(from.x + (target.x - from.x) * eased, from.y + (target.y - from.y) * eased)
        if (k < 1) offsetFrame.current = requestAnimationFrame(step)
      }
      wake(OFFSET_MS + IDLE_MS)
      offsetFrame.current = requestAnimationFrame(step)
    }
    // La zona libre cambió con una región abierta: reajustar la distancia.
    if (changed && animate && selectedRef.current) flyRegion(selectedRef.current, 400)
  }, [flyRegion, reducedMotion, wake])

  useEffect(() => {
    sizeRef.current = { w, h }
    if (ready) syncInsets(false)
  }, [ready, w, h, syncInsets])

  useEffect(() => {
    if (!ready || typeof MutationObserver === 'undefined') return
    // El armazón escribe --panel-inset-* en el atributo style de <html>.
    const observer = new MutationObserver(() => syncInsets(true))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [ready, syncInsets])

  // ---------- Arranque: cámara, controles y pérdida de contexto ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!ready || !globe) return

    globe.pointOfView(initialViewRef.current, 0)
    const controls = globe.controls()
    controls.autoRotateSpeed = 0.35
    controls.minDistance = globe.getGlobeRadius() * 1.15
    controls.maxDistance = globe.getGlobeRadius() * 6
    controls.enableDamping = true

    const onStart = () => { setUserMoved(true); wake() }
    const onEnd = () => wake()
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)

    const canvas = globe.renderer().domElement
    const onLost = (e: Event) => { e.preventDefault(); contextLostRef.current?.() }
    canvas.addEventListener('webglcontextlost', onLost)

    wake(START_MS)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      canvas.removeEventListener('webglcontextlost', onLost)
      window.clearTimeout(sleepTimer.current)
      cancelAnimationFrame(offsetFrame.current)
      document.body.style.cursor = ''
    }
  }, [ready, wake])

  useEffect(() => {
    rotatingRef.current = rotating
    const globe = globeRef.current
    if (!ready || !globe) return
    globe.controls().autoRotate = rotating
    wake()
  }, [ready, rotating, wake])

  // ---------- Recursos propios ----------
  // Material del océano con brillo especular (reflejo del sol en el agua).
  const globeMaterial = useMemo(() => {
    const material = new THREE.MeshPhongMaterial()
    material.bumpScale = 10
    return material
  }, [])

  useEffect(() => {
    let disposed = false
    let texture: THREE.Texture | null = null
    new THREE.TextureLoader().load(urls.water, tex => {
      if (disposed) { tex.dispose(); return }
      texture = tex
      globeMaterial.specularMap = tex
      globeMaterial.specular = new THREE.Color('#5a6b80')
      globeMaterial.shininess = 18
      globeMaterial.needsUpdate = true
      wake()
    })
    return () => {
      disposed = true
      globeMaterial.specularMap = null
      texture?.dispose() // liberar el material no libera sus texturas
      globeMaterial.dispose()
    }
  }, [globeMaterial, urls.water, wake])

  // Fronteras de fondo: una sola geometría de líneas.
  useEffect(() => {
    const globe = globeRef.current
    if (!ready || !globe || countries.length === 0) return
    const lines = buildBorderLines(
      countries.map(c => c.geometry),
      (lat, lng) => globe.getCoords(lat, lng, BORDER_ALT),
      BORDER_OPACITY,
    )
    globe.scene().add(lines)
    wake()
    return () => {
      globe.scene().remove(lines)
      lines.geometry.dispose()
      ;(lines.material as THREE.Material).dispose()
    }
  }, [ready, countries, wake])

  // Nubes: solo en modo decorativo; la textura no se descarga si no hacen falta.
  useEffect(() => {
    const globe = globeRef.current
    if (!ready || !globe || !decorative) return
    let frame = 0
    let disposed = false
    let mesh: THREE.Mesh | null = null
    let texture: THREE.Texture | null = null
    new THREE.TextureLoader().load(urls.clouds, tex => {
      if (disposed) { tex.dispose(); return }
      texture = tex
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(globe.getGlobeRadius() * (1 + CLOUDS_ALT), 64, 64),
        new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }),
      )
      globe.scene().add(mesh)
      const spin = () => {
        if (mesh && rotatingRef.current) mesh.rotation.y += (CLOUDS_SPEED * Math.PI) / 180
        frame = requestAnimationFrame(spin)
      }
      spin()
      wake()
    })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      if (mesh) {
        globe.scene().remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      texture?.dispose()
      wake()
    }
  }, [ready, decorative, urls.clouds, wake])

  // ---------- Apariencia de las regiones ----------
  // Un material por color, compartido y de una sola pasada: los de serie son de doble cara
  // y transparentes, y three.js los dibuja dos veces cada uno.
  const materials = useRef(new Map<string, THREE.MeshLambertMaterial>())
  const materialFor = useCallback((css: string) => {
    let material = materials.current.get(css)
    if (!material) {
      const { color, opacity } = parseColor(css)
      material = new THREE.MeshLambertMaterial({
        color, opacity, transparent: opacity < 1, side: THREE.DoubleSide, forceSinglePass: true,
      })
      materials.current.set(css, material)
    }
    return material
  }, [])
  useEffect(() => {
    const cache = materials.current
    return () => {
      for (const m of cache.values()) m.dispose()
      cache.clear()
    }
  }, [])

  // El relleno queda para los datos; la selección se marca con contorno, elevación y etiqueta (FR-G01).
  const capMaterial = useCallback(
    (obj: object) => materialFor(regionFill?.(regionId(obj)) ?? COLORS.neutral),
    [regionFill, materialFor],
  )
  const sideMaterial = useCallback(
    (obj: object) => materialFor(regionId(obj) === selectedId ? selectedColor : COLORS.side),
    [selectedId, selectedColor, materialFor],
  )
  const pins = useMemo(() => {
    const f = regions.find(r => r.properties.id === selectedId)
    if (!f) return []
    const { lat, lng } = viewForGeometry(f.geometry)
    return [{ lat, lng, name: f.properties.name }]
  }, [regions, selectedId])
  const pinElement = useCallback((d: object) => {
    const el = document.createElement('div')
    el.className = 'globe-pin'
    el.textContent = (d as { name: string }).name
    return el
  }, [])
  const strokeColor = useCallback((obj: object) => {
    const id = regionId(obj)
    return id === selectedId || id === hoverId ? selectedColor : COLORS.stroke
  }, [selectedId, hoverId, selectedColor])
  const altitude = useCallback((obj: object) => {
    const id = regionId(obj)
    return id === selectedId ? ALT_SELECTED : id === hoverId ? ALT_HOVER : ALT_BASE
  }, [selectedId, hoverId])
  const label = useCallback((obj: object) => {
    if (touch) return '' // en táctil no hay puntero: un tooltip se quedaría fijo
    const { id, name, country } = (obj as RegionFeature).properties
    const note = regionNote?.(id)
    return `<div class="globe-tooltip"><b>${escapeHtml(name)}</b>`
      + (note ? `<span class="globe-tooltip-value">${escapeHtml(note)}</span>` : '')
      + `<span>${escapeHtml(COUNTRY_NAMES[country])} · ${GLOBE_COPY.tooltipHint}</span></div>`
  }, [touch, regionNote])

  // Cualquier cambio visible necesita cuadros para dibujarse.
  useEffect(() => {
    if (ready) wake()
  }, [ready, wake, capMaterial, sideMaterial, strokeColor, altitude, regions, pins])

  return (
    <div
      ref={containerRef}
      className="globe-container"
      onPointerMove={onActivity}
      onPointerDown={onActivity}
      onWheel={onActivity}
      onTouchStart={onActivity}
    >
      <Globe
        ref={globeRef}
        width={w}
        height={h}
        onGlobeReady={() => {
          setReady(true)
          onReady?.()
        }}
        animateIn={!reducedMotion}
        globeImageUrl={urls.surface}
        bumpImageUrl={urls.bump}
        backgroundImageUrl={urls.sky}
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#7cc4ff"
        atmosphereAltitude={0.2}
        polygonsData={regions}
        polygonCapMaterial={capMaterial}
        polygonSideMaterial={sideMaterial}
        polygonStrokeColor={strokeColor}
        polygonAltitude={altitude}
        polygonCapCurvatureResolution={CAP_RESOLUTION}
        polygonsTransitionDuration={reducedMotion ? 0 : 250}
        polygonLabel={label}
        onPolygonHover={(obj: object | null) => {
          if (touch) return
          setHoverId(obj ? regionId(obj) : null)
          document.body.style.cursor = obj ? 'pointer' : ''
        }}
        onPolygonClick={(obj: object) => onSelect(regionId(obj))}
        onGlobeClick={() => onSelect(null)}
        htmlElementsData={pins}
        htmlAltitude={PIN_ALT}
        htmlElement={pinElement}
      />
    </div>
  )
}
