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
  /** Segunda región de la comparación (007): las dos filas llevan su letra en texto. */
  compareId?: string | null
  onPick: (id: string) => void
  /** URL de la región (permite abrir en otra pestaña y copiar el enlace). */
  hrefFor: (id: string) => string
}

export default function RegionTable({ rows, unit, caption, selectedId, compareId = null, onPick, hrefFor }: Props) {
  const tagOf = (id: string) => (!compareId ? null : id === selectedId ? 'A' : id === compareId ? 'B' : null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir), [rows, sort])
  const hasValues = unit !== null

  const header = (key: SortKey, text: string, className?: string) => {
    const active = sort.key === key
    return (
      <th scope="col" className={className} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
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
    <div className="table-wrap" role="region" aria-label={caption} tabIndex={0}>
    <table className="data-table globe-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {header('name', GLOBE_COPY.colRegion)}
          <th scope="col" className="globe-table-country">{GLOBE_COPY.colCountry}</th>
          {hasValues && header('value', GLOBE_COPY.colValue, 'num')}
          {hasValues && <th scope="col">{GLOBE_COPY.colClass}</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map(r => (
          <tr key={r.id} aria-current={r.id === selectedId || r.id === compareId ? 'true' : undefined}>
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
              {tagOf(r.id) && <span className="tag globe-table-compared">{GLOBE_COPY.compared(tagOf(r.id)!)}</span>}
            </th>
            <td className="globe-table-country">{r.country}</td>
            {hasValues && <td className="num">{r.value === null ? GLOBE_COPY.noData : formatSlope(r.value)}</td>}
            {hasValues && <td>{r.label ?? GLOBE_COPY.noData}</td>}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}
