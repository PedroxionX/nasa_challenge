# Research: Modo detective

Sin `NEEDS CLARIFICATION` en el contexto técnico. Se registran las decisiones de diseño.

## R1 · Dónde se muestra la revelación

- **Decision**: Paso 4 dentro del propio flujo, antes de abrir el análisis.
- **Rationale**: `Shell.tsx` desmonta la bienvenida en cuanto hay región; el panel es de 004. Revelar antes de `setRegion` evita tocar 002 y 004.
- **Alternatives**: aviso dentro del panel de análisis (toca 004); estado global de «predicción» en `app/state.ts` (toca 002).

## R2 · Cómo se elige «Mi estado»

- **Decision**: `<select>` nativo con `<optgroup>` por país (México, Estados Unidos), ordenado por nombre, desde `catalog.regions`.
- **Rationale**: `RegionSearch` es de 004 y no se puede importar (regla 2). El `<select>` nativo es accesible con teclado y tacto sin trabajo extra.
- **Alternatives**: copiar el buscador (duplicación); abrir el buscador del encabezado moviendo el foco (acoplamiento con el DOM de otra rama).

## R3 · Qué variables se ofrecen

- **Decision**: intersección de `catalog.variables[].id` con los temas de `options.ts`. Etiquetas visibles: la pregunta llana de `DETECTIVE_COPY`; el nombre de la variable sale de `catalog.variables[].label`.
- **Rationale**: compila antes y después de 007 (que elimina `VARIABLE_IDS` y vuelve `VariableId` un `string`); GLDAS aparece cuando el catálogo lo publique.
- **Alternatives**: `VARIABLE_IDS` (se rompe con 007); `VARIABLE_COPY` (007 lo vuelve `Partial` y no tendría GLDAS).

## R4 · Qué fila se usa y qué unidad

- **Decision**: `pickWindow(series, firstYear, lastYear)` con `variablePeriod(catalog, id)`. Magnitud: si `relative_change`, `slope_decade_pct` con «%/década»; si no, `slope_decade` con `${unit_annual}/década`.
- **Rationale**: es la misma fila y la misma unidad que el análisis completo y el mapa muestran al abrir con periodo completo; la revelación no contradice al panel.
- **Alternatives**: leer el mapa (no trae `p` ni `n` por región en todos los casos).

## R5 · Lógica de la frase

- **Decision**: `revealPrediction(prediction, row, ctx)` determinista en `content/`. La dirección solo se usa con `increasing`/`decreasing` (la da el estado); con `inconclusive` no se menciona dirección ni pendiente (decisión de 006, clarification 2026-11-14; FR-A05 de 004). Tabla:

| Predicción \ estado | increasing / decreasing | inconclusive (cualquier signo) | insufficient / invalid / sin fila |
|---|---|---|---|
| Subió / Bajó, misma dirección | `match`: «¡Coincide! Los datos muestran un aumento / una disminución, con evidencia» | `undecided`: «Con estos datos no se puede confirmar ni descartar tu predicción: no hay evidencia suficiente de tendencia. Esto no demuestra que no haya cambio» | `none`: «Con estos datos no se puede emitir un veredicto» (sin comparar) |
| Subió / Bajó, dirección contraria | `opposite`: «Sorpresa: los datos muestran lo contrario, un aumento / una disminución con evidencia» | igual | igual |
| Casi no cambió | `opposite`: «Los datos muestran un aumento / una disminución con evidencia» | `undecided`: «No hay evidencia suficiente para afirmar un cambio, pero eso no es lo mismo que demostrar que se mantuvo igual» | igual |
| Ni idea | `neutral`: describe el resultado sin juicio | `neutral`: «No hay evidencia suficiente de tendencia. Esto no demuestra que no haya cambio» | igual |

- **Rationale**: cubre FR-E07 y la constitución (I) sin contradecir la explicación de 006 ni el panel de 004; pruebas exhaustivas sobre 4 × 5 × 3 combinaciones.
- **Alternatives**: reutilizar `explainTrend` sola (no habla de la predicción); se usa además para el veredicto y la cifra.

## R6 · Selección aleatoria

- **Decision**: `Math.random` inyectable (`pick(list, rand = Math.random)`) para «Sorpréndeme» y para la región dentro de un tipo de lugar; «Sorpréndeme» evita el último caso mostrado en la sesión (estado del componente).
- **Rationale**: pruebas deterministas sin mocks globales.

## R7 · Convivencia con 007

- **Decision**: ver [aviso-007.md](aviso-007.md). En `WelcomeCard.tsx` la importación nueva va después de `import './guide.css'` (línea que 007 no toca); en `content/index.ts` el bloque nuevo va entre `fmtP` y `explainTrend`, sin tocar importaciones (ya importa `TrendRow`, `TrendStatus`, `VariableId`).

## R8 · Catorce variables en una tarjeta pequeña (2026-11-15)

- **Decision**: Pregunta 1 en dos pantallas (grupo → tema), ambas «Pregunta 1 de 3». Grupos y lugares por grupo en `options.ts` (ids); textos en `content/`. Solo se muestran grupos con algún tema publicado.
- **Rationale**: 14 botones no caben bajo la leyenda del mapa (medido: el paso más alto queda a ~8 px). Agrupar mantiene cada pantalla en ≤ 6 opciones.
- **Alternatives**: lista con desplazamiento (oculta opciones), «ver más temas» (esconde la mayoría).

## R9 · «Un lugar donde pasó lo contrario»

- **Decision**: pares curados en `options.ts`; antes de ofrecerlos se leen las dos series publicadas (`loadSeries` + `pickWindow` del periodo completo) y solo se ofrece si ambas tienen `increasing`/`decreasing` en direcciones opuestas. Lleva a la pregunta 3 con el otro lugar, así la persona vuelve a predecir.
- **Rationale**: el texto afirma un hecho («pasó lo contrario»); se comprueba con los archivos, no con la lista fija. Sin estadística en el navegador.

## R10 · Concordancia y unidades

- **Decision**: cada tema declara si su sustantivo es plural («las partículas… aumentaron»). Variables con `unit_annual = "adimensional"` muestran el cambio solo en %.
