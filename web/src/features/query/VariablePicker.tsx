/**
 * Selector de variable (004 T002): dos radios nativos con forma de control segmentado
 * (las flechas cambian de opción sin código extra) y su definición desplegable en la misma pantalla.
 */
import { useId, useState, type KeyboardEvent } from 'react'
import { useAppState } from '../../app/state'
import { VARIABLE_IDS } from '../../lib/data'
import { VARIABLE_COPY } from '../../content'

export default function VariablePicker() {
  const { variableId, setVariable } = useAppState()
  const [showDefinition, setShowDefinition] = useState(false)
  const uid = useId()
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
      <p id={definitionId} className="variable-picker-definition" hidden={!showDefinition}>
        <strong>{copy.label}:</strong> {copy.definition}
      </p>
    </div>
  )
}
