# Feature Specification: Modo detective (tres preguntas que llevan a un análisis)

**Feature Branch**: `008-detective-mode`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: «Modo detective en la portada: un botón junto a los ejemplos que hace tres preguntas (qué te da curiosidad, dónde, qué crees que pasó) y lleva a un análisis real, comparando la predicción con el resultado. Además, llenar el segundo ejemplo de la portada.» Amplía US4 de [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md) (FR-013) y el enfoque «data detective» del reto («users could respond to a short series of questions about what or where they would like to investigate»).

## Propiedad de archivos

Decisión de quien lleva esta especificación (2026-11-14, opción A): el modo detective vive dentro del territorio de 006 para no tocar el armazón de 002 ni el panel de 004. Se avisa a quien lleva 006 y se revisa en la petición de fusión.

| Solo esta especificación edita | Puntos de contacto en rutas ajenas (cambio mínimo, avisado) | Nunca edita |
|---|---|---|
| `specs/008-detective-mode/**` · `web/src/features/guide/detective/**` | **006**: `web/src/features/guide/WelcomeCard.tsx` (botón de entrada y segundo ejemplo), `web/src/features/guide/index.ts` si hace falta exportar, `web/src/content/index.ts` (textos del flujo) | `web/src/App.tsx`, `web/src/app/**`, `web/src/lib/**`, `web/src/styles/**`, las otras carpetas de `features/`, `pipeline/**`, `web/public/data/**`, `web/package.json` |

`features/guide/detective/` importa solo de `app/`, `lib/` y `content/` (regla 2 de la metodología). La rama `007-region-comparison` también edita `WelcomeCard.tsx`; el cambio de 008 en ese archivo se limita a añadir un botón y sustituir el bloque del segundo ejemplo, para que el conflicto al fusionar sea trivial.

## Clarifications

### Session 2026-11-14

- Q: ¿Dónde vive el código? → A: Opción A, dentro de `features/guide/` (territorio de 006), sin tocar `Shell.tsx`.
- Q: ¿Cómo se convive con 007, que también edita `WelcomeCard.tsx`? → A: Cambio mínimo en ese archivo; se prepara un aviso para quien lleva 007 con la forma de resolver el conflicto.
- Q: ¿Se aprovecha para llenar el segundo ejemplo? → A: Sí, con Hidalgo · Precipitación.
- Q: ¿Se mantienen los tipos de lugar y la lista de «Sorpréndeme» propuestos? → A: Sí, tal cual.
- Q: ¿Dónde se muestra la comparación entre predicción y resultado, si la tarjeta de bienvenida desaparece al elegir región y el panel es de 004? → A: En un paso final de «revelación» dentro del propio flujo, antes de abrir el análisis completo.
- Q: ¿Cómo se elige «Mi estado» sin importar el buscador de 004? → A: Con un selector propio del flujo que lista las regiones del catálogo, agrupadas por país.
- Q (2026-11-15): ¿Entendería las preguntas alguien que nunca ha usado una herramienta así? → A: No del todo. Se reescriben en lenguaje llano: «¿Qué cambio quieres investigar?», cada tema dice qué se mide y desde qué año (para que «antes» tenga fecha), la pregunta 3 incluye qué, dónde y cuándo, las respuestas son «Aumentó / Disminuyó / Se mantuvo casi igual / No sé», se muestra «Pregunta N de 3», y la revelación separa el resultado en palabras («Cambio estimado») de los «Detalles técnicos». Las reglas científicas no cambian.
- Q: Con evidencia insuficiente, ¿la revelación dice hacia dónde apuntan los datos? → A: No. Se respeta la decisión de 006 (clarification 2026-11-14: «No mencionar dirección») y FR-A05 de 004: sin dirección ni pendiente; se dice que la predicción no se puede confirmar ni descartar y que eso no demuestra ausencia de cambio.

### Session 2026-11-15 (variables nuevas de `main`)

