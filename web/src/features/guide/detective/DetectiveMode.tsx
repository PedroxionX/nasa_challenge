/**
 * Modo detective (008 T007, T008, T014, T016, T029, T030): grupo → tema → lugar → predicción → revelación →
 * análisis completo (o un lugar donde pasó lo contrario).
 *
 * Vive dentro de la tarjeta de bienvenida. Abierto, ocupa la tarjeta (ver detective.css). Al terminar abre el
 * análisis por la misma vía que los ejemplos (`setVariable` + `resetPeriod` + `setRegion`); en ese momento el
 * armazón cierra la bienvenida. Importa solo de `app/`, `lib/` y `content/`.
 */
import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../../../app/state'
import { loadCatalog, loadMap, variablePeriod, windowKey, type Catalog, type MapFile, type VariableId } from '../../../lib/data'
import { DETECTIVE_COPY, revealPrediction, UI_COPY, type GroupId, type PlaceId, type Prediction } from '../../../content'
import {
  availableCases, availableGroups, availableTopics, caseKey, countriesForTopic, pick, placeRegions, placesForTopic,
  regionsByCountry, withData, type Case,
} from './options'
import { useContrast } from './useContrast'
import { useReveal } from './useReveal'
import './detective.css'

type Step = 'closed' | 'group' | 'topic' | 'place' | 'predict' | 'reveal'
const PREDICTIONS: Prediction[] = ['up', 'down', 'flat', 'unsure']
const ICON: Record<string, string> = {
  heat: '🌡️', water: '💧', air: '☁️', particles: '🌫️',
  air_temperature: '🌡️', max_air_temperature: '☀️', min_air_temperature: '🌙', soil_temperature: '🪨',
  precipitation: '🌧️', soil_moisture: '🌱', evapotranspiration: '💨', runoff: '🏞️', snow_water_equivalent: '❄️',
  specific_humidity: '💦', total_precipitable_water: '☁️', total_ozone: '🛡️',
  aerosol_optical_depth: '🌫️', dust_optical_depth: '🏜️',
  desert: '🏜️', tropical: '🌴', farmland: '🌾', cold: '🏔️', northeast: '🍁', pacific: '🌊', southeast: '🌳',
  mine: '🏠', surprise: '🎲', contrast: '🔄',
  up: '⬆️', down: '⬇️', flat: '➖', unsure: '🤷',
}

export interface DetectiveModeProps {
  /** Azar inyectable para pruebas (research R6). */
  rand?: () => number
}

