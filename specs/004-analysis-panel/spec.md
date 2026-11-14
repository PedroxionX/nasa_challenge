# Feature Specification: Búsqueda, variable, periodo y panel de análisis

**Feature Branch**: `004-analysis-panel`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md): historias US1 y US2. Diseño en [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md) §5 a §7.

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `web/src/features/analysis/**` · `web/src/features/query/**` (componentes, estilos y pruebas dentro de esas carpetas) | `web/src/App.tsx`, `web/src/app/**`, `web/src/lib/**`, `web/src/styles/**`, `web/src/features/globe/**`, `web/src/features/guide/**`, `web/src/content/**`, `web/package.json` |

Consume: `useAppState`, `loadCatalog`, `loadSeries`, `pickWindow` (de 002) y `explainTrend`, `VARIABLE_COPY`, `UI_COPY` (de 006; hasta que lleguen, el esbozo devuelve texto de relleno). Importa solo desde `app/`, `lib/` y `content/`.

Si hay una persona más, `web/src/features/query/**` puede separarse como especificación propia sin conflicto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir región y variable sin el globo (Priority: P1)

Buscador por nombre agrupado por país y selector de dos variables con su definición.

**Independent Test**: con teclado solamente se elige «Sonora» y se cambia a precipitación.

### User Story 2 - Leer el resultado (Priority: P1)

Gráfica anual con recta, banda e hitos; veredicto, cambio por década, intervalo, valor p y años; explicación; detalles técnicos y procedencia desplegables.

**Independent Test**: con el archivo de ejemplo, cada uno de los cinco estados se muestra con su texto y sin cifras inventadas.

**Acceptance Scenarios**:

1. **Given** una región con datos, **When** se abre, **Then** aparecen método, periodo, n, unidades, α y procedencia.
2. **Given** `pickWindow` devuelve `null`, **When** se muestra el panel, **Then** dice «datos insuficientes» y ofrece volver al periodo completo.
3. **Given** un error de carga, **When** se reintenta, **Then** se recupera sin recargar la página.

### User Story 3 - Cambiar el periodo (Priority: P1)

Control de año inicial y final; aviso cuando el periodo no es el completo y vista de cómo varía la pendiente con el año inicial.

**Independent Test**: nunca se produce un periodo invertido; las cifras de la vista salen de la tabla de ventanas.

## Requirements *(mandatory)*

Cubre de 001: FR-001, FR-002 (búsqueda), FR-004, FR-005, FR-006 a FR-010 (presentación), FR-012, FR-014, FR-015 (carga, error, sin datos, insuficientes), FR-016, FR-019 (aviso de periodo).

- **FR-A01**: No existe ningún elemento «años para ser significativo».
- **FR-A02**: El panel se cierra con Escape y devuelve el foco al buscador; los cambios de resultado se anuncian a lectores de pantalla.
- **FR-A03**: Gráfica con alternativa en tabla y legible a 360 px de ancho.
- **FR-A04**: Objetivos táctiles de al menos 44 px en todo lo que posee.

## Success Criteria *(mandatory)*

- **SC-A01**: El 100 % de los resultados mostrados incluye método, periodo, n, unidades, α y procedencia (SC-005 de 001).
- **SC-A02**: US1 a US3 se completan solo con teclado y en 390×844.

## Assumptions

- La posición y el tamaño del panel los decide el armazón (002); aquí solo se diseña su interior.
