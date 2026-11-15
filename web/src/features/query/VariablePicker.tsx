/**
 * Selector de variable (004 T002): un <select> nativo con las variables del catálogo
 * (teclado y lector de pantalla sin código extra; cabe en móvil con 14 o más opciones)
 * y su definición desplegable en la misma pantalla.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { useAppState } from '../../app/state'
import { loadCatalog, variablePeriod, type Catalog, type VariableInfo } from '../../lib/data'
import { localizeUnit, variableCopy } from '../../content'
import { InfoIcon } from '../../lib/ui/icons'
import CloseButton from '../../lib/ui/CloseButton'

const KIND: Record<string, string> = {
  reanalysis: 'reanalysis (a model that combines observations)',
  observation: 'observation',
}
const AGGREGATION: Record<string, string> = {
  mean_day_weighted: 'yearly mean',
  sum_from_rate: 'yearly total',
}

/** Unidad, origen y años de la variable según el catálogo (FR-001: nombre, definición, unidades y origen). */
function VariableFacts({ catalog, info }: { catalog: Catalog; info: VariableInfo }) {
  const { firstYear, lastYear } = variablePeriod(catalog, info.id)
  const product = info.product_short_name
    ? `${info.product_short_name}${info.product_version ? ` version ${info.product_version}` : ''}`
    : null
  return (
    <dl className="facts">
      <dt>Unit</dt><dd>{AGGREGATION[info.aggregation] ? `${localizeUnit(info.unit_annual)} (${AGGREGATION[info.aggregation]})` : localizeUnit(info.unit_annual)}</dd>
      <dt>Source</dt><dd>{product ? `${KIND[info.kind] ?? info.kind} · ${product}` : KIND[info.kind] ?? info.kind}</dd>
      <dt>Years</dt><dd>{`${firstYear}–${lastYear}`}</dd>
    </dl>
  )
}

export default function VariablePicker() {
  const { variableId, setVariable } = useAppState()
  const [showDefinition, setShowDefinition] = useState(false)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLButtonElement>(null)
  const uid = useId()

  useEffect(() => {
    let live = true
    loadCatalog().then(c => { if (live) setCatalog(c) }).catch(() => {}) // sin catálogo: solo la definición
    return () => { live = false }
  }, [])
  const info = catalog?.variables.find(v => v.id === variableId)
  const definitionId = `${uid}-definition`
  const copy = variableCopy(variableId, info)
  // Sin catálogo todavía: solo la variable activa, para que el control no salte vacío.
  const options = catalog ? catalog.variables : [{ id: variableId, label: copy.label, definition: copy.definition }]

  // El popup no atrapa el foco: se cierra al continuar en otra zona de la interfaz.
  // Escape se atiende antes que el panel de análisis para conservar la selección.
  useEffect(() => {
    if (!showDefinition) return
    const dismissOutside = (e: Event) => {
      if (e.target instanceof Node && !pickerRef.current?.contains(e.target)) setShowDefinition(false)
    }
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setShowDefinition(false)
      infoRef.current?.focus()
    }
    document.addEventListener('pointerdown', dismissOutside, true)
    document.addEventListener('focusin', dismissOutside)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true)
      document.removeEventListener('focusin', dismissOutside)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [showDefinition])

  const closeDefinition = () => {
    setShowDefinition(false)
    infoRef.current?.focus()
  }

  return (
    <div className="variable-picker" ref={pickerRef}>
      <label className="vh" htmlFor={`${uid}-variable`}>Variable</label>
      <select
        id={`${uid}-variable`}
        className="variable-picker-select"
        value={variableId}
        onChange={e => { setShowDefinition(false); setVariable(e.target.value) }}
      >
        {options.map(v => (
          <option key={v.id} value={v.id}>{variableCopy(v.id, v).short}</option>
        ))}
      </select>
      <button
        type="button"
        ref={infoRef}
        className="icon-button variable-picker-info"
        aria-expanded={showDefinition}
        aria-controls={definitionId}
        aria-label={`What is ${copy.label.toLowerCase()}`}
        title={`About ${copy.label.toLowerCase()}`}
        onClick={() => setShowDefinition(s => !s)}
      >
        <InfoIcon />
      </button>
      <div id={definitionId} role="region" aria-labelledby={`${uid}-definition-title`} className="variable-picker-definition" hidden={!showDefinition}>
        <div className="variable-picker-definition-header">
          <h2 id={`${uid}-definition-title`}>Variable details</h2>
          <CloseButton label="Close variable details" onClick={closeDefinition} />
        </div>
        <p><strong>{copy.label}:</strong> {copy.definition}</p>
        {catalog && info && <VariableFacts catalog={catalog} info={info} />}
      </div>
    </div>
  )
}
