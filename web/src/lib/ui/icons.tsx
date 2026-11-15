/**
 * Iconos dibujados de la aplicación: un solo trazo (currentColor, extremos redondos) para todos.
 * Son decorativos: quien los usa pone el texto o el aria-label.
 */
import type { ReactNode } from 'react'

type Props = { size?: number; className?: string }

function Icon({ size = 20, className, children, box = 20 }: Props & { children: ReactNode; box?: number }) {
  return (
    <svg className={className} viewBox={`0 0 ${box} ${box}`} width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={box === 28 ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const CloseIcon = (p: Props) => <Icon {...p}><path d="M5 5l10 10M15 5L5 15" /></Icon>
export const PlayIcon = (p: Props) => <Icon {...p}><path d="M6 3l11 7-11 7Z" /></Icon>
export const PauseIcon = (p: Props) => <Icon {...p}><path d="M6 4v12M14 4v12" /></Icon>
export const ReplayIcon = (p: Props) => <Icon {...p}><path d="M4 7a7 7 0 1 1-1 6M4 3v4h4" /></Icon>
export const InfoIcon = (p: Props) => (
  <Icon {...p}><circle cx="10" cy="10" r="8" /><path d="M10 9v5.5" /><path d="M10 6v.01" /></Icon>
)
export const WarningIcon = (p: Props) => <Icon {...p}><path d="M10 3 L18 17 H2 Z M10 8 V12 M10 14.5 V14.6" /></Icon>
export const TableIcon = (p: Props) => <Icon {...p}><rect x="3" y="4" width="14" height="12" rx="1.5" /><path d="M3 8.5h14M8 4v12" /></Icon>
export const GlobeIcon = (p: Props) => (
  <Icon {...p}><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c2.5 2.6 2.5 12.4 0 15M10 2.5c-2.5 2.6-2.5 12.4 0 15" /></Icon>
)
export const ChevronIcon = ({ up, ...p }: Props & { up?: boolean }) => (
  <Icon {...p}><path d={up ? 'M5 12.5l5-5 5 5' : 'M5 7.5l5 5 5-5'} /></Icon>
)

/** Iconos de veredicto (28 px): flecha arriba, flecha abajo, ≈ (no se puede decir), ≠, y «no disponible». */
export type VerdictGlyph = 'up' | 'down' | 'approx' | 'differ' | 'blocked'
const GLYPH: Record<VerdictGlyph, ReactNode> = {
  up: <path d="M6 20 L20 6 M11 6 H20 V15" />,
  down: <path d="M6 8 L20 22 M11 22 H20 V13" />,
  approx: <path d="M5 11 Q9.5 7 14 11 T23 11 M5 18 Q9.5 14 14 18 T23 18" />,
  differ: <path d="M6 10 H22 M6 18 H22 M18 5 L10 23" />,
  blocked: <><circle cx="14" cy="14" r="9" /><path d="M8 20 L20 8" /></>,
}
export const VerdictIcon = ({ glyph }: { glyph: VerdictGlyph }) => (
  <Icon size={28} box={28} className="verdict-icon">{GLYPH[glyph]}</Icon>
)
