# Revisión de saturación móvil con agentes

Rama `009-mobile-responsive`. Revisión solicitada por el usuario tras detectar que la bienvenida y la información de estados impedían ver el globo.

## Revisión independiente

Se crearon tres agentes con acceso de lectura al código y capacidad de probar la aplicación en Chrome con Playwright. El agente principal integró las correcciones y ejecutó las comprobaciones finales.

| Agente | Alcance | Hallazgos y revisión |
|---|---|---|
| mobile_visual_audit | Capturas, solapes, centro proyectado, área libre y alternativa sin WebGL | Confirmó saturación; después revisó visualmente las capturas y verificó centro despejado a 320, 390, 430 y 844 px. |
| mobile_flow_audit | Tacto, teclado, panel, consultas, orientación y foco | Encontró scroll heredado al cambiar de región, foco táctil retenido y retorno al resumen que conservaba notas del fondo; también detectó overflow del control de altura. Comprobó los recorridos principales corregidos; el agente principal repitió las últimas correcciones de altura y scroll. |
| mobile_layout_review | Responsabilidades, insets, cámara y riesgo de bucles | Confirmó las causas; revisó signo del offset y comparaciones. Midió ausencia de mutaciones repetidas en reposo y verificó que el fallback no reserva espacio vacío. Identificó el ajuste de Vista global, también corregido. |

## Problemas corregidos

1. Cabecera de tres filas: reducida de 165 a 113 px en teléfono, con selector de variable más ancho.
2. Bienvenida extensa: introducción desplegable y dos ejemplos compactos; conserva toda la explicación al abrirla.
3. Herramientas de 114 px: agrupadas en una fila de 46 px en teléfono; leyenda desplegable y Vista global con icono y nombre accesible.
4. Estado abierto al 60 %: ahora empieza en resumen, limitado a 35 % del escenario y 176 px como máximo con tipografía normal. El análisis completo requiere una acción explícita.
5. Reducción que exigía ampliar primero: Ver globo vuelve directamente al resumen desde lectura media o completa y conserva la selección.
6. Cámara detrás de mensajes: la bienvenida y las herramientas publican sus reservas; el centro se coloca en el espacio libre. Se conserva el encuadre de ambas regiones al comparar y se ajusta Vista global.
7. Cambio de consulta o regreso al resumen con scroll heredado: vuelve al título, sin mostrar primero notas o procedencia del resultado anterior.
8. Foco táctil: elegir una opción libera el campo y tocar X no vuelve a enfocarlo. La navegación mediante teclado conserva o restaura el foco correspondiente.
9. Overflow del control de altura: el botón principal comparte el ancho disponible con Ver globo.

## Medidas finales

Franja vertical continua entre herramientas y tarjeta inferior, medida en el DOM. No representa un porcentaje de píxeles del planeta.

| Pantalla | Inicio libre | Estado libre | Resumen / escenario | Centro tapado |
|---|---:|---:|---:|---|
| 320×568 | 271 px | 238 px | 35 % | No |
| 390×844 | 547 px | 497 px | 24,1 % | No |
| 430×932 | 635 px | 585 px | 21,5 % | No |

Antes, la franja inicial a 320×568 era de 15 px. Al seleccionar, el centro del globo quedaba detrás de las herramientas. La lectura completa sigue cubriendo el mapa únicamente cuando se solicita y permite volver con Ver globo. En horizontal se conserva el panel lateral.

## Verificación final

- Suite: 17 archivos, **264 pruebas aprobadas**, con regresiones nuevas de apertura compacta, retorno directo, scroll, foco táctil/teclado y zona libre de cámara.
- Build y lint aprobados; diff sin errores de espacios. Se conserva el aviso previo de bundle grande del globo.
- Recorrido completo a 320×568, 360×640, 390×844, 700×500, 844×390 y 1440×900: ejemplos, análisis, periodos, tablas, comparación, métodos, búsqueda y alternativa sin WebGL.
- Taps reales simulados a 320, 390 y 430 px: apertura compacta, retorno directo desde ambas alturas, nueva región y variable desde el principio, foco correcto, comparación y orientación.
- Revisión adicional del agente principal: sin overflow en el panel completo en sus tres alturas; después de leer hasta el fondo y tocar Ver globo, scrollTop = 0 a 320 y 390 px.

## Evidencia

- [Inicio anterior a 320 px](evidence/agent-review/before-320-initial.png) y [corregido](evidence/agent-review/after-320-initial.png).
- [Estado corregido a 320 px](evidence/agent-review/after-320-state.png).
- [Inicio a 390 px](evidence/agent-review/after-390-initial.png) y [estado](evidence/agent-review/after-390-state.png).
- [Medidas anteriores](evidence/agent-review/before-visual.json), [medidas finales](evidence/agent-review/after-visual.json) y [recorridos funcionales](evidence/agent-review/functional.json).

La revisión se realizó en navegador con emulación móvil, no en teléfonos físicos. Safari, el teclado virtual real y las barras dinámicas del dispositivo siguen requiriendo T011. La liberación/restauración de foco sí se comprobó. Las casillas de aceptación quedan a cargo del usuario conforme a metodologia.md.
