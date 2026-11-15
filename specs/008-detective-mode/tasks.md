---
description: "Tareas del modo detective"
---

# Tasks: Modo detective

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/detective-copy.md](contracts/detective-copy.md), [quickstart.md](quickstart.md)

**Tests**: incluidas; la spec las exige (SC-E03, US2 «Independent Test»).

Rutas: solo las de «Propiedad de archivos» de la spec. `features/guide/detective/` importa solo de `app/`, `lib/` y `content/`. No usar `VARIABLE_IDS` ni suponer que `VariableId` es una unión (convivencia con 007, [aviso-007.md](aviso-007.md)).

## Phase 1: Setup

- [x] T001 Crear la carpeta web/src/features/guide/detective/ con index.ts (exporta `DetectiveMode`) y detective.css vacío importado desde el componente — 5 min · Acepta: `npm run test` y `npx tsc --noEmit` siguen en verde

## Phase 2: Foundational (bloquea US1–US3)

- [x] T002 [P] Datos fijos y filtros puros en web/src/features/guide/detective/options.ts: `TOPIC_IDS = ['air_temperature','precipitation','soil_moisture','evapotranspiration']`; `PLACES` = desert: MX-SON, US-AZ, US-NV · tropical: MX-CHP, MX-TAB, US-HI · farmland: US-IN, US-IA, US-KS · cold: US-AK, US-CO; `CURATED_CASES` = MX-HID·precipitation, MX-VER·precipitation, US-HI·soil_moisture, US-FL·evapotranspiration, MX-CHH·air_temperature; funciones `availableTopics(catalog)`, `placeRegions(placeId, catalog)`, `availableCases(catalog)`, `pick(list, rand = Math.random, avoid?)` («elemento al azar distinto de `avoid` si hay alternativa») — 25 min · Acepta: sin importar `VARIABLE_IDS`; solo devuelve ids presentes en el catálogo
- [x] T003 [P] Pruebas de options.ts en web/src/features/guide/detective/options.test.ts con el catálogo de web/src/lib/__fixtures__ y un catálogo ampliado con soil_moisture/evapotranspiration — 20 min · Acepta: con 2 variables solo salen 2 temas y los casos de temperatura/precipitación; con 4 salen todos; `pick` no repite `avoid` cuando hay alternativa
- [x] T004 Bloque `DETECTIVE_COPY` (todos los textos de [contracts/detective-copy.md](contracts/detective-copy.md), en español) y tipos `Prediction`, `RevealContext`, `Reveal` en web/src/content/index.ts, insertado entre `fmtP` y el comentario de `explainTrend`, sin tocar las importaciones ni el final del archivo — 20 min · Acepta: FR-E02 a FR-E04 con los textos exactos de la spec; `git diff` de content/index.ts muestra un único bloque añadido

## Phase 3: User Story 4 - Segundo ejemplo de la portada (P1) 🎯

**Goal**: ningún botón «Próximamente». **Independent Test**: el segundo ejemplo abre Hidalgo · Precipitación con un toque.

- [x] T005 [US4] *(superada el 2026-11-15: al rebasar, 006 ya había elegido Chihuahua · Temperatura como segundo ejemplo; se conserva el suyo)* En web/src/features/guide/WelcomeCard.tsx sustituir el comentario TODO(003) y el botón desactivado por un botón `welcome-example-btn` que llama `openExample('MX-HID', 'precipitation')`, con «Ver un ejemplo» · «Hidalgo» · `VARIABLE_COPY.precipitation.short`; actualizar la línea 5 del comentario de cabecera. No tocar la línea de importación de `content` ni `openExample` — 10 min · Acepta: FR-E13, SC-E05; quickstart Q1–Q2

## Phase 4: User Story 1 - Investigar respondiendo tres preguntas (P1)

**Goal**: flujo tema → lugar → predicción → revelación → análisis. **Independent Test**: una persona nueva llega al análisis completo sin instrucciones.

