import { useId } from 'react'
import { fmtYear, fmtYears } from '../format'
import { PauseIcon, PlayIcon, ReplayIcon } from './icons'
import type { useTimelinePlayback } from './useTimelinePlayback'

export default function TimelineControls({ playback, from, to, valueLabel, disabled }: {
  playback: ReturnType<typeof useTimelinePlayback>
  from: number
  to: number
  valueLabel: string
  disabled: boolean
}) {
  const id = useId()
  const complete = playback.active && playback.year === to && !playback.playing
  const action = playback.playing ? 'Pause' : complete ? 'Replay' : 'Play'
  return (
    <div className="timeline" role="group" aria-label="Annual timeline playback">
      <div className="timeline-heading">
        <h3 className="section-title">Explore year by year</h3>
        <span className="timeline-duration">9 seconds</span>
      </div>
      <div className="timeline-readout" aria-live="off">
        <strong>{fmtYear(playback.year)}</strong>
        <span>{valueLabel}</span>
      </div>
      <div className="timeline-controls">
        <button type="button" className="timeline-play" onClick={playback.toggle} disabled={disabled} aria-label={`${action} timeline`}>
          {playback.playing ? <PauseIcon /> : complete ? <ReplayIcon /> : <PlayIcon />}{action}
        </button>
        <label className="vh" htmlFor={id}>Playback year</label>
        <input
          id={id} className="timeline-scrubber" type="range" min={from} max={to} step={1}
          value={playback.year} disabled={disabled}
          aria-valuetext={`${fmtYear(playback.year)}: ${valueLabel}`}
          onChange={e => playback.seek(Number(e.target.value))}
        />
        <button type="button" className="icon-button" onClick={playback.reset} disabled={disabled || !playback.active} aria-label="Reset playback" title="Reset playback">
          <ReplayIcon />
        </button>
      </div>
      <p className="timeline-hint">{disabled ? 'Not enough annual data to play this period.' : `${fmtYears(from, to)} · Drag the timeline to inspect a year.`}</p>
      {playback.active && <button type="button" className="link-button" onClick={playback.stop}>Show trend map</button>}
      {/* Anuncia cambios de reproducción, sin leer cada cuadro de la animación. */}
      {playback.active && <span className="vh" role="status">
        {playback.playing ? 'Playing timeline. A full playback takes 9 seconds.' : complete ? 'Playback complete.' : 'Playback paused.'}
      </span>}
    </div>
  )
}
