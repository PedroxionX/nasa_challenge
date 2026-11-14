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

- [ ] T006 [US4] Prueba con cinco personas según ux.md §8; resultados en docs/prueba-usuarios.md; peticiones de corrección a cada dueño — 3 h · requiere 004 y 005 integradas · Acepta: SC-C01 registrado
- [ ] T007 [US4] Guion de la demo y atribuciones en docs/demo.md — 1,5 h · Acepta: FR-C05
- [ ] T008 Ajuste de textos tras la prueba — 1 h · T006

Esfuerzo: 13,5 h. No se recorta: T003 ni T006 (T006 puede bajar a tres personas).
