---
description: "Tareas de textos, explicaciones, guía y validación con usuarios"
---

# Tasks: Textos, explicaciones, guía y validación con usuarios

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md) §6 a §8

T001 no necesita la base. El resto requiere la base 002 fusionada.

## Phase 1: Setup

- [x] T001 Proponer paleta (escala divergente apta para daltonismo, sin datos, selección) y tipografía, y entregarla a quien lleva 002 — 1 h · Acepta: valores concretos entregados antes de que 002 cierre `tokens.css`

## Phase 2: User Story 1 - Explicaciones veraces (P1) 🎯

- [x] T002 [US1] `VARIABLE_COPY` y `UI_COPY` en web/src/content/copy.ts — 1 h · Acepta: FR-C02, FR-C03
- [x] T003 [US1] `explainTrend` con las cinco variantes y avisos, y sus pruebas, en web/src/content/explain.ts y explain.test.ts — 2 h · Acepta: SC-C02

## Phase 3: User Story 2 - Primera visita y ejemplos (P2)

- [x] T004 [P] [US2] `WelcomeCard` con acción inicial y dos ejemplos en web/src/features/guide/WelcomeCard.tsx — 2 h · Acepta: cada ejemplo abre un análisis completo con un toque

## Phase 4: User Story 3 - Métodos y fuentes (P2)

- [x] T005 [P] [US3] `MethodsSheet` en web/src/features/guide/MethodsSheet.tsx — 2 h · Acepta: FR-C04

## Phase 5: User Story 4 - Validación con personas (P1)

- [ ] T006 [US4] Prueba con cinco personas según ux.md §8; resultados en docs/prueba-usuarios.md; peticiones de corrección a cada dueño — 3 h · requiere 004 y 005 integradas · Acepta: SC-C01 registrado · **2026-11-14: protocolo, guion de moderación y hojas de registro listos en docs/prueba-usuarios.md; sesiones sin realizar (requieren personas; los datos reales ya están). Desviación declarada: la tarea 3 pasa de «desde 2000» a «desde 2005» porque la precipitación empieza en 2001.**
- [x] T007 [US4] Guion de la demo y atribuciones en docs/demo.md — 1,5 h · Acepta: FR-C05 · 2026-11-14: 2 min 50 s, texto exacto por sección; los dos casos con texto fijo y valores de ensayo de los datos reales
- [ ] T008 Ajuste de textos tras la prueba — 1 h · T006

Esfuerzo: 13,5 h. No se recorta: T003 ni T006 (T006 puede bajar a tres personas).

## Phase 6: Convergence (2026-11-14)

- [x] T009 Cifras de `explainTrend` en formato es-MX (punto decimal) y con los decimales del panel (2 en °C, 1 en mm y %), per FR-A08 de 004: la frase mostraba «−30,15» junto a «−30.1» y rompía 3 pruebas de AnalysisPanel
- [x] T010 La frase de `explainTrend` ya no empieza por el veredicto ni repite «Hay evidencia de tendencia» (el panel ya los muestra): «En Baja California, la temperatura del aire sube…»
- [x] T011 `WelcomeCard` sin landmark propio: el armazón (002) ya lo envuelve en `<section aria-label="Bienvenida">` y la región salía duplicada
- [x] T012 `MethodsSheet`: periodo por variable (`variablePeriod`), origen y naturaleza de cada producto desde el catálogo, cita de MERRA-2 e IMERG (`productCitation`, sin inventar DOI para productos desconocidos), definición de reanálisis si la precipitación llega por POWER, «φ = 0.75» con punto, per FR-C02 y FR-C04
- [x] T013 Sustituir el marcador `TODO(003): segundo ejemplo` de WelcomeCard y el «caso elegido» de docs/demo.md §3 · 2026-11-14 con los datos reales: **Chihuahua · temperatura** (sube, p < 0.001) frente a Baja California (sin evidencia suficiente en 1980–2025; cambia según el año inicial). Sonora se descarta por ser la tarea 1 de la prueba
