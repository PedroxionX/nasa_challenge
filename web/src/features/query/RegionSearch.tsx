/**
 * Buscador de estados (004 T001): combobox accesible con lista agrupada por país.
 * Patrón ARIA 1.2 «combobox con listbox»: el foco se queda en el campo y la opción activa
 * se señala con aria-activedescendant. Teclado: ↓ ↑ Inicio Fin Intro Escape.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useAppState } from '../../app/state'
import { loadCatalog, type RegionInfo } from '../../lib/data'
import { UI_COPY } from '../../content'
import { COUNTRIES, filterRegions, NO_MATCH, REGION_SEARCH_ID } from './search'

export default function RegionSearch() {
  const { regionId, setRegion } = useAppState()
  const [regions, setRegions] = useState<RegionInfo[]>([])
  const [failed, setFailed] = useState(false)
  // `null` = no se está escribiendo: el campo muestra el estado elegido.
  const [query, setQuery] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const listId = `${uid}-list`
  const optionId = (id: string) => `${uid}-opt-${id}`

  useEffect(() => {
    let live = true
    loadCatalog()
      .then(c => {
        if (!live) return
        setRegions([...c.regions].sort((a, b) => a.name.localeCompare(b.name, 'es')))
        setFailed(false)
      })
      .catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])

  const selected = regions.find(r => r.id === regionId) ?? null
  const matches = useMemo(() => filterRegions(regions, query ?? ''), [regions, query])
  // Orden visual = orden de navegación: por país y, dentro, el de filterRegions.
  const visible = useMemo(
    () => COUNTRIES.flatMap(c => matches.filter(r => r.country === c.code)),
    [matches],
  )
  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0))
  const activeRegion = open ? visible[activeIndex] : undefined

  useEffect(() => {
    if (!activeRegion) return
    document.getElementById(`${uid}-opt-${activeRegion.id}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeRegion, uid])

  const choose = (region: RegionInfo) => {
    setRegion(region.id)
    setQuery(null)
    setOpen(false)
    // Deja el nombre seleccionado: si se sigue escribiendo, se reemplaza en vez de añadirse.
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (input && document.activeElement === input) input.select()
    })
  }

  const openAt = (index: number) => {
    setOpen(true)
    setActive(index)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const last = visible.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openAt(0)
        else setActive(Math.min(activeIndex + 1, last))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openAt(last)
        else setActive(Math.max(activeIndex - 1, 0))
        break
      case 'Home':
        if (open) { e.preventDefault(); setActive(0) }
        break
      case 'End':
        if (open) { e.preventDefault(); setActive(last) }
        break
      case 'Enter':
        if (open && activeRegion) { e.preventDefault(); choose(activeRegion) }
        break
      case 'Escape':
        if (open || query !== null) {
          e.preventDefault()
          e.stopPropagation() // que no cierre también el panel
          setOpen(false)
          setQuery(null)
        }
        break
    }
  }

  const status = !open
    ? ''
    : visible.length === 0
      ? NO_MATCH
      : `${visible.length} ${visible.length === 1 ? 'estado' : 'estados'}`

  return (
    <div className="region-search">
      <label className="query-vh" htmlFor={REGION_SEARCH_ID}>Buscar un estado</label>
      <input
        id={REGION_SEARCH_ID}
        ref={inputRef}
        className="region-search-input"
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder={UI_COPY.searchPlaceholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeRegion ? optionId(activeRegion.id) : undefined}
        value={query ?? selected?.name ?? ''}
        onChange={e => { setQuery(e.target.value); openAt(0) }}
        onFocus={e => e.target.select()}
        onClick={() => { if (!open) openAt(0) }}
        onBlur={() => { setOpen(false); setQuery(null) }}
        onKeyDown={onKeyDown}
      />
      <div className="region-search-popup" hidden={!open}>
      <div id={listId} role="listbox" aria-label="Estados" className="region-search-list">
        {COUNTRIES.map(c => {
          const items = visible.filter(r => r.country === c.code)
          if (!items.length) return null
          return (
            <div key={c.code} role="group" aria-labelledby={`${uid}-g-${c.code}`}>
              <div id={`${uid}-g-${c.code}`} role="presentation" className="region-search-group">{c.label}</div>
              {items.map(r => (
                <div
                  key={r.id}
                  id={optionId(r.id)}
                  role="option"
                  aria-selected={r.id === activeRegion?.id}
                  data-current={r.id === regionId || undefined}
                  className="region-search-option"
                  // mousedown en vez de click: así el campo no pierde el foco antes de elegir.
                  onMouseDown={e => { e.preventDefault(); choose(r) }}
                  onMouseMove={() => setActive(visible.indexOf(r))}
                >
                  {r.name}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {visible.length === 0 && <p className="region-search-empty">{NO_MATCH}</p>}
      </div>
      <p className="query-vh" role="status" aria-live="polite">{status}</p>
      {failed && <p className="region-search-error" role="alert">No pudimos cargar la lista de estados.</p>}
    </div>
  )
}