- [x] T006 [US1] Hook `useReveal(variableId, regionId)` en web/src/features/guide/detective/useReveal.ts: `loadCatalog` + `loadSeries` + `variablePeriod` + `pickWindow` del periodo completo; `unit` = `%/década` y `slope_decade_pct` si `relative_change`, si no `${unit_annual}/década` y `slope_decade` (research R4); estados `loading` / `error` (con `retry`) / `ready` — 25 min · Acepta: no calcula ninguna estadística; ante `DataError` devuelve `error`
- [x] T007 [US1] Componente `DetectiveMode` en web/src/features/guide/detective/DetectiveMode.tsx con la máquina de pasos de [data-model.md](data-model.md) (`'closed' | 'topic' | 'place' | 'predict' | 'reveal'`): botón de entrada; paso tema (temas de `availableTopics` + «Sorpréndeme» provisional deshabilitado hasta US3); paso lugar (4 tipos con región al azar entre `placeRegions`, opción desactivada con `placeUnavailable` si no hay regiones, y «Mi estado» con `<select>` nativo y `<optgroup>` México / Estados Unidos ordenado por nombre); paso predicción (nombra región y variable con `investigating`, botón «otra región» si el lugar tiene más de una); paso revelación (veredicto, `facts`, `sentence`, `caveats` de `revealPrediction`, «Reintentar» si error, «Ver el análisis completo» que llama `setVariable` + `resetPeriod` + `setRegion`); «Atrás» y «Salir» en cada paso — 50 min · Acepta: FR-E01, FR-E03, FR-E04, FR-E06, FR-E09, FR-E14; quickstart Q3–Q5, Q7, Q10
- [x] T008 [US1] Gestión de foco: al cambiar de paso el foco va al título del paso (`tabIndex={-1}`); al salir vuelve al botón de entrada; estados de carga con `role="status"` y error con `role="alert"` en DetectiveMode.tsx — 10 min · Acepta: FR-E09; quickstart Q8
- [x] T009 [US1] Estilos en web/src/features/guide/detective/detective.css con tokens de `tokens.css`: opciones como `welcome-example-btn` (mín. 44 px), rejilla que cabe en 375 px, iconos `aria-hidden`, transición entre pasos solo dentro de `@media (prefers-reduced-motion: no-preference)` — 20 min · Acepta: FR-E10, FR-E11; quickstart Q9, Q11
- [x] T010 [US1] Montar el botón de entrada en web/src/features/guide/WelcomeCard.tsx: una línea `import { DetectiveMode } from './detective'` después de `import './guide.css'` y `<DetectiveMode />` debajo de `.welcome-examples`; cuando el flujo está abierto ocupa el lugar de los ejemplos dentro de la tarjeta — 10 min · Acepta: diff mínimo en WelcomeCard (aviso-007); quickstart Q1
- [x] T011 [US1] Pruebas de recorrido en web/src/features/guide/detective/DetectiveMode.test.tsx (Testing Library, fixtures compartidos, `rand = () => 0`; los fixtures solo tienen series de MX-BCN, MX-CMX, MX-SON y US-TX, así que el recorrido va por Desierto → MX-SON): entrada → tema → lugar → predicción → revelación → «Ver el análisis completo» llama a las acciones de estado con la región y variable elegidas; «Atrás»/«Salir»; foco en el título; «Mi estado» lista regiones del catálogo; error de carga muestra «Reintentar»; no hay opción de ciudad ni de «donde más cambia» — 30 min · Acepta: SC-E02 (teclado) cubierto por pruebas; FR-E03

## Phase 5: User Story 2 - Que la revelación enseñe qué significa la evidencia (P1)

**Goal**: frase de comparación correcta en todas las combinaciones. **Independent Test**: pruebas exhaustivas predicción × estado × signo.

- [x] T012 [P] [US2] `revealPrediction(prediction, row, ctx)` en web/src/content/index.ts (dentro del bloque de T004) según la tabla de research R5 y las 6 reglas de [contracts/detective-copy.md](contracts/detective-copy.md): `verdict` con `VERDICT_LABEL`, `facts` con `fmt`/`fmtP`, periodo, n, unidad, α y `ctx.method` (constitución I), `caveats` con `UI_COPY.smallRegion` si procede y siempre `UI_COPY.notCause` — 30 min · Acepta: FR-E05, FR-E07
- [x] T013 [P] [US2] Pruebas en web/src/features/guide/detective/reveal.test.ts: las 4 predicciones × 5 estados × signo (+, −, 0/null) = 60 casos; ninguna frase contiene «no hay cambio», «porque», «debido a», «causa», «seguirá» ni «pronóstico»; `inconclusive` siempre dice que no demuestra ausencia de cambio y no menciona dirección ni pendiente (decisión de 006); `flat`+`inconclusive` y `unsure` nunca dicen «coincide»/«acertaste»; `insufficient`/`invalid`/`null` ⇒ `match = 'none'` y `facts = null`; las cifras de `facts` son las de la fila y `facts` contiene el método y α — 25 min · Acepta: SC-E03