- Q: `main` publica 14 variables (antes 2). ¿Cuáles entran al detective? → A: Todas, con una pregunta llana cada una (decisión de quien lleva 008).
- Q: ¿Cómo caben 14 temas en la tarjeta? → A: La pregunta 1 se divide en dos pantallas que cuentan como «Pregunta 1 de 3»: primero un grupo (Calor y frío · Agua · El aire · Lo que flota en el aire) y luego el tema.
- Q: ¿Lugares nuevos? → A: Sí: Noreste de EE. UU., Costa del Pacífico de EE. UU. y Sureste de EE. UU. Cada grupo de temas ofrece solo los lugares donde sus variables dan resultados útiles, para que la pantalla no crezca.
- Q: Nieve en México: el pipeline publica «baja» con pendiente −0.000 porque casi no nieva. → A: El tema de la nieve solo ofrece lugares fríos y estados de EE. UU.; no se ofrece ningún estado de México.
- Q: ¿Se añade algo que muestre que una variable puede ir en direcciones opuestas en lugares distintos (idea central del reto)? → A: Sí: tras la revelación, si el caso forma parte de un par curado y los archivos confirman direcciones opuestas con evidencia, se ofrece «investigar un lugar donde pasó lo contrario».
- Q: Aerosoles y polvo no tienen unidad física («adimensional»). → A: Su cambio estimado se muestra solo en % por década.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Investigar respondiendo tres preguntas (Priority: P1)

Una estudiante que no sabe por dónde empezar pulsa «Modo detective», elige un tema en lenguaje llano, un tipo de lugar y una predicción, y ve qué dicen los datos sobre su predicción; desde ahí abre el análisis completo.

**Why this priority**: Es el flujo que pide el reto y lo que convierte la herramienta en un juego de detective; sin esto la funcionalidad no existe.

**Independent Test**: Una persona nueva, sin instrucciones, completa las tres preguntas y llega al análisis completo de la región y variable que eligió.

**Acceptance Scenarios**:

1. **Given** la portada sin región elegida, **When** la persona pulsa «Modo detective», **Then** ve la primera pregunta con una opción por cada variable publicada en el catálogo más «Sorpréndeme», cada una con su texto llano.
2. **Given** la pregunta 1 respondida, **When** se muestra la pregunta 2, **Then** ofrece «Mi estado», «Desierto», «Trópico húmedo», «Zona agrícola» y «Frío / montaña», sin ninguna opción de ciudad ni de «donde más cambia».
3. **Given** un tipo de lugar elegido, **When** se pasa a la pregunta 3, **Then** la región concreta queda nombrada dentro de la propia pregunta, con la variable y los años (por ejemplo «¿Qué crees que pasó con la temperatura del aire en Sonora entre 1980 y 2025?»), con «Aumentó», «Disminuyó», «Se mantuvo casi igual» y «No sé».
4. **Given** las tres respuestas, **When** se muestra la revelación, **Then** aparece la frase que compara la predicción con el resultado, el veredicto, el cambio por década con unidades (solo si hay evidencia de tendencia), el periodo, el número de años, el valor p, α y el método, todos leídos de los archivos publicados.
5. **Given** la revelación, **When** la persona pulsa «Ver el análisis completo», **Then** se abre el análisis de esa región y variable con el periodo completo, igual que los ejemplos de la portada.
6. **Given** cualquier paso, **When** la persona pulsa «Atrás» o «Salir», **Then** vuelve al paso anterior o a la portada sin perder la portada.

---

### User Story 2 - Que la revelación enseñe qué significa la evidencia (Priority: P1)

La frase final distingue acertar la dirección de que haya evidencia, y nunca redacta «evidencia insuficiente» como «no hay cambio».

**Why this priority**: Es el valor didáctico de la predicción y lo exige la constitución (principio I).

**Independent Test**: Pruebas automáticas recorren todas las combinaciones de predicción × estado × signo y comprueban la frase.

**Acceptance Scenarios**:

1. **Given** la predicción «Bajó» y un resultado `decreasing`, **When** se revela, **Then** la frase dice que los datos coinciden y que hay evidencia de disminución.
2. **Given** la predicción «Bajó» y un resultado `inconclusive` (con cualquier signo de pendiente), **When** se revela, **Then** la frase dice que con estos datos no se puede confirmar ni descartar la predicción porque no hay evidencia suficiente de tendencia, y que eso no demuestra ausencia de cambio; no menciona dirección ni cifra de pendiente (decisión de 006, clarification 2026-11-14, y FR-A05 de 004).
3. **Given** la predicción «Casi no cambió» y un resultado `increasing`, **When** se revela, **Then** la frase dice que los datos muestran un aumento con evidencia.
4. **Given** la predicción «Casi no cambió» y un resultado `inconclusive`, **When** se revela, **Then** la frase NO da la predicción por confirmada: dice que no hay evidencia suficiente para afirmar un cambio, lo que no es lo mismo que demostrar que no cambió.
5. **Given** la predicción «Ni idea», **When** se revela, **Then** la frase describe el resultado sin juzgar acierto o error.
6. **Given** un resultado `insufficient` o `invalid`, **When** se revela, **Then** no se compara con la predicción y se explica que con estos datos no se puede emitir veredicto.
7. **Given** cualquier frase, **When** se lee, **Then** no atribuye causa ni hace pronóstico.

