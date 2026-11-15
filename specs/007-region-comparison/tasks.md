---
description: "Tareas de la comparación de dos regiones para cualquier variable del catálogo"
---

# Tasks: Comparación de dos regiones para cualquier variable del catálogo

**Input**: [spec.md](spec.md), [plan.md](plan.md), [contracts/compare-files.md](contracts/compare-files.md)

**Entrega de sesión (2026-11-14)**: ver [continuar-rama-007.md](continuar-rama-007.md) para el trabajo guardado, comprobaciones realizadas y pendientes concretos. Las casillas se conservan hasta verificar todos los criterios de aceptación.

Parte de `sync_main` con el PR #13 de 003 incluido (humedad del suelo y evapotranspiración). Las tareas marcadas con «contacto» editan rutas de otra especificación: se avisa a su responsable antes de empezar.

## Phase 0: Avisos

- [ ] T001 Avisar al equipo de 007 y de sus puntos de contacto; preguntar a quien lleva 002 si ya está leyendo las variables del catálogo por el PR #13 — 0,5 h · Acepta: hay respuesta de 002 antes de empezar T002; si ya lo hace, T002 a T004 se reducen a adoptar su cambio

## Phase 1: User Story 2 - Variables desde el catálogo (P1)

- [ ] T002 [US2] (contacto 002) `VariableId = string` y variables válidas tomadas del catálogo en web/src/lib/data.ts, web/src/app/state.ts y web/src/app/Shell.tsx — 2 h · Acepta: FR-K14; `?var=soil_moisture` abre la variable; `?var=inventada` vuelve a la predeterminada con aviso; `?var=T2M` sigue traduciéndose; las pruebas de `state` y `data` pasan
- [ ] T003 [P] [US2] (contacto 006) `variableCopy(info)` con respaldo en `label` y `definition` del catálogo en web/src/content/index.ts; uso en web/src/features/guide/MethodsSheet.tsx y WelcomeCard.tsx — 1 h · T002 · Acepta: una variable sin textos de 006 se muestra con los del catálogo; la hoja de métodos lista las variables del catálogo
- [ ] T004 [P] [US2] (contacto 004 y 005) Selector con las variables del catálogo en web/src/features/query/VariablePicker.tsx; `variableCopy` en web/src/features/analysis/AnalysisPanel.tsx y web/src/features/globe/GlobeStage.tsx — 1,5 h · T003 · Acepta: las cuatro variables se eligen con teclado y a 360 px; panel, mapa y leyenda muestran cada una con su unidad y su periodo
- [ ] T005 [US2] Catálogo de prueba con una variable inventada y sintética en web/src/lib/__fixtures__/ y prueba de extremo a extremo de selector y panel — 1 h · T004 · Acepta: primera mitad de SC-K01 (sin la comparación todavía)

## Phase 2: Datos de la comparación

- [ ] T006 `compare_build.py`: lectura de catálogo y series, comparabilidad, serie de diferencias según `relative_change`, filas con `trend_core`, validación y escritura todo o nada por variable, `--variables` en pipeline/compare_build.py — 3 h · Acepta: FR-K02 a FR-K05, FR-K11 y FR-K12; no importa ni edita `build.py`
- [ ] T007 Pruebas en pipeline/tests/test_compare_build.py: cifras contra `pymannkendall` y `scipy`, resta de pendientes por mínimos cuadrados, cada estado, cada motivo de `not_comparable`, variable inventada, ningún id de variable en el código — 2 h · T006 · Acepta: SC-K03; las pruebas corren sin red ni credenciales
- [ ] T008 Huella de las series y `--check` en pipeline/compare_build.py — 0,5 h · T006 · Acepta: FR-K13; al cambiar un valor de una serie, `--check` falla y nombra la variable
- [ ] T009 Publicar `web/public/data/trends/compare/` para todas las variables del catálogo y anotar aquí tiempo, tamaño total y archivo mayor — 1 h · T007 · Acepta: SC-K04 medido; `python merge_outputs.py` y la validación de carpeta de 003 siguen pasando con `compare/` presente

## Phase 3: User Story 1 - Comparar dos regiones (P1) 🎯

