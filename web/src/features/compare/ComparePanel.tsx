/**
 * Vista de comparación de dos regiones (007 T013–T016). La coloca el armazón en lugar del panel de análisis
 * cuando la URL trae `vs=`. Orden de lectura: ¿difieren las tendencias? → cada región por separado → las dos
 * series → «En palabras» → detalles y procedencia.
 *
 * No calcula estadística: la diferencia sale de `compare/` (pickComparison) y los resultados individuales de
 * `windows` de cada serie (pickWindow). Tampoco nombra ninguna variable: etiqueta, unidad y base vienen del
 * catálogo y de los archivos, así que sirve para cualquier variable publicada (FR-K11).
 */
import { useEffect, useId } from 'react'
import { useAppState } from '../../app/state'
import {
  pickComparison, type Catalog, type CompareVariableInfo, type DifferenceRow, type PairLookup, type SeriesFile,
} from '../../lib/data'
import { COMPARE_COPY, UI_COPY, explainComparison, explainTrend, localizeUnit, variableCopy, type ComparisonExplanation } from '../../content'
import { ENTRY_SELECT_ID, individual, nearestStart, yearPoints, type Individual } from './compareData'
import { digitsForValues, fmtAlpha, fmtInterval, fmtP, fmtSigned, fmtYears, perDecade } from '../../lib/format'
import CloseButton from '../../lib/ui/CloseButton'
import { VerdictIcon, WarningIcon, type VerdictGlyph } from '../../lib/ui/icons'
import RegionCombobox from '../../lib/ui/RegionCombobox'
import Term from '../../lib/ui/Term'
import PairChart from './PairChart'
import { EachRegion, PairProvenance, type Side } from './PairFacts'
import StartSelect from './StartSelect'
import { useCompareData } from './useCompareData'
import './compare.css'

const GLYPH: Record<DifferenceRow['status'], VerdictGlyph> = {
  differ: 'differ', inconclusive: 'approx', insufficient: 'blocked', invalid: 'blocked',
}

/** El mismo bloque de veredicto que el análisis: icono + palabras, la cifra de la diferencia y su evidencia. */
function Difference({ row, explanation, pairLabel, unit, alpha }: {
  row: DifferenceRow; explanation: ComparisonExplanation; pairLabel: string; unit: string; alpha: number
}) {
  const figures = row.status === 'differ' || row.status === 'inconclusive'
  const digits = digitsForValues(row.diff_decade, row.ci_low, row.ci_high)
  const level = Math.round((1 - alpha) * 100)
  return (
    <section className={`verdict compare-verdict compare-verdict--${row.status}`} aria-label={COMPARE_COPY.differenceHeading}>
      <h3 className="verdict-heading">{COMPARE_COPY.differenceHeading}</h3>
      <p className="verdict-head">
        <VerdictIcon glyph={GLYPH[row.status]} />
        <span className="verdict-word">{explanation.verdict}</span>
      </p>
      {figures && (
        <p className={row.status === 'inconclusive' ? 'verdict-figure verdict-figure--estimate' : 'verdict-figure'}>
          {row.status === 'inconclusive' && 'Estimated difference, '}
          <span>{`${pairLabel}: `}</span>
          <span className="compare-verdict-number">{`${fmtSigned(row.diff_decade, digits)} ${perDecade(unit)}`}</span>
        </p>
      )}
      {figures && (
        <p className="verdict-detail">
          <Term k="ci">{`${level}% interval: ${fmtInterval(row.ci_low, row.ci_high, digits)}`}</Term>
        </p>
      )}
      {figures && (
        <p className="verdict-detail">
          <Term k="p">{fmtP(row.p)}</Term>
          <Term k="alpha">{fmtAlpha(alpha)}</Term>
        </p>
      )}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="skeleton">
      <span className="vh">Loading…</span>
      <div className="sk sk-verdict" />
      <div className="sk sk-chart" />
      <div className="sk sk-line" />
    </div>
  )
}

