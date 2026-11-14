/**
 * MethodsSheet — 006-guide-content T005
 * Hoja de métodos y fuentes, colocada por el armazón dentro de un diálogo (002).
 *
 * Contenido (FR-C04):
 * - Texto cualitativo fijo redactado por 006: qué es cada método y sus límites.
 * - Valores numéricos (α, periodo, método de pendiente, prueba) leídos del catálogo en tiempo
 *   de ejecución; si el catálogo aún no cargó, se muestran los valores del contrato.
 */
import { useEffect, useState } from 'react'
import { loadCatalog, VARIABLE_IDS, type Catalog } from '../../lib/data'
import { VARIABLE_COPY, UI_COPY } from '../../content'
import './guide.css'

export default function MethodsSheet() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch(() => setError(true))
  }, [])

  const alpha = catalog?.alpha ?? 0.05
  const firstYear = catalog?.period.first_year ?? 1981
  const lastYear = catalog?.period.last_complete_year ?? 2025
  const slopeMethod = catalog?.method.slope ?? 'Pendiente de Theil-Sen'
  const testMethod = catalog?.method.test ?? 'Mann-Kendall con corrección de autocorrelación'
  const intervalMethod = catalog?.method.interval ?? 'Intervalo de confianza por bootstrap'

  return (
    <article className="methods-sheet" aria-label="Métodos y fuentes">
      <h2 className="methods-title">Métodos y fuentes</h2>

      {error && (
        <p className="methods-warning" role="alert">
          No se pudo cargar el catálogo. Se muestran los valores del contrato.
        </p>
      )}

      {/* Periodo */}
      <section className="methods-section">
        <h3>Periodo analizado</h3>
        <p>
          Los análisis cubren desde <strong>{firstYear}</strong> hasta{' '}
          <strong>{lastYear}</strong>. Solo se usan años completos (12 meses
          válidos). Con menos de 10 años completos no se calcula tendencia.
        </p>
      </section>

      {/* Tendencia */}
      <section className="methods-section">
        <h3>Cálculo de la tendencia</h3>
        <p>
          <strong>Pendiente</strong>: {slopeMethod}. Es la mediana de todas las
          pendientes posibles entre pares de puntos de la serie; resiste mejor
          los valores atípicos que la regresión ordinaria.
        </p>
        <p>
          <strong>Prueba de significancia</strong>: {testMethod}. Detecta
          si la dirección de la tendencia es consistente a lo largo del tiempo,
          sin asumir distribución normal. El nivel de significancia es{' '}
          α&nbsp;=&nbsp;{alpha}.
        </p>
        <p>
          <strong>Intervalo de confianza</strong>: {intervalMethod} al{' '}
          {Math.round((1 - alpha) * 100)}&nbsp;%.
        </p>
      </section>

      {/* Autocorrelación — texto cualitativo fijo (FR-C04) */}
      <section className="methods-section">
        <h3>Límite de la corrección por autocorrelación</h3>
        <p>
          Las series climáticas mensuales no son independientes: un año cálido
          tiende a ir seguido de otro cálido. Esta autocorrelación infla
          artificialmente la significancia si no se corrige.
        </p>
        <p>
          Aquí se aplica la corrección de Hamed y Rao (1998): reduce el número
          efectivo de observaciones según la autocorrelación de primer orden
          (r₁). Esta corrección asume que la autocorrelación decae con el
          retardo, lo que es razonable para series anuales pero puede
          subestimar el efecto en series con ciclos lentos (p.&nbsp;ej.,
          oscilaciones decenales del océano). Los resultados son más fiables
          cuanto más larga es la serie.
        </p>
        <p>
          <strong>En qué casos falla</strong>: si la serie tiene un salto
          brusco (cambio de estación de medida, corrección tardía de sesgo),
          la autocorrelación calculada puede ser errónea. El diagnóstico de
          escalón está registrado en los datos de procedencia.
        </p>
      </section>

      {/* Variables */}
      <section className="methods-section">
        <h3>Variables disponibles</h3>
        <dl className="methods-variables">
          {VARIABLE_IDS.map(id => (
            <div key={id} className="methods-variable-item">
              <dt>{VARIABLE_COPY[id].label}</dt>
              <dd>{VARIABLE_COPY[id].definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Cómo citar */}
      <section className="methods-section">
        <h3>Cómo citar</h3>
        <p>
          Los datos proceden de MERRA-2 (Modern-Era Retrospective analysis for
          Research and Applications, Version 2), distribuido por el Goddard
          Earth Sciences Data and Information Services Center (GES DISC) de la
          NASA.
        </p>
        <p>
          Para citar esta herramienta:{' '}
          <em>
            Trend Detective, NASA Space Apps Challenge 2026. Datos: MERRA-2 /
            NASA GES DISC.
          </em>
        </p>
      </section>

      {/* Nota sobre causalidad */}
      <footer className="methods-footer">
        <p>{UI_COPY.notCause}</p>
        <p className="methods-legend-note">{UI_COPY.legendNote}</p>
      </footer>
    </article>
  )
}
