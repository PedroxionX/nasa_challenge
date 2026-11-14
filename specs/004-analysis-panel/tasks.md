---
description: "Tareas de búsqueda, variable, periodo y panel de análisis"
---

# Tasks: Búsqueda, variable, periodo y panel de análisis

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md)

Requiere la base 002 fusionada. Trabaja con el archivo de ejemplo hasta que 003 publique datos reales.

## Phase 1: User Story 1 - Elegir región y variable (P1)

- [ ] T001 [P] [US1] Buscador accesible agrupado por país en web/src/features/query/RegionSearch.tsx — 2 h · Acepta: selección solo con teclado; texto de «sin coincidencias» de ux.md §7
- [ ] T002 [P] [US1] Selector de variable con definición en web/src/features/query/VariablePicker.tsx y composición en web/src/features/query/index.ts — 1 h · Acepta: dos opciones; la definición se lee sin salir de la pantalla

## Phase 2: User Story 2 - Leer el resultado (P1) 🎯

- [ ] T003 [US2] Gráfica anual con recta, banda, años excluidos, año parcial, tramo fuera de periodo atenuado y alternativa en tabla en web/src/features/analysis/TrendChart.tsx — 3,5 h · Acepta: los valores de la tabla coinciden con el archivo; legible a 360 px
- [ ] T004 [US2] Tarjetas con los cinco estados, explicación, detalles técnicos y procedencia en web/src/features/analysis/ResultCards.tsx y AnalysisPanel.tsx — 3 h · Acepta: SC-A01; FR-A01
- [ ] T005 [US2] Carga con esqueleto, error con reintento y región sin datos en web/src/features/analysis/AnalysisPanel.tsx — 1,5 h · T004 · Acepta: los tres estados se provocan y se recuperan sin recargar
- [ ] T006 [US2] Escape, devolución del foco y anuncio del resultado — 1 h · T004 · Acepta: FR-A02

## Phase 3: User Story 3 - Cambiar el periodo (P1)

- [ ] T007 [US3] Control de año inicial y final con mínimo y «Usar todo el periodo» en web/src/features/analysis/PeriodControl.tsx — 2 h · T004 · Acepta: operable con teclado y tacto; nunca invertido
- [ ] T008 [US3] Aviso de periodo elegido y vista de variación según el año inicial — 2 h · T007 · Acepta: el aviso solo aparece fuera del periodo completo

## Phase 4: Polish

- [ ] T009 Ajuste a móvil y objetivos táctiles de todo lo propio; pruebas de los cinco estados en web/src/features/analysis/ — 2 h · Acepta: SC-A02

Esfuerzo: 18 h.
