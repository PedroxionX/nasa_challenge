# Feature Specification: Explorador de tendencias por región (MVP)

**Feature Branch**: `001-trend-explorer-mvp` (directorio de la funcionalidad; no se creó rama de git)

**Created**: 2026-11-14

**Status**: Draft — borrador redactado siguiendo las definiciones de `/speckit-specify` y `/speckit-clarify` (Spec Kit v1.4.x); las skills no se invocaron y ninguna persona respondió preguntas.

**Input**: User description: «Siguiente incremento sobre el prototipo del globo: que una persona elija una región y una variable de ciencias de la Tierra, vea su serie temporal en un periodo suficiente y entienda qué cambia, dónde, cuánto y con qué evidencia estadística. Frontend llamativo y fácil de usar como parte del MVP.» (ver `PROMPT_PLAN_PROYECTO_CLAUDE.md` y `README.md`)

## Clarifications

### Session 2026-11-14

Resueltas con el contexto del README y del encargo; ninguna fue respondida por una persona en esta sesión.

- Q: ¿Qué regiones cubre el MVP? → A: Las 84 ya dibujadas (32 estados de México; 50 estados, D.C. y Puerto Rico).
- Q: ¿Cuántas variables? → A: Dos: temperatura del aire cerca de la superficie y precipitación.
- Q: ¿Se conserva «años para ser significativo»? → A: No en el MVP (ver FR-014 y `research.md` D7).
- Q: ¿Qué nivel de significancia? → A: α = 0,05 fijo y visible; intervalos del 95 %.
- Q: ¿Idioma? → A: Español.
- Provisional: reutilización del código del laboratorio (reglas del evento), cuentas Earthdata y formato de la demo. Ver Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Investigar una región (Priority: P1)

Una estudiante abre la herramienta, elige un estado —tocándolo en el globo o buscándolo por nombre— y, con la variable propuesta por defecto, ve la serie anual, la dirección y magnitud del cambio y si la evidencia es suficiente, en una frase que entiende.

**Why this priority**: Es el reto completo en su forma mínima: variable, región, serie y análisis.

**Independent Test**: Con una región y una variable, la persona responde sin ayuda «¿sube o baja?, ¿cuánto por década?, ¿hay evidencia suficiente?».

**Acceptance Scenarios**:

1. **Given** la pantalla inicial, **When** la persona busca «Baja California» y la selecciona, **Then** ve el nombre de la región, la variable activa con su definición, la gráfica anual con su recta de tendencia y un resultado con veredicto, cambio por década con unidades, intervalo del 95 %, valor p y número de años.
2. **Given** un resultado con p ≥ α, **When** se muestra el veredicto, **Then** dice «evidencia insuficiente» y aclara que eso no demuestra ausencia de cambio.
3. **Given** un resultado visible, **When** la persona abre «De dónde salen estos datos», **Then** ve fuente, producto, resolución, cómo se promedió la región, fecha de descarga y transformaciones.
4. **Given** una persona que solo usa teclado, **When** recorre la interfaz, **Then** puede elegir región y variable y leer el resultado sin usar el globo.

---

### User Story 2 - Cambiar el periodo (Priority: P1)

La persona ajusta el año inicial y final para ver si la conclusión se mantiene, y la herramienta le avisa cuando el periodo es demasiado corto.

**Why this priority**: El reto pide un periodo «suficiente»; sin este control no se aprende por qué importa.

**Independent Test**: Cambiar el periodo actualiza gráfica y resultado de forma coherente; un periodo corto produce el estado correcto.

**Acceptance Scenarios**:

1. **Given** un resultado, **When** la persona cambia el periodo a otro con al menos 10 años completos, **Then** la gráfica resalta el tramo analizado y el resultado se recalcula y declara el nuevo periodo.
2. **Given** un periodo con menos de 10 años completos, **When** se aplica, **Then** no se emite veredicto, se muestra «datos insuficientes» y cómo volver al periodo completo.
3. **Given** un periodo distinto del completo, **When** se muestra el resultado, **Then** se indica que la conclusión depende del periodo y se ofrece ver cómo varía con el año inicial.

---

### User Story 3 - Ver dónde cambia (Priority: P2)

