---
description: "Tareas del globo, el mapa de tendencias y el rendimiento"
---

# Tasks: Globo, mapa de tendencias y rendimiento de la escena

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md) §3

Requiere la base 002 fusionada. El coloreado usa el archivo de ejemplo hasta que 003 publique `map/`.

## Phase 1: User Story 1 - Seleccionar en el globo (P1) 🎯

- [ ] T001 [US1] `GlobeStage` que lee y escribe `useAppState` en web/src/features/globe/index.ts y GlobeStage.tsx — 1 h · Acepta: clic y búsqueda seleccionan lo mismo
- [ ] T002 [US1] Desplazamiento de cámara según `--panel-inset-*`, sin tooltip fijo en táctil, en web/src/features/globe/EarthGlobe.tsx — 2 h · T001 · Acepta: región visible fuera del panel en 1440×900 y 390×844
- [ ] T003 [P] [US1] Vista sin WebGL (aviso y tabla de regiones) y tiempo máximo de carga de texturas en web/src/features/globe/Fallback.tsx — 1,5 h · Acepta: con WebGL desactivado o una textura bloqueada la zona sigue siendo útil

## Phase 2: User Story 2 - Ver dónde cambia (P2)

- [ ] T004 [US2] Enlazar `regionColor` con `loadMap`; selección con contorno y elevación — 1,5 h · T002 · Acepta: cambiar variable o periodo actualiza los colores; FR-G01
- [ ] T005 [US2] Leyenda con clases, «sin datos», aviso de comparaciones múltiples y tabla ordenable en web/src/features/globe/MapLegend.tsx — 2,5 h · T004 · Acepta: FR-G04; la tabla contiene todo lo que muestra el mapa

## Phase 3: User Story 3 - Escena dentro de presupuesto (P2)

- [ ] T006 [US3] Pausa en reposo, movimiento reducido y nubes apagadas con datos — 1,5 h · T002 · Acepta: SC-G01
- [ ] T007 [US3] Fronteras de países en una sola geometría, limpieza de web/public/data/countries.geojson, texturas ligeras para móvil en web/public/textures/, liberación de recursos propios, revisión del artefacto de Texas — 3 h · T006 · Acepta: llamadas por cuadro medidas antes y después
- [ ] T008 [US3] Medir en los dispositivos de referencia y anotar resultados — 1,5 h · T007 · Acepta: SC-G03

Esfuerzo: 14,5 h. Qué recortar primero: T007, después T005 sin tabla.
