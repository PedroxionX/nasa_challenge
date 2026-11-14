---
description: "Tareas del pipeline de datos"
---

# Tasks: Pipeline de datos y motor de tendencias

**Input**: [spec.md](spec.md), [plan.md](plan.md), [../001-trend-explorer-mvp/contracts/data-files.md](../001-trend-explorer-mvp/contracts/data-files.md)

Puede empezar sin esperar a la base: solo escribe en `pipeline/`. Publica en `web/public/data/trends/` cuando 002 esté fusionada.

## Phase 1: Setup

- [ ] T001 Traer de la rama practice/trendlens-lab el núcleo a pipeline/trendlens/ (config, schema, processing, explain, stats/, data/base.py, data/nasa_power.py, data/synthetic.py) y sus pruebas y fixtures a pipeline/tests/ (todas salvo test_app_smoke.py), con pipeline/pyproject.toml; no se traen ui/, viz.py, app.py, export.py, data/csv_source.py ni sus pruebas — 1,5 h · Acepta: todas las pruebas traídas pasan sin Streamlit ni Plotly instalados y el número exacto queda anotado en esta tarea (2026-11-14: 83 aprobadas y 1 omitida, la prueba en vivo que requiere `--run-live`; Python 3.13.7); dependencias de pyproject.toml (numpy, pandas, scipy, requests, shapely, pytest, pymannkendall) confirmadas con quien lleva 002 antes de fusionar · **Sin marcar: falta el visto bueno de 002 a las dependencias (lo demás verificado el 2026-11-14)**

## Phase 2: User Story 1 - Una serie real validada (P1) 🎯

- [x] T002 [US1] Descarga por teselas con caché y manifiesto en pipeline/power_regional.py; caché cruda en pipeline/cache/ excluida con pipeline/.gitignore — 3 h · T001 · Acepta: un fallo de red produce error, nunca datos; una unidad declarada distinta de la esperada produce error; hasta 3 reintentos con espera creciente y 30 s de límite por solicitud, y después la ejecución se detiene listando bloques y regiones afectados; una segunda ejecución solo vuelve a pedir lo que falló; el manifiesto registra URL, fecha y huella; pipeline/cache/ no aparece en git status
- [x] T003 [P] [US1] Pesos por celda y regla de región pequeña en pipeline/weights.py con pruebas en pipeline/tests/test_weights.py — 3 h · T001 · Acepta: celda única, celda cubierta entera, suma de fracciones igual al área, región pequeña (n_cells ≤ 2); la geometría de US-AK recortada a [−180°, 180°] no tiene longitudes < −180° y devuelve la transformación «Aleutianas al oeste de 180° excluidas»
- [x] T004 [US1] Series regionales, tabla de ventanas, archivo del mapa y escritura validada en pipeline/build.py, con validador del contrato en pipeline/contract.py (sin dependencias nuevas) — 4 h · T002, T003 · Acepta: el validador rechaza, con pruebas, un status fuera de la enumeración, ci_low > slope_decade o slope_decade > ci_high, una fila con n < 10, NaN en lugar de null y la falta de provenance; la escritura es todo o nada: nada se escribe si un archivo no valida o falta una región; map/{variable}.json tiene una llave "inicio-fin" por ventana de al menos 10 años, igual a las filas de windows; en T2M el valor es slope_decade; en PRECTOTCORR es slope_decade ÷ media de la ventana × 100 con unit "%/década" (null si la media es 0); todos los archivos escritos llevan is_synthetic: false y build.py no importa data/synthetic.py; ningún archivo contiene años para detectar ni detectability_years
- [x] T005 [US1] Baja California y Texas con T2M y PRECTOTCORR de extremo a extremo; contraste con el endpoint por punto y con la clave anual — 2 h · T004 · Acepta: en T2M, diferencias ≤ 0,01 frente al endpoint por punto (región de una celda) y la clave anual; en PRECTOTCORR, la suma de los meses convertidos (tasa × días) coincide con el acumulado anual de la fuente dentro de 0,01 por redondeo; **puerta para publicar datos al frontend**