---

### User Story 3 - Sorpréndeme (Priority: P2)

Quien no quiere elegir pulsa «Sorpréndeme» y recibe un caso curado e interesante, con su predicción pendiente.

**Why this priority**: Rebaja la barrera de entrada; depende de US1.

**Independent Test**: Pulsar «Sorpréndeme» varias veces lleva a casos distintos de la lista, todos con variable publicada.

**Acceptance Scenarios**:

1. **Given** la pregunta 1, **When** la persona elige «Sorpréndeme», **Then** se salta la pregunta 2, se elige un caso de la lista curada cuya variable esté publicada y se pasa a la pregunta 3 con región y variable nombradas.
2. **Given** dos usos seguidos de «Sorpréndeme» en la misma visita, **When** quedan casos sin mostrar, **Then** no se repite el anterior.

---

### User Story 4 - Segundo ejemplo de la portada (Priority: P1) — superada

> **2026-11-15**: al rebasar sobre `sync_main`, 006 ya había llenado el segundo ejemplo con Chihuahua · Temperatura (006 T013, `docs/demo.md`). Es su territorio y su decisión: 008 no cambia los ejemplos. FR-E13 queda sin efecto; SC-E05 se cumple igual.

El botón «Próximamente» de la portada se sustituye por un ejemplo real: Hidalgo · Precipitación.

**Why this priority**: Hoy el jurado vería un botón desactivado; arreglarlo cuesta minutos.

**Independent Test**: El segundo ejemplo abre un análisis completo con un toque, igual que el primero.

**Acceptance Scenarios**:

1. **Given** la portada, **When** la persona pulsa el segundo ejemplo, **Then** se abre el análisis de Hidalgo con precipitación y el periodo completo de esa variable.

### User Story 5 - Un lugar donde pasó lo contrario (Priority: P2)

Tras ver el resultado, la persona puede investigar un segundo lugar donde la misma variable fue en la dirección opuesta, y entiende que un mismo tema puede subir en un sitio y bajar en otro.

**Independent Test**: En Oregón · partículas en el aire, la revelación ofrece investigar Georgia; al aceptarlo se llega a la pregunta 3 con Georgia y la misma variable.

**Acceptance Scenarios**:

1. **Given** una revelación de un caso que pertenece a un par curado, **When** los archivos de los dos lugares tienen evidencia de tendencia en direcciones opuestas, **Then** se ofrece «investigar {otro lugar}» con una frase que no atribuye causa.
2. **Given** un par curado cuyo resultado publicado ya no es opuesto o no tiene evidencia, **When** se muestra la revelación, **Then** no se ofrece nada.

### Edge Cases

- **Nieve en México**: con el tema de la nieve no se ofrece ningún estado de México (valores casi nulos que el pipeline publica como «baja» con pendiente −0.000).
- **Variables sin unidad física** (aerosoles, polvo): el cambio estimado se da solo en % por década.
- **Variable no publicada**: hoy el catálogo de `sync_main` tiene temperatura y precipitación; humedad del suelo y evapotranspiración llegan con la PR #13 de 003 (también incluida en la rama de 007). Las opciones de tema y los casos de «Sorpréndeme» aparecen solo si su variable está en el catálogo; sin cambios de código cuando se publiquen.
- **Tipo de lugar sin datos para la variable**: si ninguna de sus regiones tiene archivo para la variable elegida, la opción se muestra desactivada con el motivo en texto.
- **Varias regiones por tipo de lugar**: se elige una al azar entre las que tienen datos y se nombra; la persona puede pedir «otra región» del mismo tipo.
- **Región pequeña** (`small_region: true`; en el catálogo actual solo Washington D.C., elegible con «Mi estado»): la revelación incluye el aviso de región pequeña que ya usa la explicación de 006.
- **Falla la carga del archivo de la serie**: la revelación muestra el error con «Reintentar» y deja abrir el análisis o volver atrás; nunca inventa un resultado.
- **Falla la carga del catálogo**: el botón de entrada se desactiva con texto que lo explica; los ejemplos siguen funcionando.
- **La persona elige una región en el globo a mitad del flujo**: la portada se cierra y el flujo se abandona sin errores.
- **Sin gráficos 3D**: el flujo funciona igual; no depende del globo.

## Requirements *(mandatory)*

Cubre de 001: FR-001 (definiciones llanas), FR-008, FR-009, FR-013, FR-015, FR-016, FR-017 y FR-019.

