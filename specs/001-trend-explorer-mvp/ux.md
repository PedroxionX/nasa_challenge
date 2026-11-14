# Experiencia de uso: revisión del prototipo y propuesta

Método: guías de Impeccable v4.9.1 aplicadas a mano (`critique`, `audit`, `shape`, `operate`). **⚠️ Equivale a su modo degradado: un solo contexto, sin detector automático y sin subagentes**; Impeccable no está instalado. Evidencia: recorrido en Chrome 157 headless (ver [research.md](research.md) §1) y `evidence/`. Las secciones 1 a 3 describen **lo que existe**; la 4 en adelante es **propuesta pendiente de validar** con el equipo y con usuarios.

## 1. Crítica del prototipo (heurísticas de Nielsen, 0–4)

| # | Heurística | Nota | Hallazgo |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Carga y selección visibles; si falla una textura, «Cargando la Tierra…» se queda para siempre |
| 2 | Lenguaje del usuario | 2 | Español correcto, pero el panel dice «Pendiente de Sen ×10», «Mann-Kendall · valor p» sin explicar |
| 3 | Control y libertad | 2 | Cierra con ✕ o clic en el océano; Escape no hace nada; en móvil la barra queda inaccesible |
| 4 | Consistencia | 3 | Vocabulario visual coherente |
| 5 | Prevención de errores | 2 | Poco que prevenir todavía |
| 6 | Reconocer antes que recordar | 2 | Nada indica que los estados se pueden tocar hasta pasar el cursor; sin leyenda |
| 7 | Flexibilidad | 1 | Sin enlace compartible ni atajos |
| 8 | Diseño minimalista | 3 | Imagen potente; «Nubes» es un control decorativo en la barra principal |
| 9 | Recuperación de errores | 1 | Sin reintento; sin WebGL la página queda en negro |
| 10 | Ayuda | 1 | Solo el tooltip |
| | **Total** | **19/40** | Franja baja: esperable en un prototipo sin su función central |

**Lo que funciona**: la primera impresión (ver `evidence/desktop-01-inicio.jpg`); la selección por clic y por lista con vuelo de cámara; el foco de teclado visible en todos los controles; cero errores de consola en uso normal.

**Especificidad**: el globo es propio del tema; el panel de vidrio con rótulo en mayúsculas sobre el título y tarjetas punteadas es intercambiable con cualquier panel oscuro. Las guías de Impeccable rechazan el rótulo sobre el título y el vidrio como decoración.

## 2. Auditoría técnica (0–4 por dimensión)

| Dimensión | Nota | Hallazgo principal |
|---|---|---|
| Accesibilidad | 2 | Foco visible y `lang="es"`; faltan Escape, gestión del foco, anuncios y alternativa al canvas |
| Rendimiento | 1 | 2 280 llamadas de dibujo por cuadro sin pausa; 8,2 MB de texturas |
| Tematización | 2 | Hay variables CSS, pero colores sueltos en CSS y en `EarthGlobe.tsx`; «Inter» se declara y no se carga |
| Adaptación a pantallas | 1 | En móvil la barra se apila y el panel la tapa junto con la región |
| Integridad de implementación | 2 | Huecos con texto fijo; un hueco promete algo indefendible |
| **Total** | **8/20** | |

Hallazgos por severidad (**O** = observado en el recorrido, **C** = leído en el código, **P** = pendiente de comprobar):

