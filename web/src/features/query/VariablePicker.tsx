/**
 * Selector de variable (004 T002): dos radios nativos con forma de control segmentado
 * (las flechas cambian de opción sin código extra) y su definición desplegable en la misma pantalla.
 */
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useAppState } from '../../app/state'
import { loadCatalog, VARIABLE_IDS, variablePeriod, type Catalog, type VariableInfo } from '../../lib/data'
import { VARIABLE_COPY } from '../../content'

const KIND: Record<VariableInfo['kind'], string> = {
  reanalysis: 'reanálisis (un modelo que combina observaciones)',
  observation: 'observación',
}
const AGGREGATION: Record<VariableInfo['aggregation'], string> = {
  mean_day_weighted: 'promedio anual',
  sum_from_rate: 'acumulado anual',
}

/** Unidad, origen y años de la variable según el catálogo (FR-001: nombre, definición, unidades y origen). */
function VariableFacts({ catalog, info }: { catalog: Catalog; info: VariableInfo }) {
  const { firstYear, lastYear } = variablePeriod(catalog, info.id)
  const product = info.product_short_name
    ? `${info.product_short_name}${info.product_version ? ` versión ${info.product_version}` : ''}`
    : null
  return (
    <dl className="variable-picker-facts">
      <dt>Unidad</dt><dd>{`${info.unit_annual} (${AGGREGATION[info.aggregation]})`}</dd>
      <dt>Origen</dt><dd>{product ? `${KIND[info.kind]} · ${product}` : KIND[info.kind]}</dd>
      <dt>Años</dt><dd>{`${firstYear}–${lastYear}`}</dd>
    </dl>
  )
}

export default function VariablePicker() {
  const { variableId, setVariable } = useAppState()
  const [showDefinition, setShowDefinition] = useState(false)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const uid = useId()

  useEffect(() => {
    let live = true
    loadCatalog().then(c => { if (live) setCatalog(c) }).catch(() => {}) // sin catálogo: solo la definición
    return () => { live = false }
  }, [])
  const info = catalog?.variables.find(v => v.id === variableId)
  const definitionId = `${uid}-definition`
  const copy = VARIABLE_COPY[variableId]

  const closeOnEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showDefinition) {
      e.stopPropagation()
      setShowDefinition(false)
    }
  }

  return (
    <div className="variable-picker" onKeyDown={closeOnEscape}>
      <fieldset className="variable-picker-options">
        <legend className="query-vh">Variable</legend>
        {VARIABLE_IDS.map(id => (
          <label key={id} className="variable-picker-option">
            <input
              type="radio"
              name={`${uid}-variable`}
              value={id}
              checked={variableId === id}
              onChange={() => setVariable(id)}
            />
            <span>{VARIABLE_COPY[id].short}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="variable-picker-info"
        aria-expanded={showDefinition}
        aria-controls={definitionId}
        aria-label={`Qué es ${copy.label.toLowerCase()}`}
        onClick={() => setShowDefinition(s => !s)}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="6" r="1.1" fill="currentColor" />
          <path d="M10 9v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div id={definitionId} className="variable-picker-definition" hidden={!showDefinition}>
        <p><strong>{copy.label}:</strong> {copy.definition}</p>
        {catalog && info && <VariableFacts catalog={catalog} info={info} />}
      </div>
    </div>
  )
}
