# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Principales**: estudiantes de bachillerato y universidad, y público general con algo de formación científica. Muchos llegan desde el teléfono, sin explicación previa.
- **Situación**: quieren saber si algo cambió en el clima del estado donde viven o de un lugar que les interesa.
- **Trabajo por hacer**: responder en segundos tres preguntas: ¿sube, baja o no se puede decir?, ¿cuánto?, ¿qué tan seguro?
- **Otros lectores**: el jurado de NASA Space Apps 2026, que evalúa el rigor científico y la claridad.

## Product Purpose

«Trend Detective» responde al reto *Earth System Trend Detective* (NASA Space Apps 2026). Muestra, por estado de México y de Estados Unidos (84 regiones), la tendencia de 14 variables del sistema Tierra (temperatura, precipitación, humedad del suelo, ozono…) sobre un globo 3D, con su serie anual, la pendiente por década, su intervalo y si hay evidencia estadística de tendencia.

Éxito (docs/prueba-usuarios.md, SC-C01): 4 de 5 personas encuentran un estado, cambian de variable, cambian de periodo y explican bien dirección, magnitud, evidencia y que una tendencia no demuestra causa. Las sesiones con usuarios aún no se han realizado.

## Positioning

Veredictos estadísticos honestos y trazables: toda cifra la calcula el pipeline (Theil-Sen, Mann-Kendall corregido por autocorrelación, intervalo de Sen) y la interfaz solo la presenta. «Sin evidencia suficiente» nunca se convierte en «no hay cambio»; cada resultado lleva su periodo, n, método y procedencia (producto, versión, DOI, fecha de consulta).

## Operating Context

- Una sola pantalla: cabecera (buscador de estado, variable, métodos), globo con leyenda y tabla alternativa, y panel de análisis (escritorio) u hoja inferior de tres alturas (móvil, < 900 px).
- Flujos: elegir estado (globo, buscador o tabla) → leer veredicto → cambiar variable → cambiar periodo → comparar con otro estado → leer métodos y fuentes.
- Todo el estado vive en la URL (`var`, `from`, `to`, `region`, `vs`): un enlace reproduce la vista.
- Sitio estático en Vercel; los datos son archivos JSON en `web/public/data/trends/` generados por `pipeline/`.
- Sin WebGL, la app sigue funcionando con el buscador y la tabla.

## Capabilities and Constraints

- El cliente no calcula estadística: solo elige filas de los archivos y las formatea.
- El contrato de datos (`specs/001-trend-explorer-mvp/contracts/`) y los archivos de `web/public/data/` no se tocan desde la interfaz.
- Reglas de texto científico (`web/src/content/index.ts`): nunca «no hay cambio» para evidencia insuficiente; nunca causalidad ni pronóstico; nunca «X años para ser significativo»; solo cifras del archivo.
- Formato de cifras: punto decimal, sin separador de miles, signo explícito en pendientes y menos tipográfico (U+2212).
- React 19 + Vite + TypeScript, d3-scale/d3-shape para las gráficas, react-globe.gl para el globo. Sin frameworks de CSS ni librerías de componentes.
- Las carpetas de `web/src/features/` no se importan entre sí; lo compartido vive en `web/src/lib/`, `web/src/content/` y `web/src/styles/`.

## Brand Commitments

- Nombre: «Trend Detective».
- Idioma de la interfaz: **inglés** (decisión del 2026-11-15; antes era español). La documentación del repositorio sigue en español. Los nombres propios de los estados mexicanos se conservan; los textos de procedencia que el pipeline registra en español se muestran tal cual.
- Paleta «Ocaso» (docs/paleta.md): violeta = baja, ámbar = sube; el acento de interfaz no se confunde con ningún color de dato; el veredicto nunca depende solo del color (icono + palabra).
- Paneles opacos, sin vidrio ni degradados decorativos. El globo es el protagonista visual.
- Tipografía: Inter autoalojada (latino, 400/500/700), cifras tabulares.
- Voz: llana, directa y prudente; define cada término técnico la primera vez que aparece.

## Evidence on Hand

- Datos reales de NASA GES DISC (MERRA-2, GPM IMERG, GLDAS), publicados el 2026-11-14 en `web/public/data/trends/`.
- Casos de demostración elegidos con datos a la vista (docs/demo.md): Baja California · temperatura (sin evidencia suficiente; el veredicto cambia según el año inicial) y Chihuahua · temperatura (sube con evidencia).
- Revisión de experiencia previa en `specs/001-trend-explorer-mvp/ux.md`.
- No hay resultados de pruebas con usuarios, testimonios ni métricas de uso: no se inventan.

## Product Principles

1. **El veredicto primero, y honesto.** Dirección, magnitud y evidencia se leen en ese orden; la interfaz nunca afirma más que el archivo.
2. **Cada dato en un solo lugar.** Periodo, n, unidades, método y procedencia aparecen una vez, donde se necesitan.
3. **El globo es el escenario.** Los controles y el análisis lo acompañan sin taparlo más de lo necesario.
4. **Un solo sistema.** El mismo patrón para cerrar, elegir estado, elegir periodo y leer una gráfica en toda la aplicación.
5. **Funciona para todos.** Teléfono, teclado, lector de pantalla, movimiento reducido y navegadores sin WebGL.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste mínimo 4,5:1 (lo mide `web/src/styles/tokens.test.ts`), objetivos táctiles de 44 px, foco visible, navegación completa con teclado, `aria-live` para los resultados, `prefers-reduced-motion`, tablas alternativas a cada gráfica y al mapa, y paleta comprobada con simulación de daltonismo.
