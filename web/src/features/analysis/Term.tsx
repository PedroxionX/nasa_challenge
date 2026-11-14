/**
 * Término técnico con su definición desplegable (004 T012). Botón de 44 px, operable con teclado y tacto;
 * Escape cierra la definición sin cerrar el panel.
 */
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { GLOSSARY, type TermKey } from './glossary'

export default function Term({ k, children }: { k: TermKey; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const { term, definition } = GLOSSARY[k]

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      e.preventDefault() // el panel ignora un Escape ya atendido (defaultPrevented)
      setOpen(false)
    }
  }

  return (
    <span className="term" onKeyDown={onKeyDown}>
      <dfn className="term-label">{children ?? term}</dfn>
      <button
        type="button"
        className="term-button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Qué significa «${term}»`}
        onClick={() => setOpen(o => !o)}
      >
        <span aria-hidden="true">?</span>
      </button>
      <span id={id} role="note" className="term-definition" hidden={!open}>
        <strong>{term}:</strong> {definition}
      </span>
    </span>
  )
}
