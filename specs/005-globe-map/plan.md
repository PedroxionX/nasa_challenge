# Implementation Plan: Globo, mapa de tendencias y rendimiento de la escena

**Branch**: `005-globe-map` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-globe-map/spec.md`

## Summary

Parte del MVP común. Decisiones, arquitectura, riesgos y contrato viven en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md) y no se repiten aquí.

## Technical Context

**Language/Version / Primary Dependencies**: TypeScript 7 · React 19.3 · react-globe.gl 2.38 · three 0.187

**Constraints**: editar solo las rutas de «Propiedad de archivos» de la especificación; sin dependencias nuevas fuera de 002.

## Constitution Check

Hereda la comprobación de 001 (sin violaciones). Puerta propia: ningún archivo modificado fuera de las rutas propias.

## Project Structure

```text
web/src/features/globe/  index.ts, GlobeStage.tsx, EarthGlobe.tsx, geo.ts, MapLegend.tsx,
                         Fallback.tsx, globe.css
web/public/textures/     versiones ligeras
web/public/data/*.geojson
```

**Structure Decision**: Se mantiene react-globe.gl; presupuesto y medidas en ../001-trend-explorer-mvp/ux.md §3. Los objetivos de rendimiento no son resultados hasta medirlos.

## Complexity Tracking

Sin violaciones que justificar.
