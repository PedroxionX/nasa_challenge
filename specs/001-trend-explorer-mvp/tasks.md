---
description: "Índice de tareas del MVP, repartidas por especificación"
---

# Tasks: Explorador de tendencias por región (MVP) — índice

**Input**: Design documents from `/specs/001-trend-explorer-mvp/`

Desde el 2026-11-14 las tareas viven en la especificación de cada persona. Este archivo solo reparte y ordena. La lista única anterior (T001 a T032) está en el commit `c1ebb61`; [analysis.md](analysis.md) usa esos identificadores.

## Reparto

| Especificación | Rama | Rutas que solo ella edita | Esfuerzo | Cubre |
|---|---|---|---|---|
| [002 Base e integración](../002-foundation/tasks.md) | `002-foundation` | `web/src/App.tsx`, `web/src/app/`, `web/src/lib/`, `web/src/styles/`, `web/package.json`, `web/vite.config.ts`, `.github/`, `README.md`, `specs/001-*` | 21,5 h | FR-018, FR-020, parte de FR-015 |
| [003 Pipeline de datos](../003-data-pipeline/tasks.md) | `003-data-pipeline` | `pipeline/`, `web/public/data/trends/` | 17,5 h | FR-003, FR-006 a FR-008, FR-010 |
| [004 Búsqueda y panel](../004-analysis-panel/tasks.md) | `004-analysis-panel` | `web/src/features/query/`, `web/src/features/analysis/` | 18 h | US1 y US2 |
| [005 Globo y mapa](../005-globe-map/tasks.md) | `005-globe-map` | `web/src/features/globe/`, `web/public/textures/`, `web/public/data/*.geojson` | 14,5 h | US3, FR-011, FR-017 |
| [006 Textos y validación](../006-guide-content/tasks.md) | `006-guide-content` | `web/src/content/`, `web/src/features/guide/`, `docs/` | 13,5 h | US4, FR-009, SC-001 a SC-004 |

Total: 85 h (13 h más que la lista única, por los esbozos y la integración). **Cinco personas, una por especificación** (confirmado el 2026-11-14); quien lleva 002 queda después como integrador.

## Reglas para no pisarse

1. Cada rama edita **solo** sus rutas. Si necesita algo de otra, lo pide a su dueño.
2. Lo compartido (armazón, estado, carga de datos, variables de diseño, dependencias, contrato) lo cambia únicamente quien lleva 002.
3. Las carpetas de `features/` no se importan entre sí: solo importan de `app/`, `lib/` y `content/`.
4. Cada funcionalidad lleva sus estilos y pruebas dentro de su carpeta; nadie edita un CSS global.
5. Cada persona edita solo su carpeta de `specs/`.
6. `.specify/feature.json` es local y git lo ignora: cada persona lo apunta a su especificación.

## Orden

```text
002 fase 1 (base) ──fusión en sync_main──┬─> 004 ─┐
        │                                ├─> 005 ─┼─> 002 fase 2 (integración y publicación)
003 T001–T005 (en paralelo desde ya) ────┴─> 003 T006 ─┘
006 T001 (paleta, desde ya) ─────────────└─> 006 ─┘
```

- **Ruta crítica**: 003 (T001 → T005) y la base de 002. Todo lo demás puede avanzar con el archivo de ejemplo.
- Las ramas 003 a 006 se fusionan en cualquier orden: no comparten archivos.

## Qué recortar primero

1. 005 T007 (optimización profunda de la escena).
2. 006 T005 (hoja de métodos → un párrafo en «Detalles técnicos», que pasa a 004).
3. 004 T008 (vista de variación; se conserva el aviso).
4. 005 T005 sin tabla; después 005 fase 2 completa.
5. 003: una sola variable, o solo las regiones de demostración.

Nunca se recortan: 003 T005, 004 T005 y T006, 006 T003 y T006.