### Functional Requirements

- **FR-E01**: La portada DEBE ofrecer una acción «Modo detective» junto a los ejemplos, que diga en una frase para qué sirve, operable con teclado y con tacto.
- **FR-E02**: La pregunta 1 DEBE ofrecer un tema por cada variable que esté a la vez en el catálogo y en la lista de temas, con este texto: temperatura → «¿Hace más calor que antes?»; precipitación → «¿Llueve más o menos que antes?»; humedad del suelo → «¿La tierra está más seca que antes?»; evapotranspiración → «¿Se evapora más agua del suelo y las plantas?». Bajo cada tema, qué se mide en palabras llanas y los años de los datos (p. ej. «Lluvia y nieve (precipitación) · datos de 2001 a 2024»); además «Sorpréndeme».
- **FR-E03**: La pregunta 2 DEBE ofrecer exactamente: un selector «O elige un estado de México o Estados Unidos» (regiones del catálogo agrupadas por país), «Desierto» (MX-SON, US-AZ, US-NV), «Trópico húmedo» (MX-CHP, MX-TAB, US-HI), «Zona agrícola» (US-IN, US-IA, US-KS) y «Frío o montaña» (US-AK, US-CO). NO DEBE ofrecer opción de ciudad ni de «donde más cambia» (FR-019 de 001).
- **FR-E04**: La pregunta 3 DEBE nombrar en la propia pregunta la variable en lenguaje llano, la región y los años del periodo, y ofrecer «Aumentó», «Disminuyó», «Se mantuvo casi igual» y «No sé».
- **FR-E05**: La revelación DEBE usar el resultado del periodo completo de la variable leído del archivo publicado (estado y pendiente); el navegador NO DEBE calcular ninguna estadística.
- **FR-E06**: La revelación DEBE mostrar veredicto, cambio por década con unidades (solo con `increasing`/`decreasing`, como el panel), periodo, número de años, valor p, α y método, y un enlace a «Ver el análisis completo» que abra el análisis igual que los ejemplos.
- **FR-E07**: La frase de comparación DEBE cubrir todas las combinaciones de predicción (4) × estado (5) × signo de la pendiente, y no redactar nunca «evidencia insuficiente» como «no hay cambio» ni como confirmación de «Casi no cambió». Con `inconclusive` NO DEBE mencionar dirección ni cifra de pendiente, igual que la explicación de 006 y el panel de 004.
- **FR-E08**: «Sorpréndeme» DEBE elegir de esta lista, filtrada por catálogo y sin repetir el caso anterior en la visita: Hidalgo · precipitación; Veracruz · precipitación; Hawái · humedad del suelo; Florida · evapotranspiración; Chihuahua · temperatura.
- **FR-E09**: Cada paso DEBE permitir volver atrás y salir a la portada; el foco DEBE moverse al título de cada paso nuevo y volver al botón de entrada al salir.
- **FR-E10**: Las opciones DEBEN distinguirse por texto, no solo por color o icono; los iconos son decorativos. Los objetivos táctiles DEBEN medir al menos 44 px.
- **FR-E11**: Las transiciones entre pasos DEBEN respetar la preferencia de movimiento reducido.
- **FR-E12**: Todos los textos del flujo DEBEN estar en español y vivir junto al resto de textos de la aplicación, no dispersos en los componentes.
- **FR-E13**: ~~El segundo ejemplo de la portada DEBE abrir Hidalgo · Precipitación~~ — sin efecto (2026-11-15): 006 eligió Chihuahua · Temperatura.
- **FR-E14**: Los estados de carga, error recuperable y datos insuficientes DEBEN estar definidos en la revelación (FR-015 de 001).
- **FR-E15**: La pregunta 1 DEBE presentar primero los grupos con al menos un tema publicado —«Calor y frío» (temperatura del aire, máxima, mínima, del suelo), «Agua» (precipitación, humedad del suelo, evapotranspiración, escorrentía, nieve), «El aire» (humedad del aire, vapor de agua total, ozono total) y «Lo que flota en el aire» (aerosoles, polvo)— y después los temas del grupo; ambas pantallas muestran «Pregunta 1 de 3». «Sorpréndeme» está en la pantalla de grupos.
- **FR-E16**: Cada una de las 14 variables DEBE tener una pregunta llana y un nombre llano: máxima «¿Los días son más calurosos?»; mínima «¿Las noches son menos frías?»; suelo «¿El suelo está más caliente que antes?»; escorrentía «¿Escurre más o menos agua por el suelo?»; nieve «¿Hay menos nieve que antes?»; humedad del aire «¿El aire está más húmedo que antes?»; vapor de agua «¿Hay más vapor de agua en el cielo?»; ozono «¿Cambió el ozono sobre este lugar?»; aerosoles «¿Hay más o menos partículas en el aire (humo, contaminación, sal del mar)?»; polvo «¿Hay más o menos polvo en el aire?». Las frases concuerdan en número («las partículas… aumentaron»).
- **FR-E17**: La pregunta 2 DEBE ofrecer los lugares del grupo del tema: Calor y frío y Agua → Desierto, Trópico húmedo, Zona agrícola, Frío o montaña, Noreste de EE. UU. (US-ME, US-NH, US-NY, US-MA); El aire → Noreste de EE. UU., Desierto, Trópico húmedo, Frío o montaña; Lo que flota en el aire → Desierto, Costa del Pacífico de EE. UU. (US-OR, US-WA, US-CA), Sureste de EE. UU. (US-GA, US-SC, US-FL), Zona agrícola. La nieve ofrece solo Frío o montaña, Noreste y Costa del Pacífico, y su selector solo lista estados de EE. UU.
- **FR-E18**: «Sorpréndeme» DEBE incluir además: Ciudad de México · temperatura del suelo; Massachusetts · temperatura mínima; Maine · nieve; Chihuahua · polvo; Oregón · aerosoles.
- **FR-E19**: Tras la revelación DEBE ofrecerse «investigar un lugar donde pasó lo contrario» solo para los pares curados (aerosoles: Oregón ↔ Georgia; humedad del suelo: Baja California ↔ Tlaxcala; temperatura del suelo: Puerto Rico ↔ Ciudad de México) y solo si los dos archivos publicados tienen evidencia de tendencia en direcciones opuestas en el periodo completo. Lleva a la pregunta 3 con el otro lugar.
- **FR-E20**: Para variables sin unidad física el cambio estimado DEBE darse solo en % por década.
- **FR-E21**: Al terminar la revelación DEBE mostrarse «¿Por qué importa para la Tierra?»: 2 o 3 frases sobre la relevancia ambiental del tema en general (no del resultado concreto), sin atribuir causa ni pronosticar, seguidas de «El resultado de arriba dice qué cambió, no por qué cambió». Textos pendientes de revisión por 006. El detective se abre como panel lateral derecho, como el panel de análisis (2026-11-15).