export default function DetectiveMode({ rand = Math.random }: DetectiveModeProps) {
  const { setRegion, setVariable, resetPeriod } = useAppState()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogFailed, setCatalogFailed] = useState(false)
  const [step, setStep] = useState<Step>('closed')
  const [groupId, setGroupId] = useState<GroupId | null>(null)
  const [variableId, setVariableId] = useState<string | null>(null)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<PlaceId | null>(null)
  const [viaSurprise, setViaSurprise] = useState(false)
  const [lastCase, setLastCase] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [mine, setMine] = useState('')

  const titleRef = useRef<HTMLHeadingElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)

  useEffect(() => {
    let alive = true
    loadCatalog().then(c => { if (alive) setCatalog(c) }, () => { if (alive) setCatalogFailed(true) })
    return () => { alive = false }
  }, [])

  // Mapa de la variable elegida (T020): qué regiones tienen dato en el periodo completo. Se guarda con su
  // variable; si no carga, no se filtra (`withData` con `null`).
  const [mapState, setMapState] = useState<{ variableId: string; map: MapFile | null } | null>(null)
  useEffect(() => {
    if (!variableId) return
    let alive = true
    loadMap(variableId as VariableId).then(
      m => { if (alive) setMapState({ variableId, map: m }) },
      () => { if (alive) setMapState({ variableId, map: null }) },
    )
    return () => { alive = false }
  }, [variableId])

  // Foco (FR-E09): al título de cada paso nuevo; al botón de entrada al salir.
  useEffect(() => {
    if (step === 'closed') {
      if (returnFocus.current) entryRef.current?.focus()
      returnFocus.current = false
    } else {
      titleRef.current?.focus()
    }
  }, [step])

  const reveal = useReveal(step === 'reveal' ? variableId : null, step === 'reveal' ? regionId : null)
  const contrast = useContrast(step === 'reveal' ? variableId : null, step === 'reveal' ? regionId : null)

  if (step === 'closed') {
    const disabled = !catalog
    return (
      <div className="detective">
        <button
          ref={entryRef}
          type="button"
          className="welcome-example-btn detective-entry"
          disabled={disabled}
          aria-describedby={catalogFailed ? 'detective-unavailable' : undefined}
          onClick={() => { reset(); setStep('group') }}
        >
          <span className="example-label">🕵️ {DETECTIVE_COPY.entry}</span>
          <span className="example-variable">{DETECTIVE_COPY.entryHint}</span>
        </button>
        {catalogFailed && (
          <p id="detective-unavailable" className="detective-note" role="status">{DETECTIVE_COPY.catalogUnavailable}</p>
        )}
      </div>
    )
  }

  // A partir de aquí el catálogo está cargado (el botón de entrada lo exige).
  const cat = catalog as Catalog
  const varLabel = (id: string | null) => cat.variables.find(v => v.id === id)?.label ?? id ?? ''
  const regionName = (id: string | null) => cat.regions.find(r => r.id === id)?.name ?? id ?? ''
  /** Regiones del lugar que están en el catálogo y tienen dato de la variable elegida (T020). */
  function regionsFor(id: PlaceId): string[] {
    const fromCatalog = placeRegions(id, cat)
    if (!variableId) return fromCatalog
    const map = mapState?.variableId === variableId ? mapState.map : null
    const { firstYear, lastYear } = variablePeriod(cat, variableId as VariableId)
    return withData(fromCatalog, map, windowKey(firstYear, lastYear))
  }

  function reset() {
    setGroupId(null); setVariableId(null); setRegionId(null); setPlaceId(null); setViaSurprise(false)
    setPrediction(null); setMine('')
  }
  function exit() { returnFocus.current = true; reset(); setStep('closed') }
  function back() {
    if (step === 'group') return exit()
    if (step === 'topic') return setStep('group')
    if (step === 'place') return setStep('topic')
    if (step === 'predict') return setStep(viaSurprise ? 'group' : 'place')
    if (step === 'reveal') return setStep('predict')
  }
  function chooseGroup(id: GroupId) { setGroupId(id); setStep('topic') }
  function chooseTopic(id: string) { setVariableId(id); setViaSurprise(false); setStep('place') }
  function surprise() {
    const c = pick<Case>(availableCases(cat), rand, x => caseKey(x) === lastCase)
    if (!c) return
    setLastCase(caseKey(c)); setVariableId(c.variableId); setRegionId(c.regionId); setPlaceId(null)
    setViaSurprise(true); setStep('predict')
  }
  function choosePlace(id: PlaceId) {
    const r = pick(regionsFor(id), rand)
    if (!r) return
    setPlaceId(id); setRegionId(r); setStep('predict')
  }
  function otherRegion() {
    if (!placeId) return
    const r = pick(regionsFor(placeId), rand, x => x === regionId)
    if (r) setRegionId(r)
  }
  function chooseMine() {
    if (!mine) return
    setPlaceId(null); setRegionId(mine); setStep('predict')
  }
  function predict(p: Prediction) { setPrediction(p); setStep('reveal') }
  /** Lleva a la pregunta 3 con el otro lugar del par, para volver a predecir (FR-E19). */
  function investigateContrast(other: string) {
    setRegionId(other); setPlaceId(null); setViaSurprise(false); setPrediction(null); setStep('predict')
  }
  function openAnalysis() {
    if (!variableId || !regionId) return
    setVariable(variableId as VariableId)
    resetPeriod()
    setRegion(regionId)
  }

  const groups = availableGroups(cat)
  const topics = groupId ? availableTopics(cat, groupId) : []
  const cases = availableCases(cat)
  const period = (id: string) => variablePeriod(cat, id as VariableId)
  const topicDetail = (id: string) => {
    const { firstYear, lastYear } = period(id)
    return DETECTIVE_COPY.topicDetail(id, varLabel(id), firstYear, lastYear)
  }
  /** Título accesible de cada paso, con el número de pregunta delante (lo lee el lector de pantalla). */
  const stepLabel = (n: number) => <span className="detective-step-count">{DETECTIVE_COPY.step(n)}</span>

  return (
    <div className="detective">
      <section className="detective-flow" aria-label={DETECTIVE_COPY.entry}>
        <div className="detective-nav">
          <button type="button" className="detective-link" onClick={back}>← {DETECTIVE_COPY.back}</button>
          <button type="button" className="detective-link" onClick={exit}>{DETECTIVE_COPY.exit}</button>
        </div>

        {step === 'group' && (
          <div className="detective-step" key="group">
            {stepLabel(1)}
            <h2 ref={titleRef} tabIndex={-1} className="detective-title">{DETECTIVE_COPY.groupTitle}</h2>
            <p className="detective-hint">{DETECTIVE_COPY.groupHint}</p>
            <div className="detective-options">
              {groups.map(id => (
                <button key={id} type="button" className="welcome-example-btn detective-option" onClick={() => chooseGroup(id)}>
                  <span className="example-place"><span aria-hidden="true">{ICON[id]} </span>{DETECTIVE_COPY.groups[id]}</span>
                  <span className="example-variable">{DETECTIVE_COPY.groupDetail[id]}</span>
                </button>
              ))}
              {cases.length > 0 && (
                <button type="button" className="welcome-example-btn detective-option" onClick={surprise}>
                  <span className="example-place"><span aria-hidden="true">{ICON.surprise} </span>{DETECTIVE_COPY.surprise}</span>
                  <span className="example-variable">{DETECTIVE_COPY.surpriseHint}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'topic' && groupId && (
          <div className="detective-step" key="topic">
            {stepLabel(1)}
            <h2 ref={titleRef} tabIndex={-1} className="detective-title">{DETECTIVE_COPY.topicTitle}</h2>
            <p className="detective-hint">{DETECTIVE_COPY.topicHint(DETECTIVE_COPY.groups[groupId])}</p>
            <div className="detective-options">
              {topics.map(id => (
                <button key={id} type="button" className="welcome-example-btn detective-option" onClick={() => chooseTopic(id)}>
                  <span className="example-place"><span aria-hidden="true">{ICON[id]} </span>{DETECTIVE_COPY.topics[id] ?? varLabel(id)}</span>
                  <span className="example-variable">{topicDetail(id)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'place' && (
          <div className="detective-step" key="place">
            {stepLabel(2)}
            <h2 ref={titleRef} tabIndex={-1} className="detective-title">{DETECTIVE_COPY.placeTitle}</h2>
            <p className="detective-hint">{DETECTIVE_COPY.placeHint}</p>
            <div className="detective-options">
              {placesForTopic(variableId ?? '').map(id => {
                const none = regionsFor(id).length === 0
                return (
                  <button
                    key={id}
                    type="button"
                    className="welcome-example-btn detective-option"
                    disabled={none}
                    onClick={() => choosePlace(id)}
                  >
                    <span className="example-place"><span aria-hidden="true">{ICON[id]} </span>{DETECTIVE_COPY.places[id]}</span>
                    <span className="example-variable">
                      {none ? DETECTIVE_COPY.placeUnavailable : regionsFor(id).map(regionName).join(' · ')}
                    </span>
                  </button>
                )
              })}
            </div>
            <form className="detective-mine" onSubmit={e => { e.preventDefault(); chooseMine() }}>
              <label htmlFor="detective-region">
                <span aria-hidden="true">{ICON.mine} </span>
                {countriesForTopic(variableId ?? '').includes('MX') ? DETECTIVE_COPY.mine : DETECTIVE_COPY.mineUsOnly}
              </label>
              <div className="detective-mine-row">
                <select id="detective-region" value={mine} onChange={e => setMine(e.target.value)}>
                  <option value="">{DETECTIVE_COPY.regionSelectPlaceholder}</option>
                  {regionsByCountry(cat, countriesForTopic(variableId ?? '')).map(g => (
                    <optgroup key={g.country} label={DETECTIVE_COPY.countries[g.country] ?? g.country}>
                      {g.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button type="submit" className="detective-primary" disabled={!mine}>{DETECTIVE_COPY.continue}</button>
              </div>
            </form>
          </div>
        )}

        {step === 'predict' && (
          <div className="detective-step" key="predict">
            {stepLabel(3)}
            <h2 ref={titleRef} tabIndex={-1} className="detective-title">
              {DETECTIVE_COPY.predictTitle(
                DETECTIVE_COPY.topicNoun(variableId ?? '', varLabel(variableId)),
                regionName(regionId),
                period(variableId ?? '').firstYear,
                period(variableId ?? '').lastYear,
              )}
            </h2>
            <p className="detective-hint">{DETECTIVE_COPY.predictHint}</p>
            {placeId && regionsFor(placeId).length > 1 && (
              <button type="button" className="detective-link" onClick={otherRegion}>↻ {DETECTIVE_COPY.otherRegion}</button>
            )}
            <div className="detective-options detective-options--grid">
              {PREDICTIONS.map(p => (
                <button key={p} type="button" className="welcome-example-btn detective-option" onClick={() => predict(p)}>
                  <span className="example-place"><span aria-hidden="true">{ICON[p]} </span>{DETECTIVE_COPY.predictions[p]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'reveal' && (
          <div className="detective-step" key="reveal">
            {/* El título dice qué se investigó (más útil que un «Resultado» genérico y ahorra una línea). */}
            <h2 ref={titleRef} tabIndex={-1} className="detective-title detective-title--reveal">
              <span className="visually-hidden">{DETECTIVE_COPY.revealTitle}: </span>
              {DETECTIVE_COPY.revealContext(
                regionName(regionId),
                DETECTIVE_COPY.topicName(variableId ?? '', varLabel(variableId)),
                period(variableId ?? '').firstYear,
                period(variableId ?? '').lastYear,
              )}
            </h2>
            {prediction && (
              <p className="detective-lead">{DETECTIVE_COPY.yourPrediction(DETECTIVE_COPY.predictions[prediction])}</p>
            )}
            {reveal.state === 'loading' && <p role="status" className="detective-note">{DETECTIVE_COPY.loading}</p>}
            {reveal.state === 'error' && (
              <div role="alert" className="detective-error">
                <p>{UI_COPY.loadError}</p>
                <button type="button" className="detective-primary" onClick={reveal.retry}>{UI_COPY.retry}</button>
              </div>
            )}
            {reveal.state === 'ready' && prediction && (() => {
              const r = revealPrediction(prediction, reveal.row, reveal.ctx)
              return (
                <div className={`detective-reveal detective-reveal--${r.match}`} role="status">
                  <p className="detective-verdict">{r.verdict}</p>
                  <p className="detective-sentence">{r.sentence}</p>
                  {r.change && (
                    <p className="detective-change"><strong>{DETECTIVE_COPY.changeLabel}:</strong> {r.change}</p>
                  )}
                  {r.facts && <p className="detective-facts">{DETECTIVE_COPY.technicalLabel}: {r.facts}</p>}
                  <ul className="detective-caveats">{r.caveats.map(c => <li key={c}>{c}</li>)}</ul>
                </div>
              )
            })()}
            {reveal.state === 'ready' && variableId && DETECTIVE_COPY.why[variableId] && (
              <section className="detective-why" aria-label={DETECTIVE_COPY.whyTitle}>
                <p className="detective-why-title"><span aria-hidden="true">🌍 </span>{DETECTIVE_COPY.whyTitle}</p>
                <p className="detective-why-text">{DETECTIVE_COPY.why[variableId]}</p>
                <p className="detective-why-note">{DETECTIVE_COPY.whyNote}</p>
              </section>
            )}
            {contrast && (
              <div className="detective-contrast">
                <p className="detective-contrast-title">
                  <span aria-hidden="true">{ICON.contrast} </span>{DETECTIVE_COPY.contrastTitle}
                </p>
                <p className="detective-hint">
                  {DETECTIVE_COPY.contrastText(DETECTIVE_COPY.topicNoun(variableId ?? '', varLabel(variableId)), regionName(contrast))}
                </p>
                <button type="button" className="detective-link" onClick={() => investigateContrast(contrast)}>
                  {DETECTIVE_COPY.contrastAction(regionName(contrast))} →
                </button>
              </div>
            )}
            <button type="button" className="detective-primary detective-open" onClick={openAnalysis}>
              {DETECTIVE_COPY.openAnalysis} →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
