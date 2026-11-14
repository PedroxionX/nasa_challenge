# Feature Specification: Globo, mapa de tendencias y rendimiento de la escena

**Feature Branch**: `005-globe-map`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md): historia US3 y la mitad espacial de US1. Hallazgos y presupuesto en [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md) §2 y §3.

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `web/src/features/globe/**` (incluye `EarthGlobe.tsx` y `geo.ts`, ya movidos por 002) · `web/public/textures/**` · `web/public/data/*.geojson` | `web/src/App.tsx`, `web/src/app/**`, `web/src/lib/**`, `web/src/styles/**`, las otras carpetas de `features/`, `web/src/content/**`, `web/public/data/trends/**`, `web/package.json` |

Consume: `useAppState`, `loadCatalog`, `loadMap` (de 002), `UI_COPY` (de 006) y las variables `--panel-inset-*` del armazón.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seleccionar en el globo (Priority: P1)

Tocar un estado lo selecciona y la cámara lo centra en la zona que el panel deja libre, en escritorio y en móvil.

**Independent Test**: en 390×844 la región elegida queda visible por encima de la hoja inferior.

**Acceptance Scenarios**:

1. **Given** un dispositivo táctil, **When** se toca un estado, **Then** se selecciona y no queda ningún tooltip fijo.
2. **Given** `webgl` es `false`, **When** se abre la aplicación, **Then** esta zona muestra el aviso y la tabla de regiones en lugar del globo.

### User Story 2 - Ver dónde cambia (Priority: P2)

El globo se tiñe por cambio estimado, con leyenda, estado «sin datos» y vista de tabla ordenable.

**Independent Test**: toda la información del mapa se obtiene desde la tabla.

### User Story 3 - Escena dentro de presupuesto (Priority: P2)

El dibujo se detiene en reposo, respeta el movimiento reducido y reduce llamadas y texturas.

**Independent Test**: 0 cuadros dibujados en reposo; llamadas de dibujo por cuadro medidas antes y después.

## Requirements *(mandatory)*

Cubre de 001: FR-002 (globo), FR-011, FR-015 (sin WebGL, fallo de texturas), FR-016 (tacto), FR-017, FR-019 (aviso de comparaciones múltiples).

- **FR-G01**: La selección se marca con contorno y elevación; el relleno queda reservado a la escala de datos.
- **FR-G02**: Con datos visibles, nubes apagadas y rotación detenida.
- **FR-G03**: Se liberan al desmontar las texturas y el material que crea el componente.
- **FR-G04**: La leyenda dice que el color es el cambio estimado, no su significancia.
- **FR-G05**: Se revisa el artefacto de triangulación observado en Texas.

## Success Criteria *(mandatory)*

- **SC-G01**: 0 cuadros dibujados en reposo (medido).
- **SC-G02**: Objetivos, por validar en dispositivos de referencia: ≤ 400 llamadas de dibujo por cuadro y ≤ 2,5 MB de texturas en móvil.
- **SC-G03**: Resultados de la medición anotados; todo objetivo incumplido tiene una decisión.

## Assumptions

- No se añade mapa 2D ni se migra de librería (decisiones D1 y D9 de 001).
