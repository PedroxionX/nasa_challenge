# Sistema visual de TrendLens Lab

Rediseño aplicando las guías de [Impeccable](https://impeccable.style/) (`distill`, `quieter`, `layout`, `craft-floor`)
en **modo Operate**: es una herramienta de trabajo, así que la interfaz debe desaparecer detrás de la tarea.
Las guías se leyeron directamente del repositorio público `pbakaus/impeccable`. **No** se instaló la skill ni se
ejecutó su binario. Para tener sus comandos en Claude Code: `/plugin marketplace add pbakaus/impeccable`.

## Principio
Cada pantalla responde **una** pregunta arriba, con su cifra principal. El detalle (métodos, diagnósticos,
procedencia) va detrás de desplegables. Nada se dice dos veces en la misma vista.

| Pantalla | Pregunta | Lo primero que se ve |
|---|---|---|
| Laboratorio | ¿Qué datos tengo y están completos? | Tabla de datos por sitio |
| Análisis | ¿Cambió cada sitio y cuánto? | Tabla resumen A/B → veredicto + cifras del sitio elegido |
| Comparación | ¿Cambian en sentidos distintos y difieren de verdad? | Frase de respuesta + gráfico de pendientes con IC |
| Métodos y fuentes | ¿Cómo se calculó y de dónde vienen los datos? | Pestañas (modo Read) |

## Tokens
| Rol | Valor | Uso |
|---|---|---|
| Fondo | `#0E151E` | Página y gráficos (los gráficos no van sobre tarjetas) |
| Panel | `#131C26` | Barra lateral y controles |
| Línea | `rgba(230,237,243,0.09)` | Bordes de 1 px |
| Texto | `#E3E9EF` / `#AEB9C4` / `#8794A1` | Principal / secundario / atenuado |
| Acento | `#57A9B5` | Solo acción, selección y foco (saturación reducida) |
| Sitio A / B / A − B | `#3987e5` / `#d95926` / `#9085e9` | Solo identidad de series. Paleta validada (CVD, contraste) contra el fondo |
| Sintético | `#E2B04A` | Solo la marca *DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN* |

Espaciado en múltiplos de 4 px (`--tl-s1…s8`): grupos compactos y separación generosa, con más aire arriba de
un título que debajo.

## Tipografía
Una familia (sans del sistema), cuatro tamaños y dos pesos:
- título de pantalla: 1.6 rem / 600;
- sección: 1.1 rem / 600;
- texto: ~0.95 rem;
- notas: 0.82–0.9 rem.

La prosa tiene un ancho máximo de **75 caracteres**. Las cifras usan numerales tabulares.

## Reglas
- Sin etiqueta sobre los títulos, sin numeración de secciones, sin chips de pasos, sin franjas decorativas, sin
  bordes de color a la izquierda, sin tarjetas dentro de tarjetas y sin tarjetas de métricas en fila.
- Iconos solo de Material Symbols (los de Streamlit), nunca emoji ni glifos Unicode.
- Una sola acción siguiente por pantalla (enlace) y la exportación agrupada en un menú.
- Avisos: solo los que cambian la lectura del resultado (nivel *warning*/*critical*). Las notas informativas van en
  «Métodos y diagnósticos».
- Gráficos: fondo transparente, leyenda debajo del gráfico, etiquetas directas A/B en las rectas y una etiqueta
  ámbar legible dentro de la imagen cuando los datos son sintéticos.
- Superficies del navegador tematizadas: color de selección, cursor de texto y anillo de foco con el acento.
- Barra lateral abierta en escritorio y cerrada en móvil (`initial_sidebar_state="auto"`).

## Verificación
Revisado con capturas reales (Chrome sin interfaz, conectado por DevTools) a 1440 px y a 390 px, en los tres modos
(sintético, NASA POWER y CSV). La prueba de AppTest sigue cubriendo cada pantalla sin excepciones.
