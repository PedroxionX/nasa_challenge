# Feature Specification: Base compartida e integración

**Feature Branch**: `002-foundation`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md). Esta especificación crea el armazón y las interfaces que permiten a las otras cuatro trabajar sin tocarse. **Se hace y se fusiona en `sync_main` antes de que nadie más cree su rama.**

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `web/src/App.tsx`, `web/src/main.tsx`, `web/src/app/**`, `web/src/lib/**`, `web/src/styles/**`, `web/index.html`, `web/package.json`, `web/package-lock.json`, `web/vite.config.ts`, `web/tsconfig*.json`, `.github/**`, `README.md`, `specs/001-trend-explorer-mvp/**` | El interior de `web/src/features/*` y `web/src/content/**` después de crear los esbozos iniciales; `pipeline/**` |

Excepción única: en su primer commit crea un esbozo en cada carpeta de funcionalidad, mueve `EarthGlobe.tsx` y `geo.ts` a `web/src/features/globe/`, borra `RegionPanel.tsx` y deja un archivo de ejemplo en `web/public/data/trends/`. Tras la fusión, esas carpetas pasan a sus dueños.

## Interfaces que publica (congeladas tras la fusión)

**Revisión 2026-11-14 (fuentes reales de GES DISC, decisión del equipo)**: ids neutrales de variable (`T2M` → `air_temperature`, `PRECTOTCORR` → `precipitation`), periodo por variable, procedencia ampliada y cuatro columnas opcionales en `TrendRow`. Todo lo demás es aditivo; detalle en el [contrato](../001-trend-explorer-mvp/contracts/data-files.md). Lo único que obliga a tocar código ajeno es usar un id viejo como literal en TypeScript (p. ej. una prueba de 005 con `variable: 'T2M'`).

```ts
// web/src/app/state.ts
type VariableId = 'air_temperature' | 'precipitation'   // ?var=T2M / ?var=PRECTOTCORR se traducen sin aviso
interface AppState { regionId: string | null; variableId: VariableId; from: number; to: number; webgl: boolean }
function useAppState(): AppState & {
  setRegion(id: string | null): void; setVariable(id: VariableId): void
  setPeriod(from: number, to: number): void; resetPeriod(): void   // recortan al periodo de la variable activa
}   // setVariable: sin periodo elegido adopta el completo de la nueva variable; con periodo elegido lo recorta

// web/src/lib/data.ts  (tipos = contrato de 001)
function loadCatalog(): Promise<Catalog>
function loadSeries(variableId: VariableId, regionId: string): Promise<SeriesFile>
function loadMap(variableId: VariableId): Promise<MapFile>
function pickWindow(series: SeriesFile, from: number, to: number): TrendRow | null  // null ⇒ datos insuficientes
// TrendRow: 13 columnas del contrato + opcionales line_mid?, slope_decade_pct?, ci_low_pct?, ci_high_pct?
//   (undefined si el archivo no las publica; null si no son evaluables)
function variablePeriod(catalog: Catalog, variableId: VariableId): { firstYear: number; lastYear: number }
const LEGACY_VARIABLE_IDS: Record<string, VariableId>                       // { T2M: 'air_temperature', PRECTOTCORR: 'precipitation' }
const OPTIONAL_WINDOW_COLUMNS: readonly ['line_mid', 'slope_decade_pct', 'ci_low_pct', 'ci_high_pct']
function windowKey(from: number, to: number): string                       // clave de MapFile.windows: "1980-2025"
class DataError extends Error { kind: 'not_found' | 'network' | 'parse' | 'schema_version' | 'invalid'; url: string }
function isDataError(e: unknown): e is DataError

// web/src/app/state.ts — además de useAppState (uso del armazón y del globo)
function useStateNotice(): string | null; function dismissStateNotice(): void   // aviso por valor de URL inválido
function configureState(l: { firstYear: number; lastYear: number; regionIds: Iterable<string>
  periods?: Partial<Record<VariableId, { firstYear: number; lastYear: number }>> }): void  // lo llama el armazón al cargar el catálogo
function markWebglUnavailable(): void                                       // el globo (005) lo llama si WebGL falla tras arrancar
function getLimits(): { firstYear: number; lastYear: number; regionIds: ReadonlySet<string> | null }   // años = periodo de la variable activa

// web/src/lib/assets.ts
function asset(path: string): string   // URL de web/public/ válida bajo subruta; nunca usar '/data/...' directamente

// Entradas que el armazón coloca; ninguna recibe props, todas leen useAppState()
// features/query/index.ts    → QueryBar
// features/globe/index.ts    → GlobeStage
// features/analysis/index.ts → AnalysisPanel
// features/guide/index.ts    → WelcomeCard, MethodsSheet
// content/index.ts           → explainTrend(row, ctx), VARIABLE_COPY, UI_COPY

// web/src/content/index.ts — firmas (el contenido lo escribe 006)
interface ExplainContext { regionName: string; variableId: VariableId; unit: string; from: number; to: number
  alpha: number; fullPeriod: boolean; smallRegion: boolean; isSynthetic: boolean }
interface Explanation { verdict: string; sentence: string; caveats: string[] }
function explainTrend(row: TrendRow | null, ctx: ExplainContext): Explanation   // row null ⇒ datos insuficientes
const VARIABLE_COPY: Record<VariableId, { label: string; short: string; definition: string }>
const UI_COPY: { appName, tagline, welcome, searchPlaceholder, noData, insufficientData, useFullPeriod,
  loadError, retry, noWebgl, synthetic, notCause }   // 006 puede añadir claves; no quitarlas

// web/src/app/ErrorBoundary.tsx — el armazón envuelve cada zona; el globo usa onError = markWebglUnavailable
```

