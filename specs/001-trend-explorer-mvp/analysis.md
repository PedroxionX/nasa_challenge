# Registro del análisis de consistencia

Fecha: 2026-11-14. Hecho a mano con los pasos de la definición de `/speckit-analyze` (inventario de requisitos, cobertura por tareas, alineación con la constitución). **No es la salida de la skill**: ejecútala para una comprobación independiente. El comando oficial es de solo lectura y no crea este archivo; se guarda para no perder los hallazgos.

> Nota (2026-11-14): tras este análisis las tareas se repartieron en las especificaciones 002 a 006. Los identificadores T0xx de abajo son los de la lista única del commit `c1ebb61`. El reparto no se ha vuelto a analizar.

## Hallazgos y correcciones aplicadas

| ID | Categoría | Severidad | Ubicación | Hallazgo | Corrección |
|---|---|---|---|---|---|
| D1 | Constitución | CRITICAL | tasks.md, «MVP mínimo» | El MVP mínimo excluía la prueba con usuarios (T029), que la constitución III exige antes de la demo | T029 y T027 añadidas al MVP mínimo y a «nunca se recortan» |
| E1 | Cobertura | MEDIUM | spec FR-017 ↔ tasks T023 | El movimiento reducido dependía de una tarea P2 incluida en la lista de recortes | El recorte 3 conserva pausa y movimiento reducido |
| E2 | Cobertura | MEDIUM | spec FR-014 | Ninguna tarea nombraba la retirada de «años para ser significativo» | Añadido al criterio de T016 |
| F1 | Inconsistencia | MEDIUM | spec FR-008 ↔ data-model | La especificación agrupaba cuatro categorías; el contrato define cinco estados | FR-008 enumera los cinco |
| F2 | Terminología | LOW | todos | «Estado» nombra tanto la región como el estado del análisis | Sin cambio: en la interfaz se usa «resultado» o «veredicto» |
| B1 | Ambigüedad | LOW | contracts §map | Cortes de la escala de color sin fijar | Declarado pendiente hasta ver datos reales (T011, T022) |

## Cobertura

| Requisito | Tareas | | Requisito | Tareas |
|---|---|---|---|---|
| FR-001 | T012, T014 | | FR-011 | T021, T022 |
| FR-002 | T013, T017 | | FR-012 | T016 |
| FR-003 | T006, T007, T016 | | FR-013 | T024 |
| FR-004 | T015 | | FR-014 | T016 |
| FR-005 | T019 | | FR-015 | T010, T018 |
| FR-006 | T007, T016 | | FR-016 | T013, T026, T027 |
| FR-007 | T007 | | FR-017 | T023 |
| FR-008 | T007, T016 | | FR-018 | T009 |
| FR-009 | T012 | | FR-019 | T020, T022 |
| FR-010 | T016 | | FR-020 | T031 |
| SC-001 a SC-004 | T029 | | SC-006, SC-007 | T008, T028 |
| SC-005 | T016 | | SC-008, SC-009 | T026, T027, T031 |

## Métricas

20 requisitos funcionales, 9 criterios de éxito, 32 tareas. Cobertura: 20 de 20 requisitos con al menos una tarea. Tareas sin requisito directo: T001 a T004, T011, T030, T032 (preparación, diseño base, medición y margen). Hallazgos críticos abiertos: 0 tras las correcciones.

## Abierto

- Las listas `checklists/science.md` y `checklists/ux.md` están sin revisar por una persona.
- Decisiones provisionales: reutilización del código del laboratorio (T001), validación con Giovanni (requiere cuenta), paleta y cortes de color.
