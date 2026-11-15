/** Tabla ordenable de regiones: alternativa en texto al mapa y vista sin WebGL (005 T003, T005). */
import { useMemo, useState } from 'react'
import { GLOBE_COPY } from './copy'
import { formatSlope, sortRows, type RegionRow, type SortKey } from './format'

interface Props {
  rows: RegionRow[]
  /** Unidad de la pendiente, p. ej. «°C/década». `null` si no hay mapa cargado. */
  unit: string | null
  caption: string
  selectedId: string | null
  onPick: (id: string) => void
  /** URL de la región (permite abrir en otra pestaña y copiar el enlace). */
  hrefFor: (id: string) => string
}

export default function RegionTable({ rows, unit, caption, selectedId, onPick, hrefFor }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir), [rows, sort])
  const hasValues = unit !== null

  const header = (key: SortKey, text: string) => {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          className="globe-table-sort"
          onClick={() => setSort({ key, dir: active && sort.dir === 1 ? -1 : 1 })}
          title={GLOBE_COPY.sortHint}
        >
          {text}
          <span aria-hidden="true">{active ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</span>
        </button>
      </th>
    )
  }

  return (
    <table className="globe-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {header('name', GLOBE_COPY.colRegion)}
          <th scope="col">{GLOBE_COPY.colCountry}</th>
          {hasValues && header('value', `${GLOBE_COPY.colValue} (${unit})`)}
          {hasValues && <th scope="col">{GLOBE_COPY.colClass}</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map(r => (
          <tr key={r.id} aria-current={r.id === selectedId ? 'true' : undefined}>
            <th scope="row">
              <a
                className="globe-table-pick"
                href={hrefFor(r.id)}
                onClick={e => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  onPick(r.id)
                }}
              >
                {r.name}
              </a>
            </th>
            <td>{r.country}</td>
            {hasValues && <td className="globe-table-num">{r.value === null ? GLOBE_COPY.noData : formatSlope(r.value)}</td>}
            {hasValues && <td>{r.label ?? GLOBE_COPY.noData}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