| Sev. | Hallazgo | Evidencia | Tarea |
|---|---|---|---|
| P0 | Sin WebGL, React desmonta todo y queda una página negra | O: `root` con 0 hijos, excepción sin capturar | T010 |
| P1 | Móvil 390×844: el panel ocupa de y=326 a 832, **cubre el 100 % de la barra** y la región elegida queda centrada detrás de él | O: `movil-04-panel-abierto.jpg` | T018, T026 |
| P1 | Móvil: la barra mide 195×250 px; los seis controles se apilan en columna (efecto de `left: 50%` con ancho automático) | O: `movil-01-inicio.jpg` | T026 |
| P1 | Si falla una textura, la carga no termina ni informa | O | T010 |
| P1 | El bucle de dibujo no se detiene: mismo coste con la rotación pausada (0 cuadros sin dibujar de 80) | O | T023 |
| P1 | `prefers-reduced-motion` no se respeta: rotación y animación de entrada siguen | O | T023 |
| P2 | Escape no cierra el panel; al cerrar con ✕ el foco se pierde en `body`; abrir el panel no anuncia nada | O | T018, T027 |
| P2 | Objetivos táctiles de 34–36 px de alto | O | T026 |
| P2 | En pantallas táctiles el tooltip «Clic para investigar» queda fijo tras tocar | O | T018 |
| P2 | Artefacto de triangulación en Texas: triángulos amarillos fuera del límite, junto a El Paso | O: `desktop-06-texas.jpg`, `desktop-09-700x500.jpg`. Causa sin confirmar (el anillo es simple; probar `polygonCapCurvatureResolution`) | T023 |
| P2 | A 700 px de ancho, marca, barra y panel se superponen | O | T026 |
| P2 | El amarillo de selección ocupa el relleno, que hará falta para los datos | C | T022 |
| P3 | Vértices duplicados en Ohio y Pensilvania; 70 propiedades sin uso en `countries.geojson` | O | T023 |
| — | Contraste del texto gris sobre vidrio encima de nubes blancas | **P**: no medido | T027 |

## 3. Revisión de la escena 3D

**Responsabilidades.** React posee el estado (región, variable, periodo) y los controles HTML. `react-globe.gl` posee renderizador, cámara, controles y bucle. El componente solo posee lo que crea: el material del globo y la malla de nubes. Hoy la malla de nubes se libera bien al desmontar, pero **su textura no**, ni la textura especular ni el material del globo (C: `EarthGlobe.tsx` 75–85 y 110–133); el manual de three.js indica que liberar un material no libera sus texturas. El `requestAnimationFrame` propio de las nubes corre aparte del bucle de la librería.

**Sincronización.** Selección ↔ cámara ↔ panel funciona en escritorio. Falta desplazar el punto de vista para que la región quede en la zona libre cuando hay panel, sobre todo en móvil.

**Coste medido** (portátil con Intel UHD 630, headless; orientativo):

| Métrica | Valor |
|---|---|
| Llamadas de dibujo por cuadro | 2 280 (2 240 en vista móvil) |
| Triángulos por cuadro | ~164 000 (~153 000 sin nubes) |
| Tiempo mediano por cuadro | 50 ms en ambas resoluciones → el límite son las llamadas, no los píxeles |
| Búfer interno | 2880×1800 a 2x; 780×1688 a 3x (la librería limita la densidad a 2) |
| Texturas subidas a GPU | 3 de 4096×2048, 1 de 2048×1024, 1 de 1600×800 (~150 MB estimados con mipmaps) |
| Descarga | 8,2 MB de texturas (5,0 MB solo las nubes) + 0,75 MB de GeoJSON |

**Presupuesto propuesto** (objetivos; no se promete tasa de cuadros sin medir): 0 cuadros dibujados en reposo; ≤ 400 llamadas por cuadro; texturas de 2048 px en móvil; tope de píxeles del búfer como recomienda el manual de three.js. **Dispositivos de referencia** [S]: un Android de gama media de 2022–2023, un iPhone reciente y un portátil con gráfica integrada. **Métricas**: llamadas y triángulos por cuadro, tiempo por cuadro (mediana y percentil 95) al rotar y al seleccionar, tiempo hasta poder interactuar en red 4G simulada, megabytes transferidos.

**Medidas** (tarea T023): fronteras de países en una sola geometría de líneas o integradas en la textura, en vez de 177 polígonos; `pauseAnimation()` cuando no hay rotación, transición ni puntero; nubes apagadas al mostrar datos; texturas ligeras en móvil; liberar texturas y material propios al desmontar.

**Decoración frente a ciencia.** Con datos visibles: nubes apagadas, rotación detenida, relleno reservado a la escala de datos, selección marcada con contorno y elevación. Atmósfera y relieve se conservan porque no compiten con el color de las regiones.

## 4. Brief de diseño (formato `shape`) — propuesta

Sin persona que respondiera en la sesión: los supuestos van marcados.

