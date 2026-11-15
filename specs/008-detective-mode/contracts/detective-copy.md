# Contract: textos y frase de la revelación (`web/src/content/index.ts`)

Interfaz que `features/guide/detective/` consume de `content/`. Se añade entre `fmtP` y `explainTrend`; no cambia ninguna exportación existente.

```ts
export type Prediction = 'up' | 'down' | 'flat' | 'unsure'
export type PlaceId = 'desert' | 'tropical' | 'farmland' | 'cold'

export const DETECTIVE_COPY: {
  entry: string                                  // «Investigar como detective»
  entryHint: string                              // «Tres preguntas y descubres qué dicen los datos.»
  exit: string; back: string
  topicTitle: string                             // «¿Qué te da curiosidad?»
  topics: Readonly<Record<string, string>>       // variableId → pregunta llana (FR-E02)
  surprise: string; surpriseHint: string         // «Sorpréndeme» · «Elegimos un caso interesante por ti.»
  placeTitle: string                             // «¿Dónde quieres investigar?»
  mine: string                                   // «Mi estado» (clave aparte: no es un PlaceId)
  places: Readonly<Record<PlaceId, string>>      // Desierto · Trópico húmedo · Zona agrícola · Frío / montaña
  placeUnavailable: string                       // motivo cuando un lugar no tiene datos para la variable
  regionSelectLabel: string; regionSelectPlaceholder: string
  countries: Readonly<Record<string, string>>    // MX → «México», US → «Estados Unidos» (grupos del selector)
  continue: string                               // «Continuar» (confirma «Mi estado»)
  otherRegion: string
  predictTitle: string                           // «¿Qué crees que pasó?»
  investigating: (region: string, variable: string) => string
  predictions: Readonly<Record<Prediction, string>> // Subió · Bajó · Casi no cambió · Ni idea
  revealTitle: string; openAnalysis: string      // «Lo que dicen los datos» · «Ver el análisis completo»
  yourPrediction: (p: string) => string          // «Tu predicción: Subió.»
  loading: string; catalogUnavailable: string
  method: (slope: string, test: string) => string // ids de catalog.method → nombre llano (constitución I)
}

export interface RevealContext {
  regionName: string
  unit: string        // pendiente absoluta, ya con «/década» («mm/década», «°C/década»)
  pct: number | null  // slope_decade_pct publicado si la variable tiene relative_change; si no, null (T019)
  from: number; to: number
  alpha: number
  method: string      // nombre llano del método, desde catalog.method (constitución I)
  smallRegion: boolean
}

export interface Reveal {
  verdict: string           // VERDICT_LABEL[status] o «Datos insuficientes»
  match: 'match' | 'opposite' | 'undecided' | 'neutral' | 'none'
  sentence: string          // frase de comparación (research R5)
  // Con evidencia: «−20.00 mm/década (−6.4 % por década) · 2001–2024 · 24 años · p = 0.040 · α = 0.05 · pendiente de
  // Theil-Sen y prueba de Mann-Kendall…». Sin evidencia: sin pendiente y con «· unidad: mm/década». null si no hay veredicto.
  facts: string | null
  caveats: string[]         // región pequeña; siempre UI_COPY.notCause
}

export function revealPrediction(prediction: Prediction, row: TrendRow | null, ctx: RevealContext): Reveal
```

## Reglas verificadas por pruebas

1. Ninguna `sentence` contiene «no hay cambio», «no cambió» afirmado, «porque», «debido a», «causa», «seguirá» ni «pronóstico».
2. `inconclusive` siempre incluye que la falta de evidencia no demuestra ausencia de cambio, y ni `sentence` ni `facts` mencionan dirección («aumento», «disminución», «sube», «baja») ni pendiente.
3. `flat` + `inconclusive` nunca usa «coincide» ni «acertaste».
4. `insufficient`, `invalid` o `row === null` ⇒ `match = 'none'`, `facts = null`.
5. `unsure` nunca usa «coincide», «acertaste» ni «sorpresa».
6. `facts` incluye la pendiente solo con `increasing`/`decreasing`, absoluta y con el % entre paréntesis si `ctx.pct` no es `null`, como el panel (T019). Las cifras de `facts` son las de `row` (pendiente con `fmt`, p con `fmtP`) y `facts` incluye periodo, n, unidades, α y método (constitución I).

## Revisión 2026-11-15 (14 variables, T027–T030)

Añadidos a `DETECTIVE_COPY` y a los tipos:

```ts
export type GroupId = 'heat' | 'water' | 'air' | 'particles'
export type PlaceId = 'desert' | 'tropical' | 'farmland' | 'cold' | 'northeast' | 'pacific' | 'southeast'

DETECTIVE_COPY.groupTitle / groupHint                       // «¿Qué parte del clima te interesa?»
DETECTIVE_COPY.groups / groupDetail: Record<GroupId, string>
DETECTIVE_COPY.topicHint: (group: string) => string          // antes era un texto fijo
DETECTIVE_COPY.topics                                        // 14 preguntas llanas (FR-E16)
DETECTIVE_COPY.topicName / topicNoun / topicPlural           // nombre, sustantivo y número de cada tema
DETECTIVE_COPY.mineUsOnly                                    // «O elige un estado de Estados Unidos» (nieve)
DETECTIVE_COPY.contrastTitle / contrastText / contrastAction // «¿Y en otro lugar?» (FR-E19)

RevealContext.plural?: boolean        // concordancia del verbo («aumentaron»)
RevealContext.dimensionless?: boolean // sin unidad física: `change` solo en % y `facts` declara «% por década»
```

Regla añadida: `contrastText` no atribuye causa; solo dice que la tendencia fue en la dirección contraria.
