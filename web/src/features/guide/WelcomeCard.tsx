/**
 * WelcomeCard — 006-guide-content T004
 * Se muestra en la primera visita (sin región seleccionada). Dice qué hacer (tocar un estado o buscarlo) y
 * ofrece dos ejemplos que abren un análisis completo con un toque, diciendo qué enseña cada uno.
 * Los dos ejemplos se eligieron con los datos reales de 003 (ver docs/demo.md §2 y §3).
 */
import { useAppState } from '../../app/state'
import { variableCopy, UI_COPY, WELCOME_COPY } from '../../content'
import type { VariableId } from '../../lib/data'
import { useState } from 'react'
import './guide.css'

/*
 * Baja California: sin evidencia suficiente en el periodo completo, y el veredicto cambia según el año inicial.
 * Chihuahua (T013, elegido con los datos del 2026-11-14): sube con evidencia en casi cualquier periodo.
 * No es Sonora a propósito: «Encuentra Sonora» es la tarea 1 de la prueba con usuarios.
 */
const EXAMPLES: { regionId: string; place: string; variableId: VariableId; teaches: string }[] = [
  { regionId: 'MX-BCN', place: 'Baja California', variableId: 'air_temperature', teaches: WELCOME_COPY.exampleInconclusive },
  { regionId: 'MX-CHH', place: 'Chihuahua', variableId: 'air_temperature', teaches: WELCOME_COPY.exampleRising },
]

export default function WelcomeCard() {
  // En pantallas pequeñas la explicación empieza plegada: los ejemplos y el globo quedan a la vista (009).
  const [showIntro, setShowIntro] = useState(() => window.matchMedia?.('(min-width: 900px) and (min-height: 640px)').matches ?? false)
  const { setRegion, setVariable, resetPeriod } = useAppState()

  function openExample(regionId: string, variableId: VariableId) {
    setVariable(variableId)
    resetPeriod()
    setRegion(regionId)
  }

  return (
    // Sin landmark propio: el armazón (002) ya envuelve esto en <section aria-label="Welcome">.
    <div className="welcome-card">
      <details className="welcome-intro" open={showIntro} onToggle={e => setShowIntro(e.currentTarget.open)}>
        <summary><h2 className="welcome-title">{UI_COPY.welcome}</h2></summary>
        <p className="welcome-note">{UI_COPY.notCause}</p>
      </details>
      <p className="welcome-how">{WELCOME_COPY.how}</p>

      <ul className="welcome-examples">
        {EXAMPLES.map(e => (
          <li key={e.regionId}>
            <button type="button" className="welcome-example" onClick={() => openExample(e.regionId, e.variableId)}>
              <span className="welcome-example-place">{`${e.place} · ${variableCopy(e.variableId).short}`}</span>
              <span className="welcome-example-teaches">{e.teaches}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
