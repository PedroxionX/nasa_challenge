---
description: "Lista de tareas del MVP del explorador de tendencias"
---

# Tasks: Explorador de tendencias por región (MVP)

**Input**: Design documents from `/specs/001-trend-explorer-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-files.md, ux.md

**Tests**: incluidas las científicas y de contrato, porque la constitución (I) las exige.

**Organization**: por historia de usuario. Cada línea añade rol, esfuerzo, dependencias y criterio de aceptación.

## Format: `[ID] [P?] [Story] Description`

Roles (escenario ilustrativo de tres personas, no confirmado): **D** datos y ciencia · **F** frontend · **U** producto, diseño y pruebas. Las horas son esfuerzo, no tiempo de calendario.

## Phase 1: Setup

- [ ] T001 Confirmar las reglas del evento sobre código previo y registrar la decisión en specs/001-trend-explorer-mvp/research.md — U · 0,5 h · sin dependencias · Acepta: decisión «reutilizar» o «reimplementar» escrita con su fuente
- [ ] T002 Crear pipeline/ con el núcleo del laboratorio (config, schema, processing, stats/, explain, tests, fixtures) traído de la rama practice/trendlens-lab a pipeline/trendlens/ y pipeline/tests/ — D · 1,5 h · T001 · Acepta: `pytest` muestra 120 aprobadas sin importar Streamlit ni Plotly
- [ ] T003 [P] Añadir d3-scale, d3-shape y Vitest en web/package.json y un script `test` — F · 1 h · Acepta: `npm run test` y `npm run build` terminan sin errores

---

## Phase 2: Foundational (bloquea todas las historias)

- [ ] T004 [P] Escribir el archivo de ejemplo web/public/data/trends/series/T2M/MX-BCN.json y catalog.json a mano según contracts/data-files.md, marcado `is_synthetic: true` — D · 1 h · Acepta: el frontend puede avanzar sin el pipeline; la interfaz lo rotula como ejemplo
- [ ] T005 Descarga por teselas de 2° a 10°, un parámetro por solicitud, con caché y manifiesto de URL, fecha y huella en pipeline/power_regional.py — D · 3 h · T002 · Acepta: una región y dos variables descargadas; un fallo de red produce error, nunca datos
- [ ] T006 Pesos por celda (cos latitud × fracción cubierta) y regla de región pequeña en pipeline/weights.py con pruebas en pipeline/tests/test_weights.py — D · 3 h · T002 · Acepta: pasan los cuatro casos de la tabla de validación del plan
- [ ] T007 Series regionales, tabla de las 666 ventanas y escritura validada de catalog.json, series/ y map/ en pipeline/build.py — D · 3,5 h · T005, T006 · Acepta: archivos válidos según el contrato; tiempo de cómputo y tamaño total medidos y anotados
- [ ] T008 Primera serie real de extremo a extremo (Baja California y Texas, T2M) y contraste con el endpoint por punto y con la clave anual de la fuente — D · 1,5 h · T007 · Acepta: diferencias ≤ 0,01; **puerta: sin esto no se integra en el frontend**
- [ ] T009 [P] Tipos del contrato y carga con errores recuperables en web/src/lib/data.ts, y estado en la URL en web/src/lib/urlState.ts, con pruebas — F · 2 h · T003 · Acepta: `schema_version` desconocido o archivo ausente dan un error tipado; la URL restaura región, variable y periodo
- [ ] T010 [P] Sustituir la composición de web/src/App.tsx (cabecera, escenario, panel), con límite de errores, aviso sin WebGL y tiempo máximo de carga de texturas — F · 3 h · T003 · Acepta: sin WebGL y con una textura bloqueada la aplicación sigue utilizable por buscador
- [ ] T011 [P] Definir paleta, escala divergente, tipografía y componentes base en web/src/index.css según ux.md §6 — U+F · 2 h · Acepta: contraste de texto ≥ 4,5:1 medido; sin vidrio ni rótulo sobre el título en el panel
- [ ] T012 [P] Redactar definiciones de variables y plantillas de explicación en web/src/lib/explain.ts con pruebas de las cuatro variantes — U · 2 h · T009 · Acepta: ninguna variante afirma causa ni «no hay cambio»; solo usa cifras del archivo

**Checkpoint**: contrato estable, un dato real validado y armazón de la aplicación listos.

---

## Phase 3: User Story 1 - Investigar una región (Priority: P1) 🎯 MVP

**Goal**: elegir región y ver serie, cambio y evidencia con procedencia.

**Independent Test**: responder «¿sube o baja?, ¿cuánto?, ¿hay evidencia?» para una región sin ayuda.

- [ ] T013 [P] [US1] Buscador de regiones accesible, agrupado por país, en web/src/components/RegionSearch.tsx — F · 2 h · T010 · Acepta: se elige una región solo con teclado; sin coincidencias muestra el texto de ux.md §7
- [ ] T014 [P] [US1] Selector de variable con definición en web/src/components/VariablePicker.tsx — F · 1 h · T010, T012 · Acepta: dos opciones; la definición se lee sin salir de la pantalla
- [ ] T015 [US1] Gráfica anual con recta, banda, años excluidos, año parcial y alternativa en tabla en web/src/components/TrendChart.tsx — F · 3,5 h · T009 · Acepta: los valores de la tabla coinciden con el archivo; legible a 360 px de ancho
- [ ] T016 [US1] Tarjetas de resultado con los cinco estados, explicación, detalles técnicos y procedencia en web/src/components/ResultCards.tsx y AnalysisPanel.tsx — F · 3 h · T009, T012 · Acepta: cada resultado muestra método, periodo, n, unidades, α y procedencia (SC-005); no existe el hueco «años para ser significativo» (FR-014)
- [ ] T017 [US1] Sincronizar selección, cámara y panel en web/src/components/EarthGlobe.tsx: desplazamiento de cámara, Escape, foco y anuncio del resultado, sin tooltip fijo en táctil — F · 2 h · T010 · Acepta: la región elegida queda visible fuera del panel en 390×844; Escape cierra y devuelve el foco
- [ ] T018 [US1] Estados de carga con esqueleto, error con reintento y región sin datos en AnalysisPanel.tsx — F · 1,5 h · T016 · Acepta: los tres estados se provocan y se recuperan sin recargar

**Checkpoint**: US1 demostrable con datos reales.

---

## Phase 4: User Story 2 - Cambiar el periodo (Priority: P1)

**Goal**: ajustar el periodo y entender su efecto.

**Independent Test**: un periodo válido recalcula; uno corto muestra «datos insuficientes».

- [ ] T019 [US2] Control de periodo con año inicial y final, mínimo y «Usar todo el periodo» en web/src/components/PeriodControl.tsx — F · 2 h · T016 · Acepta: operable con teclado y tacto; nunca produce un periodo invertido
- [ ] T020 [US2] Aviso de periodo elegido y vista de variación según el año inicial, a partir de la tabla de ventanas, en AnalysisPanel.tsx — F · 2 h · T019 · Acepta: el aviso aparece solo fuera del periodo completo; las cifras salen del archivo

**Checkpoint**: US1 y US2 completas = MVP mínimo.

---

## Phase 5: User Story 3 - Ver dónde cambia (Priority: P2)

**Goal**: globo teñido por cambio estimado, con leyenda y tabla.

**Independent Test**: con la leyenda, señalar una región que sube, una que baja y explicar «sin datos».

- [ ] T021 [US3] Enlazar `regionColor` con map/{variable}.json y pasar la selección a contorno y elevación en web/src/components/EarthGlobe.tsx — F · 1,5 h · T007, T017 · Acepta: cambiar variable o periodo actualiza los colores; la selección no usa el relleno
- [ ] T022 [US3] Leyenda con clases, «sin datos», aviso de comparaciones múltiples y vista de tabla ordenable en web/src/components/MapLegend.tsx — F · 2,5 h · T021 · Acepta: la información del mapa se obtiene completa desde la tabla
- [ ] T023 [US3] Rendimiento de la escena: fronteras de países en una sola geometría, pausa en reposo, nubes apagadas con datos, movimiento reducido, texturas ligeras en móvil, liberar texturas y material propios, revisar el artefacto de Texas — F · 4 h · T021 · Acepta: 0 cuadros dibujados en reposo; llamadas por cuadro medidas antes y después

---

## Phase 6: User Story 4 - Entender y aprender (Priority: P2)

**Goal**: ejemplos guiados y métodos accesibles.

**Independent Test**: tras un ejemplo, la persona explica qué significa y qué no demuestra.

- [ ] T024 [P] [US4] Estado de primera visita con acción inicial y dos ejemplos en web/src/App.tsx — U+F · 2 h · T016 · Acepta: cada ejemplo abre un análisis completo con un toque
- [ ] T025 [P] [US4] Hoja de métodos, límites y atribución en web/src/components/MethodsSheet.tsx — U · 2 h · T012 · Acepta: describe método, supuestos, límite de la corrección y cómo citar la fuente

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T026 Adaptación a móvil: hoja inferior con tres alturas, cabecera sin apilado, objetivos ≥ 44 px, 700 px sin solapes, en web/src/index.css y AnalysisPanel.tsx — F · 3 h · T016 · Acepta: recorrido US1 y US2 completo en 390×844 y 844×390
- [ ] T027 Accesibilidad: recorrido solo con teclado, anuncios de cambios, contraste medido — F · 1,5 h · T026 · Acepta: SC-008 en escritorio
- [ ] T028 Validación científica completa: suite del laboratorio, pruebas espaciales, contrato y una serie real frente a una referencia externa (Giovanni si hay cuenta) — D · 2 h · T008 · Acepta: SC-006 y SC-007 con cifras anotadas en quickstart.md
- [ ] T029 Prueba con cinco personas según ux.md §8 y corrección de lo que falle — U · 3 h · T020 · Acepta: resultados registrados; cada tarea por debajo de 4 de 5 tiene corrección o queda declarada
- [ ] T030 Medir rendimiento en los dispositivos de referencia y anotar resultados en ux.md §3 — F · 1,5 h · T023 · Acepta: tabla con valores medidos; los objetivos incumplidos tienen decisión
- [ ] T031 Preparar la demo: compilación estática, comprobación sin red, guion de 3 minutos con los dos casos, README y atribución — todos · 3 h · T028 · Acepta: SC-009; quickstart.md reproducible desde un clon limpio
- [ ] T032 Margen de integración y fallos — todos · 4 h · Acepta: no se asigna a funciones nuevas

---

## Dependencies & Execution Order

- **Ruta crítica de datos**: T001 → T002 → T005 y T006 → T007 → T008 → T028 → T031.
- **En paralelo desde el inicio**: T003, T004, T009, T010, T011, T012 (frontend y diseño avanzan con el archivo de ejemplo).
- US1 depende de la fase 2; US2 de US1; US3 de T007 y T017; US4 de T012 y T016.

## Esfuerzo

| Bloque | Horas |
|---|---|
| Setup | 3 |
| Foundational | 21 |
| US1 | 13 |
| US2 | 4 |
| US3 | 8 |
| US4 | 4 |
| Polish | 18 |
| **Total** | **71** |

MVP mínimo (Setup, Foundational, US1, US2, T026, T027, T028, T029, T031, T032): **57,5 h**. Con tres personas, la ruta crítica de datos (≈ 15 h de D seguidas) marca el calendario.

## Qué recortar primero

1. T025 → un párrafo de método dentro de «Detalles técnicos».
2. T020 → solo el aviso, sin la vista de variación.
3. T023 → solo pausa en reposo, movimiento reducido y nubes apagadas.
4. T022 → leyenda sin tabla.
5. US3 completa → el globo solo navega.
6. Alcance de datos → una variable (temperatura) o solo las regiones de demostración.

Nunca se recortan: T008, T012, T018, T027, T028, T029 (esta última puede bajar a tres personas, no desaparecer).

## Implementation Strategy

Primero US1 con datos reales y validarla; después US2; parar y probar con usuarios; solo entonces US3 y US4.
