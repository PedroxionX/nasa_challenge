---
description: "Tareas de la base compartida e integración"
---

# Tasks: Base compartida e integración

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/contracts/data-files.md](../001-trend-explorer-mvp/contracts/data-files.md)

## Phase 1: Base (bloquea a todos; fusionar cuanto antes)

- [x] T001 Crear `web/src/app/`, `lib/`, `styles/`, `features/{query,globe,analysis,guide}/`, `content/`; mover con `git mv` `components/EarthGlobe.tsx` y `lib/geo.ts` a `web/src/features/globe/`; borrar `components/RegionPanel.tsx` — 1,5 h · Acepta: la aplicación compila y el globo se ve igual que antes
- [x] T002 Añadir d3-scale, d3-shape y Vitest con script `test` en web/package.json — 1 h · Acepta: `npm run test` y `npm run build` terminan sin errores
- [x] T003 [P] Tipos del contrato, `loadCatalog`, `loadSeries`, `loadMap`, `pickWindow` y sus pruebas en web/src/lib/data.ts — 2 h · Acepta: archivo ausente o `schema_version` desconocido dan un error tipado
- [x] T004 [P] `useAppState` con sincronización de URL y pruebas en web/src/app/state.ts — 1,5 h · Acepta: recargar una URL restaura región, variable y periodo; valores inválidos vuelven al predeterminado
- [x] T005 Armazón adaptable con cabecera, escenario y panel u hoja inferior, límite de errores, detección de WebGL y variables `--panel-inset-*` en web/src/App.tsx y web/src/app/Shell.tsx — 3 h · T001 · Acepta: sin solapes en 1440, 700 y 390 px de ancho; sin WebGL el armazón sigue visible
- [x] T006 [P] Variables de diseño en web/src/styles/tokens.css con la paleta que entregue 006 — 1 h · Acepta: contraste de texto ≥ 4,5:1 medido
- [x] T007 Esbozos de `QueryBar`, `GlobeStage`, `AnalysisPanel`, `WelcomeCard`, `MethodsSheet` y `content/index.ts`, más archivos de ejemplo marcados como sintéticos en web/public/data/trends/ — 1,5 h · T003 · Acepta: cinco zonas rotuladas en pantalla con el ejemplo
- [ ] T008 Fusionar en `sync_main` y avisar al equipo — 0,5 h · Acepta: SC-F02

**Checkpoint**: desde aquí se crean las ramas 003 a 006.

## Phase 2: Integración y publicación

- [ ] T009 Revisar y fusionar cada rama cuando llegue; comprobar que solo toca sus rutas — 2 h · Acepta: SC-F01
- [ ] T010 Publicación del sitio estático (flujo en .github/workflows/ y `base` en web/vite.config.ts) — 2 h · Acepta: enlace público operativo
- [ ] T011 Recorrido completo de quickstart, con y sin red, en móvil y portátil; actualizar README.md — 1,5 h · Acepta: SC-F03
- [ ] T012 Margen de integración — 4 h · no se asigna a funciones nuevas

Esfuerzo: 12 h de base + 9,5 h de integración.