Con una variable y un periodo, el globo colorea cada región según su cambio estimado, con leyenda, para comparar de un vistazo y elegir dónde investigar.

**Why this priority**: Responde al «dónde» y aprovecha el impacto visual; depende de que US1 exista.

**Independent Test**: Con la leyenda, la persona señala una región que aumenta, una que disminuye y explica qué significa «sin datos».

**Acceptance Scenarios**:

1. **Given** una variable activa, **When** se muestra el globo, **Then** cada región tiene un color de una escala divergente con leyenda en unidades por década, y las regiones sin datos se distinguen por algo más que el color.
2. **Given** el mapa coloreado, **When** la persona lee la leyenda, **Then** queda dicho que el color es el cambio estimado y no su significancia.
3. **Given** el mapa, **When** la persona pide la vista de tabla, **Then** obtiene la misma información en texto, ordenable.

---

### User Story 4 - Entender y aprender (Priority: P2)

La persona encuentra definiciones sencillas, dos ejemplos guiados y acceso progresivo a los detalles técnicos y sus límites.

**Why this priority**: El público son estudiantes; sin esto el resultado es correcto pero opaco.

**Independent Test**: Tras un ejemplo guiado, la persona explica con sus palabras qué significa el resultado y qué no demuestra.

**Acceptance Scenarios**:

1. **Given** la primera visita, **When** no hay región elegida, **Then** hay una acción inicial evidente y dos ejemplos que se abren con un toque.
2. **Given** un resultado, **When** se abren los detalles técnicos, **Then** aparecen método, supuestos, diagnósticos y resultado del método de contraste.
3. **Given** cualquier explicación, **When** se lee, **Then** separa significancia, magnitud, relevancia ambiental y causalidad.

---

### User Story 5 - Comparar y exportar (Priority: P3)

La persona compara dos regiones con una prueba formal sobre su diferencia y descarga serie y resultado con procedencia. Fuera del primer corte; se conserva como evolución.

**Independent Test**: La comparación nunca afirma «difieren» sin una prueba sobre la diferencia; el archivo descargado incluye procedencia.

**Acceptance Scenarios**:

1. **Given** dos regiones con la misma variable y periodo, **When** se comparan, **Then** el texto distingue «signos opuestos» de «diferencia con evidencia».

### Edge Cases

- Región más pequeña que una celda del producto (D.C., Ciudad de México, Tlaxcala): se informa cuántas celdas la representan.
- Año en curso incompleto o meses con valor de relleno: se excluyen del análisis y se muestran como parciales.
- Serie constante o con muchos empates (precipitación en zonas áridas): estado válido, sin valores p inventados.
- Autocorrelación fuerte: el resultado lo advierte; el valor p ya la considera.
- Un escalón describe mejor los datos que una recta: se advierte que la pendiente resume un cambio neto.
- Falla la carga de datos, de mapas o de texturas; el dispositivo no ofrece gráficos 3D.
- Enlace compartido con región, variable o periodo inexistentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer al menos dos variables de misiones o modelos de ciencias de la Tierra, cada una con nombre llano, definición breve, unidades y origen.
- **FR-002**: Las personas DEBEN poder seleccionar una región tanto en el globo como mediante una búsqueda por nombre equivalente en resultado.
- **FR-003**: El sistema DEBE mostrar datos que representen a la región seleccionada y declarar cómo se obtuvo ese valor regional (promedio de área, número de celdas).
- **FR-004**: El sistema DEBE mostrar la serie temporal de la variable y región elegidas con al menos 30 años disponibles, resaltando el periodo analizado y los años excluidos.
- **FR-005**: Las personas DEBEN poder cambiar el periodo de análisis y volver al periodo completo con una acción.
- **FR-006**: El sistema DEBE estimar dirección y magnitud del cambio por década en las unidades de la variable, con intervalo de confianza del 95 %.
- **FR-007**: El sistema DEBE evaluar la significancia con un método declarado que considere estacionalidad y autocorrelación, mostrando valor p y α.
- **FR-008**: El sistema DEBE clasificar cada análisis en uno de cinco estados: aumento con evidencia, disminución con evidencia, evidencia insuficiente, datos insuficientes, análisis no válido.
- **FR-009**: Cada resultado DEBE ir acompañado de una explicación en lenguaje llano construida solo con cifras calculadas, que distinga significancia, magnitud y causalidad.
- **FR-010**: Cada resultado DEBE exponer su procedencia y transformaciones (constitución II).
- **FR-011**: El sistema DEBE colorear las regiones por cambio estimado con leyenda, y diferenciar tendencia, selección y falta de datos sin depender solo del color.
- **FR-012**: El sistema DEBE ofrecer detalles técnicos de forma progresiva: método, supuestos, diagnósticos y un método de contraste.
- **FR-013**: El sistema DEBE ofrecer una acción inicial evidente y al menos dos ejemplos guiados.
- **FR-014**: El sistema NO DEBE mostrar una estimación de «años para ser significativo» en este incremento.
- **FR-015**: El sistema DEBE presentar estados definidos de carga, vacío, error recuperable, datos insuficientes y gráficos 3D no disponibles, sin bloquear el recorrido por búsqueda.
- **FR-016**: Todo el recorrido principal DEBE completarse con teclado y con tacto, con foco visible y objetivos táctiles de al menos 44 px.
- **FR-017**: El sistema DEBE respetar la preferencia de movimiento reducido y detener la animación que no comunica estado.
- **FR-018**: El estado (región, variable, periodo) DEBE poder compartirse mediante un enlace.
- **FR-019**: El sistema DEBE advertir cuando el mapa compara muchas regiones a la vez y cuando el periodo fue elegido por la persona (riesgo de selección oportunista).
- **FR-020**: La demostración DEBE funcionar sin conexión con datos reales previamente descargados.

