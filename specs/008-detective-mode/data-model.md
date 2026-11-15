# Data Model: Modo detective

Todo es estado local o datos fijos del frontend. No hay archivos nuevos ni cambios en el contrato de datos.

## Datos fijos (`features/guide/detective/options.ts`)

| Entidad | Campos | Valores |
|---|---|---|
| `Topic` | `variableId: string` | `air_temperature`, `precipitation`, `soil_moisture`, `evapotranspiration` (texto en `DETECTIVE_COPY.topics[variableId]`) |
| `Place` | `id`, `regionIds: string[]` | `desert`: MX-SON, US-AZ, US-NV · `tropical`: MX-CHP, MX-TAB, US-HI · `farmland`: US-IN, US-IA, US-KS · `cold`: US-AK, US-CO |
| `CuratedCase` | `regionId`, `variableId` | MX-HID·precipitation · MX-VER·precipitation · US-HI·soil_moisture · US-FL·evapotranspiration · MX-CHH·air_temperature |

**Filtros (puros, probados):**
- `availableTopics(catalog)`: temas cuya variable está en `catalog.variables`.
- `placeRegions(place, catalog)`: ids del lugar presentes en `catalog.regions`.
- `availableCases(catalog)`: casos cuya variable y región están en el catálogo.
- `pick(list, rand, avoid?)`: elemento al azar distinto de `avoid` si hay alternativa.

## Estado del flujo (`DetectiveMode.tsx`)

```text
closed ──open──▶ topic ──tema──▶ place ──lugar/estado──▶ predict ──predicción──▶ reveal ──abrir──▶ (setRegion; la bienvenida se cierra)
                   │  └─Sorpréndeme──────────────────────▶ predict
   ◀──salir── cualquier paso;  ◀──atrás── paso anterior (desde predict tras Sorpréndeme vuelve a topic)
```

| Campo | Tipo | Notas |
|---|---|---|
| `step` | `'closed' \| 'group' \| 'topic' \| 'place' \| 'predict' \| 'reveal'` | `group` añadido el 2026-11-15 (FR-E15) |
| `groupId` | `GroupId \| null` | grupo elegido en la primera pantalla de la pregunta 1 |
| `variableId` | `string \| null` | |
| `regionId` | `string \| null` | |
| `viaSurprise` | `boolean` | decide a dónde vuelve «Atrás» |
| `lastCase` | `string \| null` | `${regionId}:${variableId}`, para no repetir |
| `prediction` | `'up' \| 'down' \| 'flat' \| 'unsure' \| null` | solo en memoria (FR, Assumptions) |

## Revelación (`useReveal.ts`)

Entrada: `variableId`, `regionId`, `catalog`. Salida: `{ state: 'loading' } | { state: 'error', retry } | { state: 'ready', row: TrendRow | null, ctx }`.

`ctx` = `{ regionName, variableLabel, unit, from, to, alpha, method, smallRegion, slope }`, donde `slope` y `unit` siguen [research.md R4](research.md).

## Validaciones

- Nunca se abre el análisis con una región o variable fuera del catálogo.
- `row === null` o `status ∈ {insufficient, invalid}` ⇒ no se compara con la predicción.

## Revisión 2026-11-15

```text
closed ──open──▶ group ──grupo──▶ topic ──tema──▶ place ──▶ predict ──▶ reveal ──abrir──▶ (setRegion)
                   └─Sorpréndeme─────────────────────────▶ predict
reveal ──«Investigar {otro lugar}» (par confirmado por useContrast)──▶ predict (mismo tema, otro lugar)
Atrás: topic→group · place→topic · predict→place (o group tras Sorpréndeme) · reveal→predict
```

Datos fijos nuevos en `options.ts`: `GROUPS` (14 temas en 4 grupos), lugares `northeast`/`pacific`/`southeast`,
lugares por grupo (≤ 5), nieve solo en lugares fríos y estados de EE. UU., 10 casos curados y 3 pares `CONTRASTS`.
