<!--
Sync Impact Report (borrador para revisión humana; eliminar antes de confirmar el commit)
- Versión: (ninguna) → 1.0.0. Primera constitución del proyecto.
- Origen: sustituye la plantilla sin rellenar que dejó `specify init` (v1.4.1.dev0). Redactada siguiendo la
  plantilla y la definición oficiales de `/speckit-constitution`; la skill NO se invocó.
- Secciones añadidas: 5 principios, Restricciones adicionales, Flujo de trabajo y puertas de calidad, Governance.
- TODO(RATIFICATION_DATE): la fecha indicada es la de redacción; el equipo debe ratificarla o corregirla.
-->

# Trend Detective Constitution

## Core Principles

### I. Rigor científico verificable
- Todo número que vea el usuario (pendiente, intervalo, valor p, veredicto) DEBE salir de un único motor
  estadístico con pruebas automatizadas; la interfaz y cualquier texto generado solo lo presentan.
- Cada resultado DEBE declarar método, unidades, periodo, n, nivel α y estado del análisis.
- El veredicto DEBE distinguir: aumento con evidencia, disminución con evidencia, evidencia insuficiente,
  y datos insuficientes o análisis no válido. «No significativo» NUNCA se redacta como «no hay cambio».
- La significancia NUNCA se presenta como causalidad, magnitud ni pronóstico.
- Las series mensuales NO se tratan como observaciones independientes: la estacionalidad y la
  autocorrelación se tratan y se comunican.

Justificación: el reto evalúa validez; un resultado vistoso pero indefendible resta más que suma.

### II. Procedencia y honestidad de los datos
- Cada serie DEBE conservar fuente, producto y versión, variable exacta, unidades, resolución, fecha de
  consulta, solicitud de origen y transformaciones aplicadas.
- Los datos sintéticos DEBEN estar etiquetados en datos y en pantalla; NUNCA se presentan como observaciones.
- Un promedio regional y el valor de una celda o centroide son cosas distintas y DEBEN nombrarse como tales.
- Si una fuente falla, se muestra el error; NUNCA se sustituye en silencio por otra fuente o por datos sintéticos.

### III. Utilizable sin instrucciones y sin gestos 3D
- El recorrido región → variable → periodo → interpretación DEBE completarse con controles HTML estándar,
  teclado y tacto, sin depender del canvas.
- El significado NUNCA depende solo del color: dirección, selección y falta de datos tienen texto o forma.
- Estados de carga, vacío, error y datos insuficientes son parte del alcance, no pulido.
- La facilidad de uso se valida con personas del público objetivo antes de declararla cumplida.

### IV. Impacto visual al servicio de la lectura
- El atractivo visual es requisito del MVP y tiene presupuesto de trabajo propio.
- Los efectos decorativos (nubes, relieve, luz, rotación, brillo) DEBEN ceder ante la codificación científica:
  si dificultan leer regiones o tendencias, se atenúan o se apagan.
- El movimiento comunica estado; respeta `prefers-reduced-motion` y se pausa cuando no aporta.

### V. Rendimiento medido y simplicidad
- Ninguna cifra de rendimiento se afirma sin medirla en los dispositivos de referencia; hasta entonces es objetivo.
- Se prefiere un pipeline previo con archivos estáticos a un servicio en vivo mientras el alcance lo permita.
  No se añaden bases de datos, colas ni servicios sin una necesidad concreta documentada en el plan.
- El alcance se recorta antes que el rigor: menos variables y regiones, nunca menos honestidad.

## Restricciones adicionales

- Credenciales (Earthdata Login, tokens de NOAA u otros) NUNCA llegan al navegador ni al repositorio.
- La IA generativa, si se usa, solo redacta sobre resultados ya calculados y cita su procedencia.
- Idioma de la interfaz: español. Los términos técnicos se definen la primera vez que aparecen.
- La demo DEBE funcionar sin red a partir de datos reales descargados con procedencia registrada.

## Flujo de trabajo y puertas de calidad

- Flujo Spec Kit por incremento: specify → clarify → plan → checklist → tasks → analyze → implement.
- Puertas antes de implementar: sin `[NEEDS CLARIFICATION]` bloqueantes; cada requisito con tarea y validación.
- Puertas antes de la demo: pruebas del motor en verde; una serie real contrastada con una referencia externa;
  recorrido completo en móvil y con teclado; prueba breve con usuarios registrada.
- Un documento entregado no equivale a una funcionalidad validada: cada artefacto declara su estado.

## Governance

Esta constitución prevalece sobre preferencias individuales. Se enmienda mediante cambio revisado por el
equipo, con versión semántica (MAJOR: se elimina o redefine un principio; MINOR: se añade o amplía;
PATCH: aclaraciones). Toda revisión de plan o tareas comprueba el cumplimiento de los cinco principios;
las excepciones se justifican en `plan.md` (Complexity Tracking).

**Version**: 1.0.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-14