### Key Entities *(include if feature involves data)*

- **Región**: unidad territorial con identificador estable (ISO 3166-2), nombre y país.
- **Variable**: magnitud física con definición, unidades, tipo de agregación y producto de origen.
- **Serie**: valores de una variable para una región a lo largo del tiempo, con calidad y procedencia.
- **Resultado de tendencia**: estimación para una serie y un periodo: pendiente, intervalo, valor p, método, diagnósticos y estado.
- **Procedencia**: de dónde y cuándo se obtuvo cada serie y qué se le hizo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Los umbrales de SC-001 a SC-004 son objetivos por validar con usuarios, no resultados obtenidos.

- **SC-001**: Al menos 4 de 5 personas del público objetivo encuentran una región indicada en menos de 30 s sin ayuda.
- **SC-002**: Al menos 4 de 5 cambian de variable en menos de 15 s y de periodo en menos de 30 s, con no más de un error por tarea.
- **SC-003**: Al menos 4 de 5 responden bien tres preguntas sobre un resultado: dirección, magnitud con unidades y si la evidencia es suficiente.
- **SC-004**: Al menos 4 de 5 responden «no» a «¿esto demuestra la causa del cambio?».
- **SC-005**: El 100 % de los resultados mostrados incluye método, periodo, n, unidades, α y procedencia.
- **SC-006**: El motor recupera pendientes conocidas en series de prueba y coincide con una implementación de referencia independiente dentro de la tolerancia definida en el plan.
- **SC-007**: Al menos una serie real coincide con una referencia externa de la misma fuente dentro de la tolerancia definida en el plan.
- **SC-008**: El recorrido completo de US1 y US2 se completa en un teléfono de referencia y solo con teclado en escritorio.
- **SC-009**: Los cuatro objetivos del reto quedan demostrados en un recorrido de menos de 3 minutos con los dos casos de demostración.

## Assumptions

- Escenario ilustrativo, no confirmado: equipo de tres personas y hackatón de 48 horas. El README del laboratorio y fuentes secundarias sitúan el evento el 14 y 15 de noviembre de 2026.
- Las regiones son las 84 del prototipo; ampliar países es evolución posterior.
- Datos mensuales agregados a años completos; el análisis diario, estacional o no lineal queda fuera.
- Se permite reutilizar el código propio del laboratorio. **Provisional**: las reglas del evento no pudieron leerse; si no se permite, el motor se reimplementa a partir de su documentación.
- No hay IA generativa en el MVP; las explicaciones son plantillas deterministas.
- Fuera de alcance: cuestionario de descubrimiento, todas las fuentes del README, mapa 2D, cuentas de usuario, exportación y comparación (US5).