El armazón decide la posición del panel: a la derecha desde 900 px de ancho; por debajo, hoja inferior con tres alturas (asomada, media, completa). La hoja de métodos se abre en un `<dialog>` del armazón; `MethodsSheet` solo pone el contenido. El cierre del panel lo pone `AnalysisPanel` (004).

El armazón expone además las variables CSS `--panel-inset-right` y `--panel-inset-bottom` para que el globo sepa qué zona queda libre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trabajar en paralelo sin conflictos (Priority: P1)

Cada persona crea su rama desde `sync_main` y compila la aplicación con esbozos en lugar de las partes ajenas.

**Independent Test**: tras la fusión, `npm run build` y `npm run test` pasan y la aplicación muestra cinco zonas rotuladas con datos de ejemplo.

**Acceptance Scenarios**:

1. **Given** la base fusionada, **When** alguien sustituye el esbozo de su carpeta, **Then** su rama no modifica ningún archivo fuera de sus rutas.
2. **Given** un navegador sin WebGL o una textura que no carga, **When** se abre la aplicación, **Then** el armazón sigue en pie y `webgl` vale `false`.

### User Story 2 - Publicar la demo (Priority: P1)

El jurado abre un enlace público y la aplicación funciona; también funciona sin red una vez cargada.

**Independent Test**: el sitio publicado completa el recorrido de [../001-trend-explorer-mvp/quickstart.md](../001-trend-explorer-mvp/quickstart.md).

## Requirements *(mandatory)*

- **FR-F01**: Estado único de región, variable y periodo, sincronizado con la URL (cubre FR-018 de 001).
- **FR-F02**: Carga de datos tipada según el contrato, con errores recuperables.
- **FR-F03**: Armazón adaptable: cabecera, escenario y panel en escritorio; hoja inferior en móvil; sin solapes a 700 px.
- **FR-F04**: Límite de errores y detección de WebGL (cubre parte de FR-015).
- **FR-F05**: Variables de diseño compartidas (color, tipografía, espaciado) en `web/src/styles/tokens.css`.
- **FR-F06**: Todas las dependencias del frontend se añaden aquí.
- **FR-F07**: Publicación como sitio estático (decisión del equipo, 2026-11-14) y comprobación sin red (FR-020).

## Success Criteria *(mandatory)*

- **SC-F01**: Ninguna de las cuatro ramas posteriores produce conflictos de fusión entre sí.
- **SC-F02**: La base queda fusionada antes de que empiece el trabajo en paralelo.
- **SC-F03**: El sitio publicado carga y funciona en un teléfono y en un portátil.

## Assumptions

- El alojamiento concreto (por ejemplo GitHub Pages) lo elige quien integra.
- Cambiar una interfaz congelada exige avisar a todos y hacerlo en esta especificación.
