/**
 * Selector de estado: campo con lista filtrable, agrupada por país. Es el único de la aplicación: lo usan el
 * buscador de la cabecera y la comparación.
 * Patrón ARIA 1.2 «combobox con listbox»: el foco se queda en el campo y la opción activa se señala con
 * aria-activedescendant. Teclado: ↓ ↑ Inicio Fin Intro Escape.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { loadCatalog, type RegionInfo } from '../data'
import { UI_COPY } from '../../content'
import { COUNTRIES, filterRegions } from './regionFilter'

interface Props {
  /** Id del campo: otras zonas lo enfocan por id. */
  id: string
  /** Nombre accesible del campo. Si `showLabel` es falso, solo lo oyen los lectores de pantalla. */
  label: string
  showLabel?: boolean
  placeholder: string
  /** Región elegida, o `null`. */
  value: string | null
  onChange: (id: string) => void
  /** Región que no se ofrece (en la comparación, la principal). */
  excludeId?: string | null
  /** La lista se abre en el flujo en vez de flotar: para usarlo dentro de un panel con desplazamiento. */
  inline?: boolean
  className?: string
}

export default function RegionCombobox({ id, label, showLabel = false, placeholder, value, onChange, excludeId = null, inline = false, className }: Props) {
  const [regions, setRegions] = useState<RegionInfo[]>([])
  const [failed, setFailed] = useState(false)
  // `null` = no se está escribiendo: el campo muestra el estado elegido.
  const [query, setQuery] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const pointerType = useRef('')
  const uid = useId()
  const listId = `${uid}-list`
  const optionId = (regionId: string) => `${uid}-opt-${regionId}`

  useEffect(() => {
    let live = true
    loadCatalog()
      .then(c => {
        if (!live) return
        setRegions([...c.regions].sort((a, b) => a.name.localeCompare(b.name, 'en')))
        setFailed(false)
      })
      .catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])

  const selected = regions.find(r => r.id === value) ?? null
  const offered = useMemo(() => regions.filter(r => r.id !== excludeId), [regions, excludeId])
  const matches = useMemo(() => filterRegions(offered, query ?? ''), [offered, query])
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

  const choose = (region: RegionInfo, touch = false) => {
    onChange(region.id)
    setQuery(null)
    setOpen(false)
    // Con el dedo, soltar el campo cierra el teclado y deja ver el resultado (009).
    if (touch) inputRef.current?.blur()
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
      ? UI_COPY.searchNoResults
      : `${visible.length} ${visible.length === 1 ? 'state' : 'states'}`

  const classes = ['combo', inline ? 'combo--inline' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <label className={showLabel ? 'combo-label' : 'vh'} htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        className="combo-input"
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
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
      <div className="combo-popup" hidden={!open}>
        <div id={listId} role="listbox" aria-label="States" className="combo-list">
          {COUNTRIES.map(c => {
            const items = visible.filter(r => r.country === c.code)
            if (!items.length) return null
            return (
              <div key={c.code} role="group" aria-labelledby={`${uid}-g-${c.code}`}>
                <div id={`${uid}-g-${c.code}`} role="presentation" className="combo-group">{c.label}</div>
                {items.map(r => (
                  <div
                    key={r.id}
                    id={optionId(r.id)}
                    role="option"
                    aria-selected={r.id === activeRegion?.id}
                    data-current={r.id === value || undefined}
                    className="combo-option"
                    // mousedown en vez de click: así el campo no pierde el foco antes de elegir.
                    onPointerDown={e => { pointerType.current = e.pointerType }}
                    onMouseDown={e => { e.preventDefault(); choose(r, pointerType.current === 'touch' || pointerType.current === 'pen') }}
                    onMouseMove={() => setActive(visible.indexOf(r))}
                  >
                    {r.name}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        {visible.length === 0 && <p className="combo-empty">{UI_COPY.searchNoResults}</p>}
      </div>
      <p className="vh" role="status" aria-live="polite">{status}</p>
      {failed && <p className="combo-error" role="alert">We could not load the list of states.</p>}
    </div>
  )
}