1. **Quién y para qué**: estudiantes de bachillerato y universidad, y público con base científica, que quieren saber si algo cambió donde viven o en un lugar que les interesa. Modo **Operate** para elegir y analizar; modo **Read** para definiciones y métodos.
2. **Resultado**: en menos de un minuto, una frase veraz («En Baja California la temperatura del aire subió X °C por década entre 1981 y 2025; la evidencia es fuerte») con su gráfica y su procedencia.
3. **Dirección**: «observatorio». El globo es el escenario; el análisis vive en una superficie **opaca** y sobria, con una sola familia tipográfica y cifras tabulares. El gesto propio: la frase del resultado se escribe con las mismas cifras que la gráfica resalta, y el globo se tiñe con la misma escala.
4. **Alcance**: una pantalla y una hoja de métodos. No se toca la lógica del globo más allá de `ux.md` §3. Antiobjetivos: presentación obligatoria antes de investigar; tarjetas de métricas genéricas; jerga sin definir.
5. **Estados**: primera visita, cargando, resultado, evidencia insuficiente, datos insuficientes, sin datos, error con reintento, sin WebGL.
6. **Interacción**: ver §5 a §7.
7. **Decisiones abiertas**: nombre del producto («Trend Detective» es el del prototipo), familia tipográfica [S: la del sistema o Inter autoalojada], logotipos o créditos obligatorios del evento.

**Orden región / variable.** La variable llega elegida (temperatura) para que el globo ya muestre algo con sentido; la **primera acción de la persona es elegir región**. Cambiar de variable es un control de dos opciones siempre visible. Justificación: una sola decisión inicial, y el mapa necesita una variable para colorearse.

**Papel del globo.** Navegación principal y mapa de resultados, con buscador equivalente (decisión D9 en `research.md`).

## 5. Esquemas

Escritorio (≥ 1024 px):

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Trend Detective   [Buscar un estado… ▾]  (Temperatura | Precipitación)  [?]  │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │ Baja California · México     │
│                                               │ Temperatura del aire  ⓘ      │
│                 GLOBO                         │ ┌──────────────────────────┐ │
│        (regiones teñidas por                  │ │  gráfica anual + recta   │ │
│         cambio por década)                    │ │  + banda del intervalo   │ │
│                                               │ └──────────────────────────┘ │
│                                               │ Periodo  [1981]━━━━━━[2025]  │
│                                               │ ↗ Sube  +X,XX °C por década  │
│                                               │ IC 95 %: de A a B            │
│ ┌ Cambio por década (°C) ───────────┐         │ Evidencia: fuerte (p < 0,001)│
│ │ ▇ baja  ▇  ▇ casi igual  ▇  ▇ sube│         │ 45 años completos            │
│ │ ▨ sin datos · contorno = elegida  │         │ «En palabras»  …             │
│ │ El color es el cambio estimado,   │         │ ▸ Detalles técnicos          │
│ │ no su significancia.  [Ver tabla] │         │ ▸ De dónde salen estos datos │
│ └───────────────────────────────────┘         │                              │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

Móvil (< 640 px): el globo ocupa la mitad superior y **la cámara se desplaza para centrar la región en ella**; el análisis es una hoja inferior con tres alturas (asomada, media, completa).

```text
┌────────────────────────┐
│ [Buscar un estado… ▾]  │
│ (Temperatura|Precipit.)│
│                        │
│         GLOBO          │
│   región centrada aquí │
│ [leyenda compacta ▸]   │
├──────── ▂▂▂ ───────────┤  ← hoja arrastrable
│ Baja California        │
│ ↗ Sube +X,XX °C/década │
│ Evidencia: fuerte      │
│ ┌────────────────────┐ │
│ │      gráfica       │ │
│ └────────────────────┘ │
│ Periodo [1981]━━[2025] │
│ ▸ En palabras          │
│ ▸ Detalles · ▸ Datos   │
└────────────────────────┘
```

## 6. Componentes, jerarquía y movimiento

