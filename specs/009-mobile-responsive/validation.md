# Verificación del incremento móvil

Fecha: 2026-11-15. Rama: `009-mobile-responsive`. Base: `main`, commit `266744c`.

## Resultado

Implementación y comprobaciones automáticas realizadas para T001–T010 y correcciones posteriores T012–T016. La revisión independiente y los nuevos criterios visuales están en [review-agents.md](review-agents.md). Pendientes: aceptación del usuario y T011, prueba en teléfonos físicos. Las casillas de tareas no se firman automáticamente (`metodologia.md` §5).

## Cambios comprobados

- Bienvenida contenida y recorrible, con ejemplos en dos columnas en móvil; en horizontal se coloca junto a las herramientas del globo.
- Cabecera y campos adaptados al ancho, áreas seguras y tipografía de entrada táctil de al menos 16 px.
- Hoja vertical inicialmente en resumen de hasta 35 % del escenario. Ver análisis y Ampliar análisis permiten leer; Ver globo regresa directamente al resumen. Panel lateral también en pantallas de al menos 600 px de ancho y hasta 500 px de alto.
- Grids sin mínimos intrínsecos que ensanchen el panel; tablas desplazables por separado, con nombre accesible y foco de teclado.
- Diálogos con cierre pegado arriba, lectura de métodos con menos padding duplicado y bienvenida/lista en flujo cuando no hay WebGL.
- La cámara conserva el par de regiones al cambiar los insets por orientación o tamaño del panel.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm.cmd test` | Base: 261 pruebas. Tras las nuevas regresiones: 17 archivos, 264 pruebas aprobadas. |
| `npm.cmd run lint` | Aprobado. |
| `npm.cmd run build` | Aprobado; conserva el aviso de bundle grande de Three/globo (~2,39 MB, ~678 kB gzip). |
| `git diff --check` | Sin errores. |
| Scripts de Spec Kit | Resolver de plantillas, setup-plan, setup-tasks y check-prerequisites resuelven correctamente el incremento 009. |
| Calidad y trazabilidad | Checklist de especificación 16/16; 10 FR y 5 SC cubiertos por tareas; criterios explícitos de espacio libre y centro del globo añadidos tras la revisión del usuario. |
| Datos y dependencias de producto | Sin modificaciones en pipeline, web/public, package.json ni package-lock.json. |

## Navegador

Chrome headless instalado localmente, Playwright temporal, servidor Vite y datos reales incluidos. Se probaron entrada táctil simulada y movimiento reducido. No se añadieron dependencias al proyecto para ejecutar esta revisión.

Matriz: 320×568, 360×640, 390×844, 700×500, 844×390 y 1440×900.

En cada tamaño se completó: inicio → ambos ejemplos → análisis → periodo → tabla anual y de variación → comparación → tabla con desplazamiento mediante flecha → métodos hasta el final y cierre → tabla de regiones y cierre → búsqueda de Sonora → precipitación desde 2005 → definición. Se midieron documento, cuerpo y panel en cada estado: sin desbordamiento horizontal fuera de las tablas. No se registraron excepciones de página en estos recorridos.

| Medición | Antes | Después |
|---|---|---|
| Bienvenida 320×568 | Empieza en y=121, fuera del escenario que comienza en y=165 | Bienvenida compacta desde y=442; cabecera de 113 px y franja de 271 px libre para el globo. |
| Comparación 320 px | Cuerpo: 603 px para 320 px disponibles | Cuerpo: 320 px para 320 px; tabla con desplazamiento propio. |
| Comparación 390 px | Cuerpo: 603 px para 390 px disponibles | Cuerpo: 390 px para 390 px. |
| Análisis 844×390 | Cuerpo útil de 94 px de alto | Cuerpo lateral de 329 px de alto. |
| Giro horizontal → vertical con par | Rótulo de Texas en x≈506, fuera de 390 px | Ambos rótulos dentro del ancho visible después de volver a vertical. |

También se ejecutó el recorrido con teclas: Tab al buscador, escribir Sonora, flechas/Intro, Tab al selector de variable, cambiar a precipitación, elegir inicio mediante flechas, abrir comparación mediante teclado y dos Escape para volver al inicio.

Casos adicionales: 14 variables a 390 px, periodo insuficiente, variable sin prueba de comparación publicada, texto ampliado al 200 % a 320 px, ventana reducida a 390×400, error de serie y reintento, ausencia de WebGL a 320×568 y conservación exacta de la URL al girar.

## Evidencias

- [Mediciones del recorrido principal](evidence/browser-results.json): 34 capturas de dimensiones y scroll.
- [Casos adicionales](evidence/edge-results.json): 19 capturas de dimensiones.
- [Encuadre al girar](evidence/camera-rotation.json): posiciones de los dos rótulos en vertical → horizontal → vertical.
- [Comparación vertical](evidence/compare-390x844.png).
- [Comparación horizontal](evidence/compare-844x390.png).

## Límites de la verificación

La emulación no acredita Safari, teclados virtuales reales, barras dinámicas y áreas seguras de un teléfono físico, rendimiento de GPU móvil ni comprensión por personas. La ventana reducida comprueba la adaptación a poca altura, no el comportamiento completo de un teclado iOS. Esos controles siguen en T011 y [quickstart.md](quickstart.md); no se declara validada la puerta de demo del proyecto ni completada la aceptación humana.