## Phase 6: User Story 3 - Sorpréndeme (P2)

**Goal**: caso curado sin elegir. **Independent Test**: varios usos dan casos distintos y publicados.

- [x] T014 [US3] Activar «Sorpréndeme» en DetectiveMode.tsx: `pick(availableCases(catalog), rand, lastCase)`, salta al paso predicción con `viaSurprise = true`; «Atrás» desde ahí vuelve a tema; se oculta si `availableCases` está vacío — 15 min · Acepta: FR-E08; quickstart Q6
- [x] T015 [US3] Prueba en DetectiveMode.test.tsx: dos usos seguidos con `rand` fijo no repiten caso; solo aparecen casos con variable en el catálogo; se comprueba hasta el paso predicción (los casos curados no tienen serie en los fixtures) — 10 min · Acepta: US3 escenarios 1–2

## Phase 7: Polish

- [x] T016 Aviso del catálogo: si `loadCatalog` falla, el botón de entrada queda desactivado con `catalogUnavailable` y los ejemplos siguen activos, en DetectiveMode.tsx — 10 min · Acepta: caso límite «Falla la carga del catálogo»
- [x] T017 Verificación final: `npm run test`, `npx tsc --noEmit`, `npm run lint` en web/, y `git diff --name-only origin/sync_main...HEAD` solo con rutas propias — 10 min · Acepta: puerta de propiedad del plan
- [x] T018 Prueba manual de quien lleva 008 con [quickstart.md](quickstart.md) Q1–Q11 (incluye teléfono y teclado) y cronometrar un recorrido completo de una persona nueva, < 60 s (SC-E01) — 20 min · Acepta: marca `[x]` en cada tarea tras comprobarla

## Dependencies

- T001 → T002, T004 → todo lo demás. T003 tras T002.
- US4 (T005) es independiente de US1–US3: puede hacerse justo después de Phase 1.
- US1: T006 → T007 → T008, T009, T010 → T011. T007 necesita `revealPrediction` (T012) para la revelación: implementar T012 antes o junto a T007.
- US2: T012 tras T004; T013 tras T012.
- US3: T014 tras T007; T015 tras T014.
- Polish al final.

## Parallel Example

```text
Tras T001:  T002 (options.ts)  ∥  T004 (content)  ∥  T005 (segundo ejemplo)
Tras T004:  T012 (revealPrediction) → T013 (pruebas)  ∥  T006 (useReveal)
```

## Implementation Strategy

1. **Victoria rápida**: T001 + T005 (segundo ejemplo) — 15 min; se puede probar y fusionar aunque no dé tiempo a lo demás.
2. **MVP**: Phase 2 + US2 (frase y sus pruebas) + US1 (flujo) — ~4 h de trabajo de IA, menos en la práctica.
3. **Incremento**: US3 (Sorpréndeme) y Polish.

Si falta tiempo, se recorta en este orden: T016 → US3 → «otra región» de T007. No se recortan T012/T013 (rigor de la frase) ni T008 (teclado).

Esfuerzo estimado: ~6 h nominales; con la IA escribiendo, ~2 h más la prueba manual.

## Phase 8: Convergence

- [x] T019 Mostrar en la revelación la pendiente como la muestra el panel para variables con `relative_change`: cifra absoluta en `unit_annual`/década y el % entre paréntesis (p. ej. «+41.54 mm/década (+10.2 % por década)»), en web/src/features/guide/detective/useReveal.ts y `revealPrediction` de web/src/content/index.ts, con su prueba en reveal.test.ts, per plan: research R4 y quickstart Q4 (partial)
- [x] T020 Desactivar un tipo de lugar cuando ninguna de sus regiones tiene dato de la variable elegida (no solo cuando falta en el catálogo), leyendo el periodo completo de `loadMap(variable)` (`windows[clave][i] === null` ⇒ sin dato) en web/src/features/guide/detective/DetectiveMode.tsx y options.ts, con prueba, per spec: Edge Case «Tipo de lugar sin datos para la variable» (partial)
- [x] T021 Añadir una prueba de recorrido solo con teclado (Tab hasta la opción, Enter/Espacio para elegir, foco en el título de cada paso) en web/src/features/guide/detective/DetectiveMode.test.tsx, per SC-E02 (partial)
- [x] T022 Justificar la regla de detective.css que pone en dos columnas los ejemplos de 006 (`.welcome-card:has(.detective) .welcome-examples`) añadiéndola como punto de contacto en specs/008-detective-mode/aviso-007.md y avisando a quien lleva 006, o retirarla si 006 prefiere otra solución al encimamiento con la leyenda, per spec: Propiedad de archivos (unrequested)
- [x] T023 Alinear specs/008-detective-mode/contracts/detective-copy.md con el código: `places` no incluye `mine` (es la clave aparte `DETECTIVE_COPY.mine`) y existen `entryHint`, `surpriseHint`, `regionSelectPlaceholder`, `countries`, `continue`, `yourPrediction` y `method`, per plan: contracts/detective-copy.md (contradicts)

