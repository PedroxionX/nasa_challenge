/** El único botón de cerrar de la aplicación: icono ✕ dibujado, 44 px, con el nombre de lo que cierra. */
import type { MouseEvent, Ref } from 'react'
import { CloseIcon } from './icons'

export default function CloseButton({ label, onClick, className, ref }: {
  label: string; onClick: (e: MouseEvent<HTMLButtonElement>) => void; className?: string; ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button type="button" ref={ref} className={className ? `icon-button ${className}` : 'icon-button'} onClick={onClick} aria-label={label} title={label}>
      <CloseIcon />
    </button>
  )
}
