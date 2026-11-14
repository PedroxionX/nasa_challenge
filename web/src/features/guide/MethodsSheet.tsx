/**
 * MethodsSheet — 006-guide-content T005
 * Hoja de métodos y fuentes, colocada por el armazón dentro de un diálogo (002).
 *
 * Contenido (FR-C04):
 * - Texto cualitativo fijo redactado por 006: qué es cada método y sus límites.
 * - Valores numéricos (α, periodo, nivel del intervalo) leídos del catálogo en tiempo de ejecución.
 * - El catálogo entrega CÓDIGOS de método (contrato de datos); aquí se traducen a texto.
 *   Un código desconocido se muestra tal cual, sin inventar su significado.
 */
import { useEffect, useState } from 'react'
import { loadCatalog, VARIABLE_IDS, type Catalog } from '../../lib/data'
import { VARIABLE_COPY, UI_COPY, GLOSSARY } from '../../content'
import './guide.css'

// Códigos del contrato: specs/001-trend-explorer-mvp/contracts/data-files.md
const DEFAULT_METHOD = {
  slope: 'theil-sen',
  test: 'mann-kendall-ar1-corrected',
  interval: 'sen-1968-95',
  contrast: 'ols-santer-2000',
} as const

const SLOPE_TEXT: Record<string, string> = {
  'theil-sen': 'Pendiente de Theil-Sen',
}
const TEST_TEXT: Record<string, string> = {
  'mann-kendall-ar1-corrected':
    'Prueba de Mann-Kendall con la varianza corregida por la autocorrelación de primer orden (r₁)',
}
const INTERVAL_TEXT: Record<string, string> = {
  'sen-1968-95': 'Intervalo de Sen (1968), ensanchado por la autocorrelación',
}
const CONTRAST_TEXT: Record<string, string> = {
  'ols-santer-2000': 'regresión ordinaria con el ajuste de Santer et al. (2000)',
}

/** Texto legible para un código del catálogo; si no se conoce, el código tal cual. */
function describe(table: Record<string, string>, code: string): string {
  return table[code] ?? `método «${code}»`
}

export default function MethodsSheet() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch(() => setError(true))
  }, [])

  const alpha = catalog?.alpha ?? 0.05
  const level = Math.round((1 - alpha) * 100)
  const firstYear = catalog?.period.first_year ?? 1981
  const lastYear = catalog?.period.last_complete_year ?? 2025
  const minWindow = catalog?.period.min_window_years ?? 10
  const method = catalog?.method ?? DEFAULT_METHOD

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
          válidos), porque agregar por año elimina el ciclo estacional. Con menos
          de {minWindow} años completos no se calcula tendencia.
        </p>
      </section>

      {/* Tendencia */}
      <section className="methods-section">
        <h3>Cálculo de la tendencia</h3>
        <p>
          <strong>Pendiente</strong>: {describe(SLOPE_TEXT, method.slope)}.{' '}
          {GLOSSARY.slope}
        </p>
        <p>
          <strong>Prueba de significancia</strong>: {describe(TEST_TEXT, method.test)}.
          No exige que los datos sigan una distribución normal. El nivel de
          significancia es α&nbsp;=&nbsp;{alpha}.
        </p>
        <p>
          <strong>Intervalo de confianza</strong>: {describe(INTERVAL_TEXT, method.interval)},
          al {level}&nbsp;%.
        </p>
        <p>
          <strong>Contraste</strong>: junto a la prueba principal se calcula una{' '}
          {describe(CONTRAST_TEXT, method.contrast)}. Sirve para comparar, no es el
          resultado que se muestra como veredicto.
        </p>
      </section>

      {/* Autocorrelación — texto cualitativo fijo (FR-C04) */}
      <section className="methods-section">
        <h3>Límite de la corrección por autocorrelación</h3>
        <p>
          Las series climáticas no son independientes: un año cálido tiende a ir
          seguido de otro cálido. Si no se corrige, esa autocorrelación hace que
          la tendencia parezca más significativa de lo que es.
        </p>
        <p>
          Aquí la prueba corrige la varianza usando solo la autocorrelación de
          primer orden (r₁). La corrección es imperfecta: en un experimento del
          laboratorio con autocorrelación fuerte (φ&nbsp;=&nbsp;0,75) y series de
          30 a 45 años, la prueba corregida rechazaba la ausencia de tendencia
          entre el 9&nbsp;% y el 11&nbsp;% de las veces, en lugar del
          5&nbsp;% esperado. Con autocorrelación fuerte, un valor p cercano a α
          debe leerse con cautela.
        </p>
        <p>
          Cuando r₁ es significativo, el resultado lleva la marca «autocorr» en
          los datos. Si la serie tiene un salto brusco (cambio de instrumento,
          corrección tardía de sesgo), la autocorrelación calculada puede ser
          errónea: el diagnóstico de salto se guarda en el campo de diagnóstico de
          cada serie y el análisis se marca como no válido.
        </p>
      </section>

      {/* Qué significa un resultado — FR-C01 */}
      <section className="methods-section">
        <h3>Qué significa y qué no</h3>
        <p>{UI_COPY.significanceNote}</p>
        <p>{UI_COPY.notCause}</p>
      </section>

      {/* Términos — FR-C03 */}
      <section className="methods-section">
        <h3>Términos</h3>
        <dl className="methods-variables">
          <div className="methods-variable-item">
            <dt>Pendiente</dt>
            <dd>{GLOSSARY.slope}</dd>
          </div>
          <div className="methods-variable-item">
            <dt>Intervalo de confianza</dt>
            <dd>{GLOSSARY.ci}</dd>
          </div>
          <div className="methods-variable-item">
            <dt>Valor p</dt>
            <dd>{GLOSSARY.p}</dd>
          </div>
          <div className="methods-variable-item">
            <dt>α</dt>
            <dd>{GLOSSARY.alpha}</dd>
          </div>
        </dl>
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

      <footer className="methods-footer">
        <p className="methods-legend-note">{UI_COPY.legendNote}</p>
      </footer>
    </article>
  )
}