## Phase 3: User Story 2 - Todo el conjunto (P1)

- [ ] T006 [US2] Ejecutar las 84 regiones y las dos variables; escribir web/public/data/trends/; medir tiempo y tamaño — 1,5 h · T005 y base 002 fusionada · Acepta: SC-D03; ninguna región sin estado; las 84 regiones figuran en catalog.json; map/T2M.json y map/PRECTOTCORR.json con 666 llaves cada uno; quien lleva 002 está avisado del unit "%/década" del mapa de precipitación antes de abrir la petición de fusión
- [x] T007 [P] [US2] Texto de atribución y cómo citar en pipeline/ATTRIBUTION.md — 0,5 h

## Phase 4: User Story 3 - Validación externa (P2)

- [x] T008 [US3] Comparar Texas (US-TX) con Giovanni (Time Series: Area-Averaged, T2M de MERRA-2, forma del estado, mismo periodo) y pasar las cifras a quien lleva 002 para ../001-trend-explorer-mvp/quickstart.md — 2 h · T005 · Acepta: diferencia ≤ 0,1 °C en cada media anual y «URL to Reproduce Results» registrada (SC-D02), o pendiente documentado con la causa; credenciales de Earthdata fuera del repositorio · **Resultado 2026-11-14: pendiente documentado** (decisión del equipo: se mantiene FR-D02). Máx |dif| 0,123 °C (media −0,098; 27/45 años ≤ 0,1). Causa: regla espacial, no datos — celda única POWER = Giovanni (media 0,000 °C, máx 0,016); Giovanni se reproduce (máx 0,051 °C) usando solo celdas con centro dentro de la forma. Pendiente idéntica (0,389 °C/década). Evidencia y URLs: pipeline/validation/t008_giovanni_us-tx.json

Esfuerzo: 17,5 h. Ruta crítica del proyecto: T001 → T002 y T003 → T004 → T005 → T006. T008 sale de la ruta crítica: puede hacerse en paralelo a T006.

## Phase 5: Convergence

- [x] T009 Hacer que el manifiesto no se sobrescriba: si ya existe manifest/<fecha>.json, la nueva ejecución escribe uno con nombre único (p. ej. <fecha>-<hora>.json) y provenance.requests apunta a ese archivo, para que los archivos publicados nunca referencien un manifiesto de otra ejecución per Constitution II (partial)
- [x] T010 Añadir a validate_sources.py el contraste literal de US1: una región de una sola celda (US-DC, n_cells = 1) cuyo valor mensual regional coincide con el endpoint por punto en su celda (≤ 0,01), y guardarlo en validation/t005.json per US1 Independent Test (partial)
- [x] T011 Ejecutar build.py con US-AK, US-HI y US-PR antes de la T006 y comprobar que las teselas en el borde de −180° y las islas devuelven todas las celdas con peso (sin KeyError de celda faltante) per FR-D02 (partial)
- [x] T012 Calcular provenance.retrieved_at_utc solo con las teselas que usa cada región, no con todas las de la variable per FR-D05 (partial)
- [x] T013 Actualizar el escenario 1 de US1 en spec.md («pasan las 120») al número registrado en T001 (83 aprobadas y 1 omitida en vivo) per US1/AC1 (contradicts)
- [x] T014 Publicar el cambio de precipitación en % por década pedido por 004: columnas slope_decade_pct, ci_low_pct y ci_high_pct al final de windows (÷ media de la ventana × 100; null en T2M y con media ≤ 0), validadas en pipeline/contract.py, coherentes con map/PRECTOTCORR.json y declaradas en provenance.transformations; avisar a quien lleva 002 para el contrato y TrendRow · Acepta: pruebas de columnas y validador en verde; T005 regenerada per FR-D05 (missing)
