# Prueba con usuarios

Feature 006 · T006 (y T008) · Basada en [ux.md §8](../specs/001-trend-explorer-mvp/ux.md). Criterio SC-C01: **4 de 5 personas** completan cada tarea y responden bien sobre dirección, magnitud, evidencia y causalidad. Son **objetivos por validar**, no resultados.

> **Estado: protocolo listo, sesiones sin realizar.** Este archivo no registra todavía ningún resultado. Las tablas de §4 se llenan durante las sesiones; no se rellenan de memoria ni se estiman.

## 1. Requisitos antes de la primera sesión

- [ ] 004 (panel) y 005 (globo) integrados en `main` (requisito de T006).
- [x] Datos **reales** publicados por 003 (2026-11-14, GES DISC: MERRA-2 e IMERG). Con datos sintéticos la tarea 4 no sirve: el aviso «Datos de ejemplo sintéticos» cambia lo que la persona entiende. Si hay que probar antes, se anota como sesión piloto y no cuenta para SC-C01.
- [ ] Una versión fija: anotar aquí el commit probado → `________`
- [ ] Cronómetro y esta hoja (impresa o en otro dispositivo).

## 2. Participantes

Cinco personas del público objetivo (mínimo tres si no hay tiempo; se declara). No del equipo, sin explicación previa de la aplicación. 10 minutos cada una, en su propio teléfono o en el portátil del equipo.

Lo que **no** se registra: nombre, correo, teléfono ni nada que identifique a la persona. Solo un código (P1…P5) y el perfil general.

| Código | Perfil (p. ej. «estudiante de biología», «docente de secundaria») | Dispositivo | Fecha |
|---|---|---|---|
| P1 | | | |
| P2 | | | |
| P3 | | | |
| P4 | | | |
| P5 | | | |

## 3. Guion para quien modera (texto exacto)

**Al empezar:**

> «Gracias por ayudarnos. Vamos a probar la aplicación, no a ti: si algo cuesta, es un problema nuestro. Te pediré cuatro cosas. Piensa en voz alta, di lo que buscas y lo que esperas que pase. No te voy a ayudar mientras lo haces, pero al final te contesto todo. No guardamos tu nombre. ¿Empezamos?»

Se abre la aplicación en la pantalla inicial (sin región elegida) y se lee cada tarea **una vez**, sin señalar la pantalla. El cronómetro arranca al terminar de leerla.

| # | Se dice | Éxito | Tiempo objetivo | Errores máx. |
|---|---|---|---|---|
| 1 | «Encuentra Sonora.» | Panel de Sonora abierto | ≤ 30 s | ≤ 1 |
| 2 | «Mira la precipitación.» | Variable cambiada a precipitación | ≤ 15 s | ≤ 1 |
| 3 | «Analiza solo desde el año 2005.» | Periodo 2005–último año aplicado | ≤ 30 s | ≤ 1 |
| 4 | «Cuéntame qué ves.» | Ver §3.1 | — | — |

**Desviación declarada respecto a ux.md §8:** allí la tarea 3 dice «desde el año 2000», pero la precipitación empieza en **2001** (catálogo, `first_year`), así que tras la tarea 2 esa tarea es imposible. Se usa **2005** (la precipitación cubre 2001–2024). Se pide a quien lleva 001 corregir ux.md.

**Qué cuenta como error:** cada toque o acción que aleja de la meta (abrir otro estado, abrir «Métodos» buscando el periodo, cambiar a la variable equivocada…). Un error no termina la tarea. Si a los 2 minutos no lo logra, se marca «no completada» y se pasa a la siguiente dejando la aplicación en el estado esperado.

### 3.1 Tarea 4: preguntas de comprensión

Primero se deja hablar sin interrumpir («Cuéntame qué ves»). Después, solo lo que no haya dicho, con estas preguntas exactas:

| Aspecto | Pregunta | Correcta si… |
|---|---|---|
| Dirección | «¿La precipitación sube, baja o no se puede decir?» | Coincide con el veredicto en pantalla; con «Sin evidencia suficiente», dice que no se puede decir (no «no cambia») |

Nota: con los datos del 2026-11-14, la precipitación de Sonora sale «Sin evidencia suficiente» en todo el periodo. Es justo el caso que más fácil se lee mal, así que la pregunta de dirección pone a prueba si se entiende que no es «no cambia». Si al aplicar 2005 el veredicto cambia, se evalúa contra lo que muestre la pantalla.
| Magnitud | «¿Cuánto?» | Da la cifra **con su unidad** y «por década» (o, en «Sin evidencia suficiente», dice que no hay una cifra que afirmar) |
| Evidencia | «¿Qué tan seguros podemos estar?» | Distingue si hay o no evidencia de tendencia, en sus palabras |
| Causalidad | «¿Esto demuestra que lo causa el cambio climático?» | Responde **no** (o «no lo dice») |

## 4. Registro

Se anotan **frases literales** entre comillas. Tiempo en segundos.

### Tareas 1–3

| Código | T1 éxito | T1 s | T1 err. | T2 éxito | T2 s | T2 err. | T3 éxito | T3 s | T3 err. |
|---|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | | |
| P2 | | | | | | | | | |
| P3 | | | | | | | | | |
| P4 | | | | | | | | | |
| P5 | | | | | | | | | |
| **Total ✓ / 5** | | | | | | | | | |

### Tarea 4

| Código | Veredicto en pantalla | Dirección ✓ | Magnitud ✓ | Evidencia ✓ | Causalidad ✓ | Frases literales |
|---|---|---|---|---|---|---|
| P1 | | | | | | |
| P2 | | | | | | |
| P3 | | | | | | |
| P4 | | | | | | |
| P5 | | | | | | |
| **Total ✓ / 5** | | | | | | |

### Observaciones

Dónde dudó, qué buscó y no encontró, qué texto leyó en voz alta, qué entendió mal.

- P1:
- P2:
- P3:
- P4:
- P5:

## 5. Resultado frente a SC-C01

Se llena al terminar las cinco sesiones.

| Tarea / aspecto | ✓ / 5 | ¿Cumple 4 de 5? | Corrección o declaración |
|---|---|---|---|
| T1 Encontrar Sonora | | | |
| T2 Cambiar variable | | | |
| T3 Aplicar periodo | | | |
| T4 Dirección | | | |
| T4 Magnitud | | | |
| T4 Evidencia | | | |
| T4 Causalidad | | | |

**Regla (US4):** cada fila por debajo de 4/5 tiene una corrección o queda declarada como límite conocido.

## 6. Peticiones de corrección

006 solo cambia textos (`web/src/content/**`, `web/src/features/guide/**`). Lo demás se pide a su dueño.

| # | Qué falló (con frase literal) | Dueño | Petición | Estado |
|---|---|---|---|---|
| | | | | |

Dueños: buscador y selectores → 004 (`features/query`) · panel y gráfica → 004 (`features/analysis`) · globo → 005 · armazón, estado y URL → 002 · datos → 003 · textos → 006 (T008).

## 7. Ajustes de texto tras la prueba (T008)

Cada cambio de texto hecho por la prueba, con la fila de §5 que lo motiva.

| Texto (clave en `content/index.ts`) | Antes | Después | Motivo |
|---|---|---|---|
| | | | |
