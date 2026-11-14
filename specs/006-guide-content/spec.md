# Feature Specification: Textos, explicaciones, guía y validación con usuarios

**Feature Branch**: `006-guide-content`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md): historia US4 y el lenguaje de toda la aplicación. Textos de partida en [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md) §7; prueba con usuarios en §8.

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `web/src/content/**` · `web/src/features/guide/**` · `docs/**` (guion de la demo, resultados de la prueba con usuarios) | `web/src/App.tsx`, `web/src/app/**`, `web/src/lib/**`, `web/src/styles/**`, las otras carpetas de `features/`, `pipeline/**`, `web/package.json` |

Publica para los demás, desde `web/src/content/index.ts`: `explainTrend(row, ctx)`, `VARIABLE_COPY`, `UI_COPY`. Las firmas las fija 002; aquí se escribe el contenido. Entrega pronto la paleta y la tipografía a quien lleva 002, que es quien las escribe en `tokens.css`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explicaciones veraces (Priority: P1)

Cada estado del análisis tiene una frase en lenguaje llano construida solo con cifras calculadas.

**Independent Test**: pruebas automáticas comprueban que ninguna variante afirma causa ni «no hay cambio» y que los números del texto son los del archivo.

**Acceptance Scenarios**:

1. **Given** un resultado con evidencia insuficiente, **When** se genera el texto, **Then** dice que eso no demuestra ausencia de cambio.
2. **Given** una región pequeña o un periodo elegido, **When** se genera el texto, **Then** incluye el aviso correspondiente.

### User Story 2 - Primera visita y ejemplos (Priority: P2)

Acción inicial evidente y dos ejemplos que abren un análisis completo con un toque.

**Independent Test**: una persona nueva llega a un resultado sin instrucciones.

### User Story 3 - Métodos y fuentes (Priority: P2)

Hoja de lectura con método, supuestos, límites y cómo citar.

### User Story 4 - Validación con personas (Priority: P1)

Cinco personas del público objetivo hacen las cuatro tareas; se registra éxito, tiempo, errores y comprensión.

**Independent Test**: resultados anotados; cada tarea por debajo de 4 de 5 tiene corrección o queda declarada.

## Requirements *(mandatory)*

Cubre de 001: FR-001 (definiciones), FR-009, FR-012 (texto de métodos), FR-013, y los criterios SC-001 a SC-004 y SC-009.

- **FR-C01**: Las explicaciones distinguen significancia, magnitud, relevancia ambiental y causalidad.
- **FR-C02**: La definición de precipitación dice que procede de un reanálisis y que su tendencia es menos fiable que la de temperatura.
- **FR-C03**: Todo término técnico se define la primera vez que aparece.
- **FR-C04**: La hoja de métodos declara el límite de la corrección por autocorrelación y la atribución que entregue 003.
- **FR-C05**: Guion de demostración de menos de 3 minutos con los dos casos.

## Success Criteria *(mandatory)*

- **SC-C01**: Objetivos por validar: 4 de 5 personas completan cada tarea y responden bien sobre dirección, magnitud, evidencia y causalidad.
- **SC-C02**: 100 % de las variantes de explicación cubiertas por pruebas.

## Assumptions

- El segundo caso de demostración se elige cuando 003 publique datos reales.
- Las correcciones que la prueba pida en código ajeno se piden a su dueño; aquí solo se cambian textos.
