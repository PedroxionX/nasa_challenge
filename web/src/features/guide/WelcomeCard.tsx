/**
 * WelcomeCard — 006-guide-content T004
 * Se muestra en la primera visita (sin región seleccionada).
 * Ofrece dos ejemplos que abren un análisis completo con un toque.
 * El segundo ejemplo queda como marcador hasta que 003 publique datos reales.
 */
import { useAppState } from '../../app/state'
import { VARIABLE_COPY, UI_COPY } from '../../content'
import './guide.css'

export default function WelcomeCard() {
  const { setRegion, setVariable, resetPeriod } = useAppState()

  function openExample(regionId: string, variableId: 'air_temperature' | 'precipitation') {
    setVariable(variableId)
    resetPeriod()
    setRegion(regionId)
  }

  return (
    <section className="welcome-card" aria-label="Bienvenida">
      <h2 className="welcome-title">Trend Detective</h2>
      <p className="welcome-lead">{UI_COPY.welcome}</p>

      <p className="welcome-hint">
        O empieza con uno de estos ejemplos:
      </p>

      <div className="welcome-examples">
        {/* Ejemplo 1: Baja California · Temperatura */}
        <button
          type="button"
          className="welcome-example-btn"
          onClick={() => openExample('MX-BCN', 'air_temperature')}
        >
          <span className="example-label">Ver un ejemplo</span>
          <span className="example-place">Baja California</span>
          <span className="example-variable">{VARIABLE_COPY.air_temperature.short}</span>
        </button>

        {/*
          TODO(003): segundo ejemplo — elegir región y variable cuando 003 publique datos reales.
          Se busca un caso con evidencia insuficiente o dirección opuesta para ilustrar el contraste.
          T004 se marca terminada con este marcador declarado (clarification 2026-11-14).
        */}
        <button
          type="button"
          className="welcome-example-btn welcome-example-btn--pending"
          disabled
          aria-disabled="true"
        >
          <span className="example-label">Próximamente</span>
          <span className="example-place">Segundo ejemplo</span>
          <span className="example-variable">Por definir con datos reales</span>
        </button>
      </div>

      <p className="welcome-note">{UI_COPY.notCause}</p>
    </section>
  )
}
