---
description: "Tareas del pipeline de datos"
---

# Tasks: Pipeline de datos y motor de tendencias

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/contracts/data-files.md](../001-trend-explorer-mvp/contracts/data-files.md)

Puede empezar sin esperar a la base: solo escribe en `pipeline/`. Publica en `web/public/data/trends/` cuando 002 esté fusionada.

## Phase 1: Setup

- [ ] T001 Traer de la rama practice/trendlens-lab el núcleo (config, schema, processing, stats/, explain, tests, fixtures) a pipeline/trendlens/ y pipeline/tests/, con pipeline/pyproject.toml — 1,5 h · Acepta: 120 pruebas aprobadas sin Streamlit ni Plotly

## Phase 2: User Story 1 - Una serie real validada (P1) 🎯

- [ ] T002 [US1] Descarga por teselas con caché y manifiesto en pipeline/power_regional.py — 3 h · T001 · Acepta: un fallo de red produce error; el manifiesto registra URL, fecha y huella
- [ ] T003 [P] [US1] Pesos por celda y regla de región pequeña en pipeline/weights.py con pruebas en pipeline/tests/test_weights.py — 3 h · T001 · Acepta: celda única, celda cubierta entera, suma de fracciones igual al área, región pequeña
- [ ] T004 [US1] Series regionales, tabla de ventanas y escritura validada en pipeline/build.py — 3,5 h · T002, T003 · Acepta: archivos válidos según el contrato
- [ ] T005 [US1] Baja California y Texas con T2M de extremo a extremo y contraste con el endpoint por punto y la clave anual — 1,5 h · T004 · Acepta: diferencias ≤ 0,01; **puerta para publicar datos al frontend**

## Phase 3: User Story 2 - Todo el conjunto (P1)

- [ ] T006 [US2] Ejecutar las 84 regiones y las dos variables; escribir web/public/data/trends/; medir tiempo y tamaño — 1,5 h · T005 y base 002 fusionada · Acepta: SC-D03; ninguna región sin estado
- [ ] T007 [P] [US2] Texto de atribución y cómo citar en pipeline/ATTRIBUTION.md — 0,5 h

## Phase 4: User Story 3 - Validación externa (P2)

- [ ] T008 [US3] Comparar un estado de EE. UU. con Giovanni y anotar cifras en ../001-trend-explorer-mvp/quickstart.md mediante quien lleva 002 — 2 h · T006 · Acepta: SC-D02 o pendiente documentado

Esfuerzo: 16,5 h. Ruta crítica del proyecto: T001 → T002 y T003 → T004 → T005 → T006.
