# Validación del incremento móvil

## Preparación y comprobaciones

Desde `web/`:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

Abrir `http://127.0.0.1:5173`. Usar los datos reales incluidos; no requiere regenerar el pipeline.

## Matriz de aceptación

Repetir a 320×568, 360×640, 390×844, 700×500, 844×390 y 1440×900:

1. Inicio: confirmar globo libre y bienvenida compacta; desplegar la introducción para leer explicación y aviso. Elegir ambos ejemplos sin forzar clics a elementos tapados.
2. Buscar Sonora con teclado y con tacto; cambiar a precipitación y elegir Desde 2005. Mostrar definición y cerrarla.
3. Abrir Baja California; confirmar resumen compacto. Usar Ver análisis → Ampliar análisis, recorrer hasta procedencia y volver directamente con Ver globo. El resumen debe volver a mostrar su título, aunque se haya leído hasta el final.
4. Comparar con Texas; revisar resultado, periodo, las dos gráficas y tablas. Desplazar la tabla horizontalmente sin mover el panel entero; salir de comparación.
5. Abrir Métodos, recorrer hasta el final y cerrar sin volver al principio. Repetir con Ver tabla del globo; elegir una región.
6. Verificar `scrollWidth <= clientWidth + 1` del documento y del cuerpo del panel en inicio, análisis y comparación. Las tablas pueden exceder su contenedor y deben poder desplazarse.
7. A 320×568, 390×844 y 430×932 medir una franja libre continua de al menos 180 px en inicio y al seleccionar estado; el centro del globo queda fuera de tarjetas y herramientas. El resumen ocupa como máximo el 35 % del escenario.
8. Tras hacer scroll en un estado, buscar otro o cambiar de variable: el nuevo resultado comienza desde arriba. Tocar una opción del buscador libera el campo; seleccionarla por teclado conserva el foco.

## Escenarios adicionales

- Conservar todos los parámetros URL al girar 390×844 ↔ 844×390 y tras ampliar el panel.
- Con teclado: buscar, seleccionar, cambiar variable/periodo, comparar y salir con Escape. Las tablas enfocadas permiten desplazamiento sin perder su nombre accesible.
- Sin WebGL: inicio, tabla, selección y resultado disponibles; bienvenida y tabla no se tapan.
- Movimiento reducido; texto ampliado al 200 %; errores de carga con reintento, periodo insuficiente y comparación sin prueba publicada.
- En teléfonos físicos: teclado virtual abierto en la búsqueda, barras del navegador, áreas seguras, rotación y Safari/Chrome. Registrar dispositivo y resultado; la emulación no acredita estas comprobaciones.

## Resultados

La ejecución automática y sus límites se registran en `validation.md`. Las casillas de `tasks.md` se reservan a la aceptación del usuario, según la metodología del repositorio.
