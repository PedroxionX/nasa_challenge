# Feature Specification: Pipeline de datos y motor de tendencias

**Feature Branch**: `003-data-pipeline`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md). Produce los archivos que lee el frontend. Decisiones de fuente, promedio espacial y método en [../001-trend-explorer-mvp/research.md](../001-trend-explorer-mvp/research.md) (D2 a D6).

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `pipeline/**` · `web/public/data/trends/**` (desde que se fusiona la base) | `web/src/**`, `web/package.json`, `web/public/textures/**`, `web/public/data/*.geojson` (solo los lee) |

Si el contrato necesita un cambio, se pide a quien lleva 002; no se edita desde esta rama.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una serie real validada (Priority: P1)

Para una región y una variable existe un archivo con la serie anual, la tabla de ventanas y la procedencia, y sus cifras coinciden con la fuente.

**Independent Test**: Baja California y Texas con `T2M`: el valor de una región de una sola celda coincide con el endpoint por punto, y las medias anuales con la clave anual de la fuente, con diferencia ≤ 0,01.

**Acceptance Scenarios**:

1. **Given** el núcleo del laboratorio en `pipeline/`, **When** se ejecutan sus pruebas, **Then** pasan las 120 sin importar Streamlit ni Plotly.
2. **Given** un fallo de red o una unidad inesperada, **When** se descarga, **Then** el resultado es un error, nunca datos.

### User Story 2 - Todas las regiones y las dos variables (Priority: P1)

Los 84 estados y las dos variables quedan escritos según el contrato, con manifiesto de descargas.

**Independent Test**: cada archivo valida contra el contrato; toda fila tiene estado.

### User Story 3 - Validación externa (Priority: P2)

Un estado de EE. UU. se compara con una herramienta oficial (Giovanni) y el resultado se anota.

## Requirements *(mandatory)*

- **FR-D01**: Descarga por teselas de 2° a 10°, un parámetro por solicitud, con caché y manifiesto de URL, fecha y huella.
- **FR-D02**: Promedio regional ponderado por cos(latitud) y cobertura del polígono; regla y aviso de región pequeña (cubre FR-003 de 001).
- **FR-D03**: Años completos; tasa de precipitación convertida a acumulado; nada se interpola.
- **FR-D04**: Theil-Sen, intervalo de Sen y Mann-Kendall corregido para todas las ventanas de al menos 10 años; estado asignado aquí (FR-006 a FR-008).
- **FR-D05**: Salida validada contra el contrato; procedencia obligatoria (FR-010).
- **FR-D06**: Los datos sintéticos solo existen en pruebas y van marcados.
- **FR-D07**: Texto de atribución de la fuente en `pipeline/ATTRIBUTION.md`, para que 006 lo cite.

## Success Criteria *(mandatory)*

- **SC-D01**: Coincidencia con una implementación independiente (`pymannkendall`, `scipy`) dentro de las tolerancias de las pruebas (SC-006 de 001).
- **SC-D02**: Una serie real coincide con una referencia externa (SC-007 de 001).
- **SC-D03**: Tiempo de cómputo y tamaño total medidos y anotados.

## Assumptions

- Se reutiliza el código del laboratorio (decisión del equipo, 2026-11-14).
- El equipo dispone de cuenta de Earthdata Login (confirmado el 2026-11-14), así que la validación con Giovanni se hace. Las credenciales no se guardan en el repositorio.
