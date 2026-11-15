/**
 * WelcomeCard — 006-guide-content T004
 * Se muestra en la primera visita (sin región seleccionada).
 * Ofrece dos ejemplos que abren un análisis completo con un toque.
 * Los dos ejemplos se eligieron con los datos reales de 003 (ver docs/demo.md §2 y §3).
 */
import { useAppState } from '../../app/state'
import { variableCopy, UI_COPY } from '../../content'
import type { VariableId } from '../../lib/data'
import { useState } from 'react'
import './guide.css'

export default function WelcomeCard() {
  const [showIntro, setShowIntro] = useState(() => window.matchMedia?.('(min-width: 900px) and (min-height: 640px)').matches ?? false)
  const { setRegion, setVariable, resetPeriod } = useAppState()

  function openExample(regionId: string, variableId: VariableId) {
    setVariable(variableId)
    resetPeriod()
    setRegion(regionId)
  }

  return (
    // Sin landmark propio: el armazón (002) ya envuelve esto en <section aria-label="Bienvenida">.
    <div className="welcome-card">
      <details className="welcome-intro" open={showIntro} onToggle={e => setShowIntro(e.currentTarget.open)}>
      <summary>Explora el clima de un estado</summary>
      <div className="welcome-intro-body">
      <h2 className="welcome-title">Trend Detective</h2>
      <p className="welcome-lead">{UI_COPY.welcome}</p>

      <p className="welcome-hint">
        O empieza con uno de estos ejemplos:
      </p>
      <p className="welcome-note">{UI_COPY.notCause}</p>
      </div>
      </details>

      <div className="welcome-examples">
        {/* Ejemplo 1: Baja California · Temperatura */}
        <button
          type="button"
          className="welcome-example-btn"
          aria-label="Ver un ejemplo: Baja California, temperatura"
          onClick={() => openExample('MX-BCN', 'air_temperature')}
        >
          <span className="example-label">Ver un ejemplo</span>
          <span className="example-place">Baja California</span>
          <span className="example-variable">{variableCopy('air_temperature').short}</span>
        </button>

        {/*
          Ejemplo 2: Chihuahua · Temperatura (T013, elegido con los datos reales de 003 del 2026-11-14).
          Contrasta con el primero: Baja California no tiene evidencia suficiente en 1980–2025 y su
          veredicto cambia según el año inicial; Chihuahua sube con evidencia en casi cualquier periodo.
          No es Sonora a propósito: «Encuentra Sonora» es la tarea 1 de la prueba con usuarios.
        */}
        <button
          type="button"
          className="welcome-example-btn"
          aria-label="Ver un ejemplo: Chihuahua, temperatura"
          onClick={() => openExample('MX-CHH', 'air_temperature')}
        >
          <span className="example-label">Ver un ejemplo</span>
          <span className="example-place">Chihuahua</span>
          <span className="example-variable">{variableCopy('air_temperature').short}</span>
        </button>
      </div>

    </div>
  )
}
