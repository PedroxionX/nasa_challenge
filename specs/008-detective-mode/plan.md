# Implementation Plan: Modo detective

**Branch**: `008-detective-mode` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-detective-mode/spec.md`

## Summary

Un flujo de cuatro pasos dentro de la tarjeta de bienvenida (tema → lugar → predicción → revelación) que termina abriendo el análisis existente con `setVariable` + `resetPeriod` + `setRegion`, igual que los ejemplos. La revelación lee la fila del periodo completo con `loadSeries` + `pickWindow` y redacta una frase determinista en `content/`. Además, el segundo ejemplo de la portada pasa a ser Hidalgo · Precipitación. Decisiones de fondo en [research.md](research.md); arquitectura común en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md).

## Technical Context

**Language/Version / Primary Dependencies**: TypeScript 7 · React 19.3 · Vitest 5 · Testing Library (ya en `web/package.json`; sin dependencias nuevas).

**Storage**: ninguno. La predicción vive en el estado local del componente; no entra en la URL.

**Data**: lectura de `catalog.json` (`loadCatalog`) y de `series/<variable>/<region>.json` (`loadSeries`, `pickWindow`, `variablePeriod`) a través de `web/src/lib/data.ts` (002, sin modificar).

**Testing**: Vitest + Testing Library en `web/src/features/guide/detective/*.test.ts(x)`, con los fixtures compartidos de `web/src/lib/__fixtures__`.

**Target Platform**: navegador de escritorio y móvil; sin WebGL requerido.

**Constraints**: solo las rutas de «Propiedad de archivos» de la spec; `features/guide/detective/` importa solo de `app/`, `lib/` y `content/`; cambio mínimo en `WelcomeCard.tsx` y en `content/index.ts` (sin tocar sus importaciones ni su final) para convivir con 007 ([aviso-007.md](aviso-007.md)); no usar `VARIABLE_IDS` ni suponer que `VariableId` es una unión.

**Scale/Scope**: 5 pantallas (grupo, tema, lugar, predicción, revelación), 14 temas en 4 grupos, 7 tipos de lugar, 10 casos curados, 3 pares de contraste (revisión 2026-11-15, research R8–R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Rigor | La revelación solo lee `status`, `slope_decade`/`slope_decade_pct`, `p`, `n`, `start`, `end` del archivo y `alpha`/`method` del catálogo. La frase separa dirección y evidencia; «inconclusive» nunca es «no hay cambio» ni confirma «Casi no cambió». Sin causa ni pronóstico. | ✅ |
| II. Procedencia | La revelación muestra método, periodo, n, unidades, α; el análisis completo (con procedencia) queda a un toque. Sin datos sintéticos nuevos. | ✅ |
| III. Sin gestos 3D | Todo con botones y `<select>` nativos; foco gestionado; objetivos de 44 px; texto en cada opción. | ✅ |
| IV. Visual al servicio | Reutiliza tokens de `tokens.css` y el estilo de `welcome-example-btn`; transiciones bajo `prefers-reduced-motion`. | ✅ |
| V. Simplicidad | Sin servicios, sin dependencias, sin estadística en el navegador. | ✅ |

Puerta propia: `git diff --name-only origin/sync_main...HEAD` lista solo rutas de la tabla de propiedad.

**Re-check post-design**: sin cambios; ver [data-model.md](data-model.md) y [contracts/detective-copy.md](contracts/detective-copy.md).

## Project Structure

### Documentation (this feature)

```text
specs/008-detective-mode/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── aviso-007.md
├── contracts/detective-copy.md
└── checklists/requirements.md
```

### Source Code

```text
web/src/content/index.ts                        + bloque DETECTIVE_COPY y revealPrediction (entre fmtP y explainTrend)
web/src/content/explain.test.ts                 (sin cambios)
web/src/features/guide/WelcomeCard.tsx          + 1 importación, segundo ejemplo real, botón de entrada
web/src/features/guide/detective/
├── index.ts                                    exporta DetectiveMode
├── options.ts                                  temas, tipos de lugar, casos curados; filtros por catálogo
├── DetectiveMode.tsx                           máquina de pasos y vista de cada paso
├── useReveal.ts                                carga la fila del periodo completo (loadSeries + pickWindow)
├── useContrast.ts                              comprueba en los archivos el par «pasó lo contrario» (R9)
├── detective.css
├── options.test.ts
├── reveal.test.ts                              revealPrediction: 4 predicciones × 5 estados × signo
└── DetectiveMode.test.tsx                      recorrido completo, atrás/salir, foco, error de carga
```

**Structure Decision**: Subcarpeta de `guide/` (opción A de la spec). Datos fijos (listas) en `options.ts` porque son ids, no textos; los textos visibles en `content/index.ts` (FR-E12). `revealPrediction` vive en `content/` porque reutiliza `fmt`, `fmtP` y `VERDICT_LABEL`, que son privados de ese módulo.

## Complexity Tracking

Sin violaciones que justificar. Los puntos de contacto en `WelcomeCard.tsx` y `content/index.ts` son territorio de 006 y están autorizados por la spec (opción A).
