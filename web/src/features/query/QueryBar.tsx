/** ESBOZO de 002 (T007). Dueño tras la fusión: 004 (RegionSearch y VariablePicker). */
import { useEffect, useState } from 'react'
import { useAppState } from '../../app/state'
import { loadCatalog, VARIABLE_IDS, type RegionInfo } from '../../lib/data'
import { UI_COPY, VARIABLE_COPY } from '../../content'

const COUNTRY: Record<RegionInfo['country'], string> = { MX: 'México', US: 'Estados Unidos' }

export default function QueryBar() {
  const { regionId, variableId, setRegion, setVariable } = useAppState()
  const [regions, setRegions] = useState<RegionInfo[]>([])

  useEffect(() => {
    loadCatalog()
      .then(c => setRegions([...c.regions].sort((a, b) => a.name.localeCompare(b.name, 'es'))))
      .catch(() => setRegions([]))
  }, [])

  return (
    <div className="stub stub-query">
      <span className="stub-tag">Esbozo · 004</span>
      <select
        aria-label="Elegir un estado"
        value={regionId ?? ''}
        onChange={e => setRegion(e.target.value || null)}
      >
        <option value="">{UI_COPY.searchPlaceholder}</option>
        {(['MX', 'US'] as const).map(c => (
          <optgroup key={c} label={COUNTRY[c]}>
            {regions.filter(r => r.country === c).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </optgroup>
        ))}
      </select>
      <div role="radiogroup" aria-label="Variable" className="stub-segmented">
        {VARIABLE_IDS.map(id => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={variableId === id}
            onClick={() => setVariable(id)}
          >
            {VARIABLE_COPY[id].short}
          </button>
        ))}
      </div>
    </div>
  )
}
