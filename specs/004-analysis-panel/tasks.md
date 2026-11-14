---
description: "Tareas de búsqueda, variable, periodo y panel de análisis"
---

# Tasks: Búsqueda, variable, periodo y panel de análisis

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md)

Requiere la base 002 fusionada. Trabaja con el archivo de ejemplo hasta que 003 publique datos reales.

## Phase 0: Base propia

- [x] T010 [P] Formateador único `es-MX` en web/src/features/analysis/format.ts con pruebas en format.test.ts — 1 h · Acepta: FR-A08 (punto decimal, signo explícito, menos U+2212, «p < 0.001», años sin separador); ningún otro archivo de 004 formatea cifras por su cuenta

## Phase 1: User Story 1 - Elegir región y variable (P1)

- [x] T001 [P] [US1] Buscador accesible agrupado por país en web/src/features/query/RegionSearch.tsx — 2 h · Acepta: selección solo con teclado; texto de «sin coincidencias» de ux.md §7
- [x] T002 [P] [US1] Selector de variable con definición en web/src/features/query/VariablePicker.tsx; composición de ambos en web/src/features/query/QueryBar.tsx, que `index.ts` sigue exportando como `QueryBar` (lo importa el armazón de 002) — 1 h · Acepta: dos opciones; la definición se lee sin salir de la pantalla; `Shell` no se modifica

## Phase 2: User Story 2 - Leer el resultado (P1) 🎯

- [x] T003 [US2] Gráfica anual con recta, banda, años excluidos, año parcial, tramo fuera de periodo atenuado y alternativa en tabla en web/src/features/analysis/TrendChart.tsx — 3,5 h · T010 · Acepta: los valores de la tabla coinciden con el archivo; legible a 360 px; recta y banda solo con `line_mid` (FR-A10), sin ella la leyenda lo indica; el año parcial (sin valor en el contrato) se marca y rotula, no se inventa un punto
- [x] T004 [US2] Tarjetas con los cinco estados, explicación, detalles técnicos y procedencia en web/src/features/analysis/ResultCards.tsx y AnalysisPanel.tsx — 3 h · T010 · Acepta: SC-A01; FR-A01; FR-A05 (evidencia sin calificativos; `insufficient` e `invalid` sin cifras de tendencia); si `provenance.is_synthetic`, aviso visible encima del resultado; cada `flag` presente y `diagnostics.step_year` aparecen en «Detalles técnicos» con una línea de texto
- [ ] T005 [US2] Carga con esqueleto, error con reintento y región sin datos en web/src/features/analysis/AnalysisPanel.tsx — 1,5 h · T004 · Acepta: los tres estados se provocan y se recuperan sin recargar; una región con `n_cells: 0` en el catálogo muestra «sin datos» sin pedir su archivo (nunca como error de carga)
- [x] T006 [US2] Escape, devolución del foco y anuncio del resultado — 1 h · T004 · Acepta: FR-A02 (cerrar = `setRegion(null)` y foco al buscador)
- [x] T011 [US2] Cambio en % por década para variables con `relative_change`, leído de `slope_decade_pct`, `ci_low_pct`, `ci_high_pct` si existen, con archivo de ejemplo propio en web/src/features/analysis/fixtures/ — 1 h · T004 · Acepta: FR-A09 (con las columnas se ve el %; sin ellas o con `null`, solo `unit_annual` por década y sin error); el navegador no divide entre ninguna media

## Phase 3: User Story 3 - Cambiar el periodo (P1)

- [x] T007 [US3] Dos `<select>` nativos «Desde» y «Hasta» que solo ofrecen años válidos, y «Usar todo el periodo», en web/src/features/analysis/PeriodControl.tsx — 2 h · T004 · Acepta: FR-A06; operable con teclado y tacto; nunca invertido ni más corto que `min_window_years`
- [x] T008 [US3] Aviso de periodo elegido y vista de variación según el año inicial (mini gráfica de `slope_decade` con banda contra año inicial, año final fijo, con «Ver como tabla») en web/src/features/analysis/PeriodVariation.tsx — 2 h · T007 · Acepta: FR-A07; el aviso solo aparece fuera del periodo completo; las cifras coinciden con las filas de `windows`

## Phase 4: Polish

- [x] T009 Ajuste a móvil y objetivos táctiles de todo lo propio; pruebas de los cinco estados en web/src/features/analysis/ — 2 h · Acepta: SC-A02; con `prefers-reduced-motion` las gráficas cambian sin transición

Esfuerzo: 20 h (18 h originales + T010 y T011).