### Key Entities

- **Tema**: pregunta en lenguaje llano asociada a una variable del catálogo.
- **Tipo de lugar**: nombre llano y lista fija de regiones representativas.
- **Caso curado**: par región · variable de «Sorpréndeme».
- **Predicción**: una de cuatro respuestas de la persona; no se guarda ni se envía a ningún sitio.
- **Revelación**: resultado leído del archivo publicado más la frase que lo compara con la predicción.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-E01**: Una persona nueva llega del botón de entrada al análisis completo en menos de 60 segundos y sin instrucciones.
- **SC-E02**: El flujo completo se recorre solo con teclado y solo con tacto en un teléfono.
- **SC-E03**: Las pruebas automáticas cubren el 100 % de las combinaciones predicción × estado × signo, y ninguna frase contiene «no hay cambio», causa o pronóstico.
- **SC-E04**: Objetivo por validar en la prueba con usuarios: 4 de 5 personas explican, tras la revelación, la diferencia entre «los datos apuntan hacia ahí» y «hay evidencia».
- **SC-E05**: Ningún botón de la portada aparece desactivado con «Próximamente».

## Assumptions

- Los tipos de lugar y la lista de «Sorpréndeme» los fijó el equipo con los resultados publicados el 2026-11-14; la interfaz no escribe cifras de esos casos, las lee de los archivos.
- El periodo de la revelación es el completo de cada variable (temperatura 1980–2025, precipitación 2001–2024, GLDAS 2000–2025 cuando se publique).
- La predicción vive solo en memoria mientras dura el flujo; no forma parte del enlace compartible.
- Las variables que se ofrecen salen solo del catálogo (intersección con la lista de temas), sin depender de la lista fija de variables del frontend: 007 la elimina y convierte el id de variable en texto libre (FR-K14). Así 008 compila antes y después de fusionar 007, y las variables de GLDAS aparecen en cuanto el catálogo las publique.
- `content/index.ts` recibe un bloque nuevo de textos sin tocar sus importaciones ni el final del archivo, que es donde 007 añade los suyos.
- La explicación del panel de análisis (006) no cambia; la revelación es un texto aparte.
