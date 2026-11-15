import { scaleLinear } from 'd3-scale'
import type { PlaybackFrame } from '../../app/playback'
import { withAlpha, type Palette } from './mapColors'

/** El color representa el valor anual, con una escala constante en todo el periodo. */
export function playbackRegionFill(id: string, frame: PlaybackFrame, palette: Palette): string {
  if (id !== frame.regionId) return 'rgba(0, 0, 0, 0)'
  if (frame.value === null) return withAlpha(palette.noData, 0.7)
  const position = frame.max > frame.min ? (frame.value - frame.min) / (frame.max - frame.min) : 0.5
  return scaleLinear<string>()
    .domain(palette.classes.map((_, i) => i / (palette.classes.length - 1)))
    .range(palette.classes)
    .clamp(true)(position)
}
