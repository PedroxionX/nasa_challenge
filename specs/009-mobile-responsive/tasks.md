# Tasks: Uso de Trend Detective en móviles

**Input**: `specs/009-mobile-responsive/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/responsive-ui.md.
**Organization**: por historias. Las casillas son aceptación del usuario (`metodologia.md` §5); la ejecución automática se registra en validation.md.

## Phase 1: Setup

- [ ] T001 Registrar lectura, alcance y defectos previos en specs/009-mobile-responsive/research.md; acepta: evidencia de 320×568 y 844×390 y suite de base.

## Phase 2: Foundational

- [ ] T002 Ajustar viewport y límites globales en web/index.html y web/src/styles/base.css; acepta: áreas seguras previstas y controles dentro de su contenedor (FR-M02, FR-M05).

## Phase 3: User Story 1 - Empezar (P1)

**Goal**: acceder al buscador y a los dos ejemplos.
**Independent Test**: pasos 1–2 de quickstart.md.

- [ ] T003 [US1] Acotar y permitir recorrer bienvenida en web/src/app/shell.css y web/src/features/guide/guide.css; acepta: título y ambos ejemplos alcanzables en toda la matriz (FR-M01).
- [ ] T004 [P] [US1] Ajustar búsqueda y variable en web/src/features/query/query.css; acepta: campos legibles y lista/definición contenidas, sin desbordamiento del documento (FR-M02, FR-M05).

## Phase 4: User Story 2 - Analizar y comparar (P1)

**Goal**: leer los resultados y tablas sin recortes.
**Independent Test**: pasos 3–4 y 6 de quickstart.md.

- [ ] T005 [US2] Ajustar alturas y control visible de hoja en web/src/app/Shell.tsx y web/src/app/shell.css; acepta: peek → half → full → peek, cuerpo completo recorrible (FR-M03).
- [ ] T006 [US2] Contener mínimos de grids y textos en web/src/features/analysis/analysis.css y web/src/features/compare/compare.css; acepta: cuerpo sin scroll horizontal y tablas con desplazamiento propio (FR-M04).
- [ ] T007 [US2] Hacer enfocables las tablas desplazables en web/src/features/analysis/TrendChart.tsx, web/src/features/analysis/PeriodVariation.tsx, web/src/features/compare/PairFacts.tsx y web/src/features/compare/PairChart.tsx; acepta: foco, nombre y scroll de teclado (FR-M04).

## Phase 5: User Story 3 - Orientación y fuentes (P2)

**Goal**: usar la altura en horizontal y acceder a fuentes sin 3D obligatorio.
**Independent Test**: paso 5 y escenarios adicionales de quickstart.md.

- [ ] T008 [US3] Sincronizar disposición lateral e insets en web/src/app/Shell.tsx y web/src/app/shell.css, y conservar ambas regiones al reajustar la cámara en web/src/features/globe/EarthGlobe.tsx; acepta: a ≥600 px de ancho y ≤500 px de alto el panel ocupa la altura del escenario, conserva estado y al girar las dos regiones siguen encuadradas (FR-M03, FR-M07).
- [ ] T009 [US3] Acotar diálogos y envolver tabla de regiones en web/src/features/globe/RegionTable.tsx, web/src/features/globe/globe.css, web/src/features/guide/guide.css y web/src/app/shell.css; acepta: todos los campos alcanzables, cierre siempre disponible y bienvenida/tabla sin superposición en fallback (FR-M05, FR-M06).

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T010 Ejecutar matriz de navegador, tests, lint, build y revisión de datos intactos; registrar evidencias y límites en specs/009-mobile-responsive/validation.md (FR-M01–FR-M08, SC-M01–SC-M04).
- [ ] T011 Registrar comprobación humana en teléfonos físicos siguiendo specs/009-mobile-responsive/quickstart.md; acepta: dispositivos, teclado virtual, áreas seguras y Safari/Chrome documentados (SC-M02–SC-M04).

## Dependencies & Execution Order

T001 → T002 → US1 → US2 → US3 → T010. T011 es aceptación humana posterior; no se sustituye por emulación. No se publica ni fusiona desde esta sesión.

## Parallel Opportunities

Ejemplo US1: T004 puede prepararse de forma independiente de T003 (CSS de query frente a shell/guide). US2 comparte Shell con US3 y se ejecuta secuencialmente. En la revisión posterior el usuario solicita tres agentes independientes para auditoría visual, funcional y de disposición/cámara; la integración de código se mantiene en el agente principal.

## Implementation Strategy

Primero garantizar acceso al análisis (US1), luego corregir lectura y tablas (US2), después orientación/diálogos/fallback (US3). Verificar antes/después con datos reales, manteniendo intactos pipeline, catálogo, estadísticas y parámetros URL.

## Phase 7: Corrección de saturación visual y revisión independiente

- [ ] T012 [US1] Compactar cabecera, bienvenida y herramientas en web/src/features/query/query.css, web/src/features/guide/WelcomeCard.tsx, guide.css y web/src/features/globe/globe.css; acepta: franja libre de 180 px al iniciar (FR-M09, SC-M05).
- [ ] T013 [US2] Abrir en resumen y ofrecer regreso directo al globo en web/src/app/Shell.tsx y shell.css; reiniciar scroll del resultado y cubrir el comportamiento en Shell.test.tsx (FR-M09, FR-M10).
- [ ] T014 [US3] Medir bienvenida y herramientas para encuadrar el globo en web/src/app/Shell.tsx, web/src/features/globe/MapLegend.tsx, camera.ts y EarthGlobe.tsx; validar centro libre en inicio/resumen y giro (FR-M07, FR-M09).
- [ ] T015 [US1] Liberar foco tras elección táctil conservando teclado en web/src/features/query/RegionSearch.tsx y query.test.tsx (FR-M10).
- [ ] T016 Registrar auditorías independientes y regresiones en specs/009-mobile-responsive/review-agents.md; acepta: evidencias visuales y recorridos posteriores a las correcciones, además de pruebas, build y lint (SC-M01–SC-M05).
