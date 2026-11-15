/**
 * Periodo en modo comparación (007 T015, FR-K05): la prueba de la diferencia solo se publica para ventanas que
 * terminan en el último año completo, así que aquí solo se elige el año inicial, entre los publicados.
 */
import { useId } from 'react'
import { COMPARE_COPY } from '../../content'

export default function StartSelect({ starts, end, from, to, onPick }: {
  starts: number[]; end: number; from: number; to: number; onPick: (from: number, to: number) => void
}) {
  const id = useId()
  const current = to === end && starts.includes(from) ? String(from) : ''
  return (
    // Mismo aspecto que el periodo del análisis; aquí el año final es fijo y se dice en texto.
    <fieldset className="period">
      <legend>Period</legend>
      <div className="period-row">
        <label htmlFor={id}>{COMPARE_COPY.startLabel}</label>
        <select id={id} value={current} onChange={e => e.target.value && onPick(Number(e.target.value), end)}>
          {current === '' && <option value="">—</option>}
          {starts.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="period-fixed">{COMPARE_COPY.until(end)}</span>
      </div>
      <p className="period-hint">{COMPARE_COPY.periodHint(end)}</p>
    </fieldset>
  )
}