- [ ] T010 [US1] (contacto 002) Tipos, `loadCompareIndex`, `loadComparison` y `pickComparison` en web/src/lib/data.ts; `compareId`, `vs` y `setCompare` en web/src/app/state.ts; contrato principal actualizado en specs/001-trend-explorer-mvp/contracts/data-files.md — 2 h · T002 · Acepta: FR-K01 (reglas de `vs`); `not_found` se distingue de error; `pickComparison` devuelve el par en el orden del archivo
- [ ] T011 [P] [US1] (contacto 006) `COMPARE_COPY` y `explainComparison` con pruebas en web/src/content/index.ts — 1,5 h · T010 · Acepta: FR-K08; las pruebas fallan si aparece «cambian igual», «no hay diferencia», «mejor», «peor», «debido a» o «seguirá»
- [ ] T012 [US1] Selector de la segunda región en web/src/features/compare/CompareEntry.tsx y montaje en web/src/app/Shell.tsx — 1,5 h · T010 · Acepta: FR-K01; solo con teclado se elige y se quita la segunda región; Escape sale de la comparación antes que del panel
- [ ] T013 [US1] Vista de comparación: veredicto de la diferencia, resultados lado a lado, «En palabras», detalles técnicos y procedencia de ambas series en web/src/features/compare/ComparePanel.tsx y PairFacts.tsx — 3 h · T011, T012 · Acepta: SC-K02; FR-K06 y FR-K09; escenarios 1 a 3 de US1
- [ ] T014 [US1] Dos gráficas apiladas con eje de años compartido y alternativa en tabla en web/src/features/compare/PairChart.tsx — 2 h · T013 · Acepta: FR-K07; legible a 360 px; los valores de la tabla coinciden con los archivos
- [ ] T015 [US1] `<select>` «Desde» con los años publicados y aviso con botón para periodos sin prueba en web/src/features/compare/StartSelect.tsx — 1 h · T013 · Acepta: FR-K05; escenario 5 de US1
- [ ] T016 [US1] Estados de carga, error con reintento, sin datos, no comparable y prueba no publicada en web/src/features/compare/useCompareData.ts — 1,5 h · T013 · Acepta: FR-K10; escenario 4 de US1 y escenario 2 de US2; cada estado se provoca y se recupera sin recargar
- [ ] T017 [US2] Prueba de extremo a extremo de la comparación con la variable inventada y prueba que busca ids de variable en web/src/features/compare/ — 1 h · T016 · Acepta: SC-K01 y FR-K11

## Phase 4: User Story 3 - Las dos regiones en el globo (P2)

- [ ] T018 [US3] (contacto 005) Segunda región con contorno y rótulos «A» y «B» en web/src/features/globe/EarthGlobe.tsx y GlobeStage.tsx; ambas marcadas en RegionTable.tsx y en la vista sin WebGL — 2 h · T010 · Acepta: FR-K15; con las dos elegidas la cámara deja ambas a la vista o lo indica

## Phase 5: Polish

- [ ] T019 Ajuste a móvil, objetivos táctiles de 44 px, anuncio del resultado a lectores de pantalla y `prefers-reduced-motion` — 1,5 h · Acepta: SC-K05
- [ ] T020 [P] Párrafo de método de la comparación en web/src/features/guide/MethodsSheet.tsx (contacto 006) y una frase para el guion de la demo — 0,5 h · Acepta: explica la serie de diferencias y la base relativa en lenguaje llano
- [ ] T021 Pedir a 002 la fila de 007 en `metodologia.md` y en el índice de reparto; `/speckit-converge` — 0,5 h · Acepta: `Converged`, o tareas añadidas

Esfuerzo: 30,5 h de estimación. Si no alcanza el tiempo, se recorta en este orden: T018, T020, T014 (queda solo la tabla) y T015 (queda solo el periodo completo). No se recortan T006 a T008 ni T011.

## Mediciones previas (2026-11-14)

Con los datos publicados de temperatura y precipitación, 20 pares por variable y el motor actual: 2,9 ms por ventana. Extrapolado a los 3 486 pares y a las ventanas que terminan en el último año completo: temperatura 6,2 min y 4,2 MB; precipitación 2,6 min y 1,8 MB; cada variable de GLDAS, unos 3 min y 2 MB. Las cifras de tamaño no incluyen las columnas `n` y `status`. No sustituye a la medición de T009.
