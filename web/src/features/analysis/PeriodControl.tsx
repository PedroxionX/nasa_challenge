/**
 * Control de periodo (004 T007, FR-A06): dos <select> nativos «Desde» y «Hasta» que solo ofrecen años
 * válidos, y «Usar todo el periodo». Un periodo invertido o más corto que el mínimo no se puede elegir.
 */
import { useId } from 'react'
import { useAppState } from '../../app/state'
import type { Catalog } from '../../lib/data'
import { UI_COPY } from '../../content'
import { isFullPeriod, periodOptions } from './analysisData'
import { fmtYear } from './format'

/** `showReset = false` cuando el panel ya ofrece «Usar todo el periodo» en su aviso de datos insuficientes. */
export default function PeriodControl({ catalog, showReset = true }: { catalog: Catalog; showReset?: boolean }) {
  const { from, to, setPeriod, resetPeriod } = useAppState()
  const uid = useId()
  const { starts, ends } = periodOptions(catalog, from, to)
  const full = isFullPeriod(catalog, from, to)
  const min = catalog.period.min_window_years

  return (
    <fieldset className="period-control">
      <legend>Periodo</legend>
      <div className="period-control-row">
        <label htmlFor={`${uid}-from`}>Desde</label>
        <select id={`${uid}-from`} value={from} onChange={e => setPeriod(Number(e.target.value), to)}>
          {starts.map(y => <option key={y} value={y}>{fmtYear(y)}</option>)}
        </select>
        <label htmlFor={`${uid}-to`}>Hasta</label>
        <select id={`${uid}-to`} value={to} onChange={e => setPeriod(from, Number(e.target.value))}>
          {ends.map(y => <option key={y} value={y}>{fmtYear(y)}</option>)}
        </select>
        {showReset && <button type="button" onClick={resetPeriod} disabled={full}>{UI_COPY.useFullPeriod}</button>}
      </div>
      <p className="period-control-hint">{`El periodo debe tener al menos ${min} años.`}</p>
    </fieldset>
  )
}