function Ready({ catalog, seriesA, seriesB, published, lookup, nameA, nameB }: {
  catalog: Catalog; seriesA: SeriesFile; seriesB: SeriesFile; published: CompareVariableInfo | null
  lookup: PairLookup | null; nameA: string; nameB: string
}) {
  const { regionId, compareId, variableId, from, to, setPeriod } = useAppState()
  const variable = catalog.variables.find(v => v.id === variableId)
  const unit = localizeUnit(variable?.unit_annual ?? seriesA.unit)
  const region = (id: string | null) => catalog.regions.find(r => r.id === id)
  const isSynthetic = seriesA.provenance.is_synthetic || seriesB.provenance.is_synthetic
  const smallRegion = Boolean(region(regionId)?.small_region || region(compareId)?.small_region)

  const verdictOf = (name: string, r: Individual) => explainTrend(r.row, {
    regionName: name, variableId, unit: `${localizeUnit(unit)}/decade`, from, to, alpha: catalog.alpha,
    fullPeriod: true, smallRegion: false, isSynthetic: false,
  }).verdict
  const a = individual(seriesA, variable, from, to)
  const b = individual(seriesB, variable, from, to)
  const sides: Side[] = [
    { tag: 'A', name: nameA, series: seriesA, result: a, verdict: verdictOf(nameA, a) },
    { tag: 'B', name: nameB, series: seriesB, result: b, verdict: verdictOf(nameB, b) },
  ]

  // La diferencia se lee en el orden del archivo (primero el id que va antes), no en el de A y B.
  const byId = (id: string) => (id === regionId ? { name: nameA, result: a } : { name: nameB, result: b })
  let explanation: ComparisonExplanation | null = null
  let pairLabel = ''
  if (lookup?.kind === 'row' && published) {
    const first = byId(lookup.first)
    const second = byId(lookup.second)
    pairLabel = COMPARE_COPY.order(first.name, second.name)
    const side = (r: Individual) => (r.row ? { status: r.status, slope: r.row.slope_decade } : null)
    explanation = explainComparison(lookup.row, {
      firstName: first.name, secondName: second.name, unit: localizeUnit(published.unit), basis: published.basis,
      from, to, alpha: catalog.alpha, minYears: catalog.period.min_window_years,
      first: side(first.result), second: side(second.result), smallRegion, isSynthetic,
    })
  }
  const suggested = published && lookup?.kind === 'no_window' ? nearestStart(published.starts, from) : null

  const label = variableCopy(variableId, variable).label
  const announcement = `${COMPARE_COPY.title(nameA, nameB)}, ${label.toLowerCase()} ${fmtYears(from, to)}: ${
    explanation ? explanation.verdict : 'no test of the difference for this case'}.`

  return (
    <div className="compare-result">
      <p className="vh" role="status" aria-live="polite">{announcement}</p>

      {isSynthetic && <p className="notice notice--icon notice--synthetic"><WarningIcon size={18} />{UI_COPY.synthetic}</p>}

      {lookup?.kind === 'row' && explanation && published && (
        <Difference
          row={lookup.row} explanation={explanation} pairLabel={pairLabel} unit={localizeUnit(published.unit)} alpha={catalog.alpha}
        />
      )}
      {lookup?.kind === 'not_comparable' && <p className="notice">{COMPARE_COPY.notComparable[lookup.reason]}</p>}
      {lookup?.kind === 'missing' && <p className="notice">{COMPARE_COPY.missingPair}</p>}
      {lookup === null && <p className="notice">{COMPARE_COPY.notPublished}</p>}
      {lookup?.kind === 'no_window' && published && (
        <div className="notice">
          <p>{COMPARE_COPY.noWindow(published.end)}</p>
          {suggested !== null && (
            <button type="button" onClick={() => setPeriod(suggested, published.end)}>
              {COMPARE_COPY.showWindow(suggested, published.end)}
            </button>
          )}
        </div>
      )}

      {explanation && (
        <section className="words" aria-label="In words">
          <h3 className="section-title">In words</h3>
          <p className="words-sentence">{explanation.sentence}</p>
          {explanation.pattern && <p className="words-note">{explanation.pattern}</p>}
          {explanation.caveats.length > 0 && (
            <ul className="words-notes">{explanation.caveats.map(c => <li key={c}>{c}</li>)}</ul>
          )}
        </section>
      )}

      <EachRegion sides={sides} unit={unit} />

      <div className="compare-charts">
        <PairChart
          items={sides.map(s => ({ tag: s.tag, name: s.name, points: yearPoints(s.series), row: s.result.row }))}
          unit={unit} from={from} to={to}
        />
        {published && lookup !== null && lookup.kind !== 'not_comparable' && lookup.kind !== 'missing' && (
          <StartSelect starts={published.starts} end={published.end} from={from} to={to} onPick={setPeriod} />
        )}
      </div>

      <div className="compare-more">
        <details className="disclosure">
          <summary>How the comparison works</summary>
          <p>{COMPARE_COPY.method}</p>
          <p>{`${fmtAlpha(catalog.alpha)}. ${UI_COPY.significanceNote}`}</p>
        </details>
        <PairProvenance sides={sides} />
      </div>
    </div>
  )
}

