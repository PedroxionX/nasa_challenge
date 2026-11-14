# Implementation Plan: Búsqueda, variable, periodo y panel de análisis

**Branch**: `004-analysis-panel` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-analysis-panel/spec.md`

## Summary

Parte del MVP común. Decisiones, arquitectura, riesgos y contrato viven en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md) y no se repiten aquí.

## Technical Context

**Language/Version / Primary Dependencies**: TypeScript 7 · React 19.3 · d3-scale, d3-shape (ya instalados por 002) · Vitest

**Constraints**: editar solo las rutas de «Propiedad de archivos» de la especificación; sin dependencias nuevas fuera de 002.

## Constitution Check

Hereda la comprobación de 001 (sin violaciones). Puerta propia: ningún archivo modificado fuera de las rutas propias.

## Project Structure

```text
web/src/features/query/     index.ts (exporta QueryBar), QueryBar.tsx, RegionSearch.tsx,
                            VariablePicker.tsx, search.ts (lógica pura del buscador),
                            query.css, *.test.tsx
web/src/features/analysis/  index.ts, AnalysisPanel.tsx, TrendChart.tsx, ResultCards.tsx,
                            PeriodControl.tsx, PeriodVariation.tsx, Term.tsx, glossary.ts,
                            format.ts, analysisData.ts (lectura de filas y columnas, sin estadística),
                            useAnalysisData.ts (carga y estados), analysis.css,
                            testData.ts (utilidades de prueba), *.test.ts(x)
```

`QueryBar` y `AnalysisPanel` conservan el nombre con que los importa el armazón (002).

Cambio respecto a la versión anterior (2026-11-14): no hay carpeta `fixtures/`. Cuando 002 revisó el contrato, los datos de ejemplo de `public/data/trends/` pasaron a traer las columnas opcionales (`line_mid`, `*_pct`); las pruebas usan esos archivos y `testData.ts` genera la variante sin columnas.

**Structure Decision**: Componentes sin props que leen el estado compartido; gráfica en SVG propio; el navegador no calcula estadística, solo consulta la tabla de ventanas.

## Complexity Tracking

Sin violaciones que justificar.
