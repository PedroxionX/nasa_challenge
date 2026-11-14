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

## Cambio a fuentes reales (decisión del equipo, 2026-11-14)

- [x] T013 Encaminar el proyecto a los productos de GES DISC sin romper lo que funciona: decisiones D2–D7 en research.md, plan.md y data-model.md; contrato revisado (ids neutrales, periodo por variable, procedencia ampliada, columnas opcionales); data.ts y state.ts; archivos de ejemplo; .gitignore de credenciales; quickstart con la T008 de 003; pedido a 003 en [handoff-003-fuentes-reales.md](handoff-003-fuentes-reales.md) — 4 h · Acepta: `npm run test` en verde; la web carga los archivos de ejemplo nuevos; un enlace `?var=T2M` sigue funcionando
- [x] T015 Archivo ausente servido como index.html con 200 (Vite dev/preview y Vercel) → `DataError` `not_found`, no `parse`, en web/src/lib/data.ts; el simulador de Shell.test.tsx responde como Vite (aviso de 004) — 0,5 h · Acepta: `?region=MX-JAL` muestra «No hay datos para esta región» en `npm run dev`; la prueba falla sin el arreglo
- [x] T016 Paleta Ocaso de 006 (docs/paleta.md) en web/src/styles/tokens.css con nombres --color-*; los nombres anteriores quedan como alias (005 lee --trend-1…5, --no-data y --selected); complementos de 002 sin definir en Ocaso: --color-panel-raised #2a2340 y --color-accent #d9d2ff, pendientes de confirmar con 006 — 1 h · Acepta: tokens.test.ts mide ≥ 4,5:1 en cada par de texto y que los alias resuelven a Ocaso
- [x] T018 Fixtures de prueba compartidos: copia fija de los ejemplos sintéticos en web/src/lib/__fixtures__/trends/ y ayudante web/src/lib/testing/fixtures.ts (fixtureFetch, que responde como Vite a un archivo ausente); las pruebas de 002 ya no leen web/public/data/trends/, que pasa a ser de 003 con datos reales (pedido de 003) — 0,5 h · Acepta: las pruebas de 002 pasan con web/public/data/trends/ vacía
- [ ] T017 Fuente Inter autoalojada (latino, 400/500/700, font-display: swap), p. ej. con @fontsource/inter 5.3.0 (OFL-1.1) a versión fija — 0,5 h · bloqueada: la instalación de la dependencia necesita la aprobación de quien lleva 002 · Acepta: Inter se sirve desde el propio sitio, sin peticiones a terceros
- [ ] T014 Visto bueno a las dependencias de pipeline/pyproject.toml en la petición de fusión de 003 (ver el pedido) — 0,25 h · Acepta: versiones exactas anotadas con fecha

Esfuerzo: 12 h de base + 9,5 h de integración + 4,25 h del cambio a fuentes reales.