export default function ComparePanel() {
  const { regionId, compareId, variableId, from, to, setCompare } = useAppState()
  const { load, retry } = useCompareData(variableId, regionId, compareId)
  const selectId = useId()

  const leave = () => {
    setCompare(null)
    // La entrada aparece al desmontarse esta vista: se enfoca en cuanto existe.
    setTimeout(() => document.getElementById(ENTRY_SELECT_ID)?.focus(), 0)
  }

  // FR-K01: Escape sale de la comparación; la región principal sigue abierta.
  useEffect(() => {
    if (!compareId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('dialog[open]')) return // el diálogo de métodos se cierra solo
      e.preventDefault()
      setCompare(null)
      setTimeout(() => document.getElementById(ENTRY_SELECT_ID)?.focus(), 0)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [compareId, setCompare])

  if (!regionId || !compareId) return null

  const catalog = load.kind === 'ready' ? load.catalog : null
  const nameOf = (id: string) => catalog?.regions.find(r => r.id === id)?.name ?? id
  const nameA = nameOf(regionId)
  const nameB = nameOf(compareId)
  const variable = variableCopy(variableId, catalog?.variables.find(v => v.id === variableId))
  const lookup = load.kind === 'ready' && load.file ? pickComparison(load.file, regionId, compareId, from, to) : null

  return (
    <article className="compare" aria-busy={load.kind === 'loading'}>
      <div className="panel-header">
        <div className="panel-title">
          <h2>{COMPARE_COPY.title(nameA, nameB)}</h2>
          <p className="panel-meta">
            {`${variable.label} · ${fmtYears(from, to)}`}
            {lookup?.kind === 'row' && ` · ${COMPARE_COPY.commonYears(lookup.row.n)}`}
          </p>
        </div>
        <CloseButton label={COMPARE_COPY.remove} onClick={leave} />
      </div>

      <div className="compare-pick">
        <span className="compare-pick-a"><span className="tag">A</span>{nameA}</span>
        <span className="tag" aria-hidden="true">B</span>
        <RegionCombobox
          id={selectId} inline label="State compared" placeholder={COMPARE_COPY.entryPlaceholder}
          value={compareId} excludeId={regionId} onChange={setCompare}
        />
      </div>

      {load.kind === 'loading' && <Skeleton />}

      {load.kind === 'error' && (
        <div className="notice notice--error" role="alert">
          <p>{COMPARE_COPY.loadError}</p>
          <button type="button" onClick={retry}>{UI_COPY.retry}</button>
        </div>
      )}

      {load.kind === 'ready' && (!load.seriesA || !load.seriesB) && (
        <div className="notice">
          {!load.seriesA && <p>{COMPARE_COPY.noData(nameA)}</p>}
          {!load.seriesB && <p>{COMPARE_COPY.noData(nameB)}</p>}
        </div>
      )}

      {load.kind === 'ready' && load.seriesA && load.seriesB && (
        <Ready
          catalog={load.catalog} seriesA={load.seriesA} seriesB={load.seriesB}
          published={load.published} lookup={lookup} nameA={nameA} nameB={nameB}
        />
      )}
    </article>
  )
}