- **Jerarquía del panel**: 1) veredicto y cambio por década; 2) gráfica; 3) evidencia y años; 4) frase en palabras; 5) desplegables.
- **Veredicto**: icono dibujado (no emoji) + palabra + color; nunca solo color. Cuatro variantes con el mismo molde.
- **Gráfica**: puntos anuales, recta de Sen, banda del intervalo, años excluidos como huecos rotulados, año parcial en trazo discontinuo, tramo fuera del periodo atenuado. Con alternativa «Ver como tabla».
- **Color**: escala divergente de cinco clases apta para daltonismo (naranja = sube, azul verdoso = baja, neutro = casi igual), sin datos con trama y etiqueta, selección con contorno claro y elevación. Paleta exacta por definir y comprobar el contraste (T011).
- **Tipografía**: una familia; escala fija en `rem`; cifras tabulares.
- **Movimiento**: 150–250 ms; vuelo de cámara al elegir; la gráfica se actualiza sin coreografía; con movimiento reducido, cambios instantáneos y sin rotación.
- **Carga**: esqueletos con la forma del contenido, no un indicador giratorio en mitad del panel.

## 7. Textos de ejemplo

| Lugar | Texto |
|---|---|
| Primera visita | «Elige un estado para ver cómo ha cambiado su clima desde 1981.» · botones «Ver un ejemplo: Baja California» y «Ver un ejemplo: [segundo caso]» |
| Buscador | «Buscar un estado…» · sin coincidencias: «No hay ningún estado con ese nombre. Prueba con otro o tócalo en el globo.» |
| Definición | «Temperatura del aire: la que mediría un termómetro a 2 m del suelo. Aquí viene de MERRA-2, un modelo de la NASA que combina observaciones; no es una estación.» |
| Aumento con evidencia | «Sube. +X,XX °C por década (entre A y B). La evidencia es fuerte: un patrón así sería muy raro si no hubiera tendencia.» |
| Evidencia insuficiente | «Sin evidencia suficiente. La estimación es +X,XX °C por década, pero podría ser cero. Esto no demuestra que no haya cambio.» |
| Datos insuficientes | «Faltan años. Con menos de 10 años completos no calculamos tendencia.» · «Usar todo el periodo» |
| Periodo cambiado | «Estás viendo 2000–2025. El resultado depende del periodo.» · «Ver cómo cambia según el año inicial» |
| Qué no significa | «Una tendencia no dice por qué ocurre ni si continuará.» |
| Región pequeña | «Este estado es más pequeño que una celda del modelo (~50 km): el valor representa también a sus vecinos.» |
| Leyenda | «El color es el cambio estimado por década, no su significancia. Con 84 estados, algunos destacarán por azar.» |
| Error de datos | «No pudimos cargar los datos de este estado.» · «Reintentar» |
| Sin WebGL | «Tu navegador no puede mostrar el globo. Puedes seguir con el buscador y la tabla.» |

Casos de demostración (sin anticipar resultados): **Baja California · temperatura** y un segundo caso que se elegirá con datos a la vista para mostrar «evidencia insuficiente» o una dirección opuesta.

## 8. Prueba con usuarios

Cinco personas del público objetivo, 10 minutos cada una, sin explicación previa, en su propio teléfono o en el portátil del equipo.

| Tarea | Éxito | Tiempo objetivo | Errores |
|---|---|---|---|
| «Encuentra Sonora» | Panel de Sonora abierto | ≤ 30 s | ≤ 1 |
| «Mira la precipitación» | Variable cambiada | ≤ 15 s | ≤ 1 |
| «Analiza solo desde el año 2000» | Periodo aplicado | ≤ 30 s | ≤ 1 |
| «Cuéntame qué ves» | Dirección, magnitud con unidades y suficiencia de la evidencia correctas; responde «no» a si demuestra la causa | — | — |

Se registra éxito, tiempo, errores y frases literales. Criterio: 4 de 5 por tarea (SC-001 a SC-004). Son **objetivos por validar**, no resultados.

## 9. Tareas futuras con Impeccable

Cuando esté instalado: `init` (confirmar el contexto de producto con el equipo), `critique` y `audit` reales sobre lo construido, y `adapt`, `optimize`, `harden`, `animate`, `polish` como ejecución de T023, T026 y T027. Ninguno se ejecutó sobre la aplicación en esta sesión.
