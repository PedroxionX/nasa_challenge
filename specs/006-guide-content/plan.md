# Implementation Plan: Textos, explicaciones, guía y validación con usuarios

**Branch**: `006-guide-content` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-guide-content/spec.md`

## Summary

Parte del MVP común. Decisiones, arquitectura, riesgos y contrato viven en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md) y no se repiten aquí.

## Technical Context

**Language/Version / Primary Dependencies**: TypeScript 7 · React 19.3 · Vitest

**Constraints**: editar solo las rutas de «Propiedad de archivos» de la especificación; sin dependencias nuevas fuera de 002.

## Constitution Check

Hereda la comprobación de 001 (sin violaciones). Puerta propia: ningún archivo modificado fuera de las rutas propias.

## Project Structure

```text
web/src/content/         index.ts, copy.ts, explain.ts, explain.test.ts
web/src/features/guide/  index.ts, WelcomeCard.tsx, MethodsSheet.tsx, guide.css
docs/                    prueba-usuarios.md, demo.md
```

**Structure Decision**: Plantillas deterministas; reglas de redacción heredadas de explain.py del laboratorio. Sin IA generativa.

## Complexity Tracking

Sin violaciones que justificar.