## Phase 9: Lenguaje llano (revisión 2026-11-15)

- [x] T024 Reescribir los textos del flujo para quien nunca ha usado una herramienta así en `DETECTIVE_COPY` (web/src/content/index.ts): «Modo detective» con su frase de propósito, «Pregunta N de 3», «¿Qué cambio quieres investigar?», tema con qué se mide y desde qué año, «¿Dónde quieres investigarlo?» con ayuda, selector «O elige un estado de México o Estados Unidos», pregunta 3 con qué, dónde y cuándo, respuestas «Aumentó / Disminuyó / Se mantuvo casi igual / No sé» — Acepta: FR-E01 a FR-E04 revisados
- [x] T025 Reescribir las frases de la revelación sin jerga («¡Acertaste! La lluvia en Hidalgo disminuyó…», «Todavía no se puede saber si acertaste…») y separar «Cambio estimado» (en palabras, con «por década (cada 10 años)») de «Detalles técnicos» en `revealPrediction` y DetectiveMode.tsx, sin romper las reglas de FR-E07 ni la constitución I — Acepta: reveal.test.ts en verde
- [x] T026 Ajustar DetectiveMode.test.tsx y reveal.test.ts a los textos nuevos — Acepta: `npm run test` en verde

## Phase 10: Variables nuevas de `main` (revisión 2026-11-15)

- [x] T027 [P] Grupos, temas por grupo, lugares nuevos (northeast, pacific, southeast), lugares por grupo, restricción de la nieve (sin estados de México) y casos curados nuevos en web/src/features/guide/detective/options.ts, con pruebas en options.test.ts — Acepta: FR-E15, FR-E17, FR-E18
- [x] T028 [P] Textos de grupos, de las 10 preguntas nuevas, nombres y sustantivos llanos con número (plural) y lugares nuevos en `DETECTIVE_COPY` (web/src/content/index.ts); `revealPrediction` concuerda en número y da solo % para variables sin unidad — Acepta: FR-E16, FR-E20; reveal.test.ts
- [x] T029 Pantalla de grupos antes de la de temas, ambas «Pregunta 1 de 3», «Sorpréndeme» en la de grupos, «Atrás» de temas vuelve a grupos, lugares según el grupo y selector sin México para la nieve, en DetectiveMode.tsx — Acepta: FR-E15, FR-E17
- [x] T030 Hook useContrast.ts y oferta «investigar un lugar donde pasó lo contrario» en la revelación, solo si los dos archivos tienen evidencia en direcciones opuestas; lleva a la pregunta 3 con el otro lugar — Acepta: FR-E19, US5
- [x] T031 Pruebas de recorrido con grupos, nieve sin México y contraste (con y sin direcciones opuestas) en DetectiveMode.test.tsx — Acepta: `npm run test` en verde
- [x] T032 Revisión en Chrome: ningún paso tapa la leyenda con 14 variables — Acepta: medido como en T018
- [x] T033 Abrir el detective como panel lateral derecho (hoja inferior en móvil), igual que el panel de análisis, y destacar el botón de entrada, en detective.css — Acepta: revisado en Chrome
- [x] T034 «¿Por qué importa para la Tierra?» para los 14 temas en `DETECTIVE_COPY.why` y al final de la revelación, con prueba de que ningún texto atribuye causa ni pronostica — Acepta: FR-E21; revisión de los textos por 006

Tareas comprobadas por quien lleva 008 el 2026-11-15 (quickstart Q1–Q11, incluidos móvil y teclado).
