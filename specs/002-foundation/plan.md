# Implementation Plan: Base compartida e integración

**Branch**: `002-foundation` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-foundation/spec.md`

## Summary

Parte del MVP común. Decisiones, arquitectura, riesgos y contrato viven en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md) y no se repiten aquí.

## Technical Context

**Language/Version / Primary Dependencies**: TypeScript 7 · React 19.3 · Vite 8 · Vitest

**Constraints**: editar solo las rutas de «Propiedad de archivos» de la especificación; sin dependencias nuevas fuera de 002.

## Constitution Check

Hereda la comprobación de 001 (sin violaciones). Puerta propia: ningún archivo modificado fuera de las rutas propias.

## Project Structure

```text
web/src/App.tsx, main.tsx
web/src/app/        state.ts, Shell.tsx, ErrorBoundary.tsx
web/src/lib/        data.ts
web/src/styles/     tokens.css, base.css
web/src/features/*/ index.ts (solo el esbozo inicial)
web/src/content/    index.ts (solo el esbozo inicial)
.github/workflows/  publicación
```

**Structure Decision**: Estado en un único módulo con sincronización de URL; el armazón coloca cinco componentes sin props; estilos globales reducidos a variables y disposición.

## Complexity Tracking

Sin violaciones que justificar.
