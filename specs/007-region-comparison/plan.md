# Implementation Plan: Comparación de dos regiones para cualquier variable del catálogo

**Branch**: `007-region-comparison` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-region-comparison/spec.md`

## Summary

Un paso nuevo del pipeline lee las series ya publicadas, prueba la tendencia de la serie de diferencias de cada par de regiones con el motor existente y escribe `compare/`. La interfaz añade una segunda región al estado compartido y una vista de comparación que solo lee archivos. Todo se guía por `catalog.json`, de modo que una variable nueva no exige código. Decisiones, arquitectura y contrato comunes siguen en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md).

## Technical Context

**Language/Version / Primary Dependencies**: Python con numpy y scipy (los del pipeline) · TypeScript 7 · React 19.3 · d3-scale, d3-shape · Vitest · pytest. Sin dependencias nuevas.

**Constraints**: el navegador no calcula estadística; ningún archivo propio nombra una variable; los puntos de contacto en rutas ajenas son solo los listados en la especificación.

## Decisiones

| Decisión | Elegido | Descartado y por qué |
|---|---|---|
| Dónde se calcula la diferencia | En el pipeline, precalculada | En el navegador: lo prohíbe el principio I y duplicaría el motor en otro lenguaje |
| Qué ventanas | Las que terminan en el último año completo (37 en temperatura, 15 en precipitación, 17 en las de GLDAS) | Todas: 81 MB solo en temperatura y unas 2 h de cómputo. Solo el periodo completo: el periodo dejaría de poder cambiarse al comparar |
| Organización de los archivos | Uno por variable y región, con cada par una sola vez | Uno por variable: 4 MB de descarga en móvil para leer un par. Cada par dos veces: el doble de tamaño |
| Base de la diferencia | La decide `relative_change` | Por `aggregation` (como hace `stats/compare.py`): la humedad del suelo es una media con cambio relativo y quedaría mal clasificada |
| De dónde lee el paso nuevo | De `web/public/data/trends/` ya publicado | De la caché de gránulos: obligaría a tocar `build.py` y a tener credenciales para recalcular |
| Dónde se anuncia qué hay publicado | `compare/index.json` propio | Un campo en `catalog.json`: lo escriben `build.py` y `merge_outputs.py` de 003 y lo perderían al republicar |
| Gráfica de dos series | Dos gráficas apiladas con el eje de años compartido | Un eje común: inservible con niveles muy distintos. Anomalías: exigen que el navegador reste una media |
| Variables válidas en la interfaz | Las del catálogo; `VariableId` pasa a ser `string` | Añadir dos ids a la lista fija: habría que repetirlo con cada variable nueva |

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I. Rigor | Una sola fuente de cifras (`trend_core`); estado, método, unidades, periodo, n y α en cada resultado; `inconclusive` nunca como «cambian igual»; sin causalidad ni clasificación de regiones |
| II. Procedencia | Procedencia de las dos series en pantalla; pares con mezcla de sintético y real no se comparan; huella de las series de origen en `index.json` |
| III. Sin gestos 3D | Segunda región y periodo con `<select>` nativos; el globo es opcional (US3); rótulos «A» y «B» además del contorno |
| IV. Visual al servicio de la lectura | El mapa de colores no cambia; la marca de la segunda región no tapa el relleno |
| V. Rendimiento y simplicidad | Archivos estáticos; tamaño y tiempo como objetivos hasta medirlos (SC-K04) |

Sin violaciones. Excepción de proceso, no de principio: 007 edita rutas de otras especificaciones (ver Complexity Tracking).

## Project Structure

```text
pipeline/compare_build.py             lee catalog.json y series/, escribe compare/; --variables, --check
pipeline/tests/test_compare_build.py  cifras contra cálculo independiente, contrato, variable inventada

web/public/data/trends/compare/       index.json y {variable}/{región}.json

web/src/features/compare/             index.ts (exporta CompareEntry y ComparePanel), CompareEntry.tsx
                                      (selector de la segunda región), ComparePanel.tsx, PairChart.tsx,
                                      PairFacts.tsx, StartSelect.tsx, compareData.ts (lectura de filas, sin
                                      estadística), useCompareData.ts (carga y estados), format.ts,
                                      compare.css, *.test.ts(x)

Puntos de contacto
web/src/lib/data.ts                   VariableId = string; tipos y loadCompareIndex, loadComparison, pickComparison
web/src/app/state.ts                  compareId, parámetro vs, setCompare; variables válidas desde el catálogo
web/src/app/Shell.tsx                 monta CompareEntry bajo AnalysisPanel, o ComparePanel si hay vs
web/src/content/index.ts              variableCopy(info) con respaldo en el catálogo; COMPARE_COPY; explainComparison
web/src/features/query/VariablePicker.tsx   opciones desde el catálogo
web/src/features/analysis/AnalysisPanel.tsx, features/guide/MethodsSheet.tsx, WelcomeCard.tsx   variableCopy
web/src/features/globe/               GlobeStage, EarthGlobe, RegionTable: segunda región marcada
```

**Structure Decision**: `Shell` elige qué muestra el panel: sin `vs`, `AnalysisPanel` seguido de `CompareEntry`; con `vs`, `ComparePanel`. Así `AnalysisPanel` no aprende nada de la comparación y las carpetas de `features/` siguen sin importarse entre sí. `ComparePanel` tiene su propio `<select>` de año inicial porque el control de periodo de 004 no se puede importar y porque aquí solo valen los años publicados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| 003 republica y `compare/` queda desfasado o borrado | `--check` en la lista de entrega; la interfaz tolera que falte |
| 002, 004 o 006 hacen a la vez la conciliación del PR #13 | Avisar antes de empezar la fase 1; si llega primero la suya, se adopta |
| El tamaño real supera el objetivo | Menos decimales, estado como código numérico o menos años iniciales; se decide con la medición |
| La base relativa no convence al equipo | Es un solo punto del código (`basis`); cambiarla no toca la interfaz |

## Complexity Tracking

| Violación | Por qué es necesaria | Alternativa más simple, rechazada porque |
|---|---|---|
| Una rama edita rutas de 002, 004, 005 y 006 (regla 1 de `metodologia.md`) | La comparación cruza contrato, estado, panel, globo y textos; quien la lleva decidió hacerla entera | Repartirla en cinco pedidos: no cabe en el tiempo que queda de hackatón |
