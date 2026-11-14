# Implementation Plan: Pipeline de datos y motor de tendencias

**Branch**: `003-data-pipeline` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-data-pipeline/spec.md`

## Summary

Parte del MVP común. Decisiones, arquitectura, riesgos y contrato viven en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md) y no se repiten aquí.

## Technical Context

**Language/Version / Primary Dependencies**: Python ≥ 3.11 · numpy, pandas, scipy, requests, shapely · pytest, pymannkendall

**Constraints**: editar solo las rutas de «Propiedad de archivos» de la especificación; sin dependencias nuevas fuera de 002.

## Constitution Check

Hereda la comprobación de 001 (sin violaciones). Puerta propia: ningún archivo modificado fuera de las rutas propias.

## Project Structure

```text
pipeline/trendlens/        núcleo del laboratorio
pipeline/power_regional.py descarga, caché, manifiesto
pipeline/weights.py        pesos por celda
pipeline/build.py          series, ventanas, escritura
pipeline/tests/
pipeline/manifest/
web/public/data/trends/    salida
```

**Structure Decision**: Método y validación en ../001-trend-explorer-mvp/plan.md («Método de principio a fin» y «Validación científica»).

## Complexity Tracking

Sin violaciones que justificar.
