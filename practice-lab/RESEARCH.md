# Fase 1 — Investigación y alcance (TrendLens Lab, material de práctica)

> Fecha de la investigación: **2026-11-06**. Este documento separa lo **VERIFICADO** (con fuente consultada)
> de lo **NO VERIFICADO** y de nuestras **RECOMENDACIONES**. Debe revisarse otra vez el 13 de noviembre,
> cuando se publiquen los recursos adicionales del desafío.

## A. Desafío actual — "Be An Earth System Trend Detective!"

### Estado de verificación

| Elemento | Estado | Fuente / nota |
|---|---|---|
| Página oficial del desafío | **NO VERIFICADO** | `spaceappschallenge.org` respondió con un certificado TLS no confiable (`SEC_E_UNTRUSTED_ROOT`, "unable to get local issuer certificate") desde dos clientes distintos el 2026-11-06. No pudimos leer el texto oficial. |
| Fechas del hackathon (14–15 nov 2026) | Verificado de forma secundaria | Anuncios de eventos locales en buscadores (p. ej. therecursive.com, romaniajournal.ro). |
| Nivel: intermedio/avanzado; identificar cambios ambientales con datos de NASA | Verificado de forma secundaria | Listados de eventos; **no** es el texto oficial. |
| Objetivos 1–8 (seleccionar variable, obtener históricos, ubicaciones, series, tendencias +/−/no concluyentes, magnitud, significancia, explicación) | **Tomados del brief del equipo** | Coinciden con los listados secundarios, pero deben compararse palabra por palabra con la página oficial. |
| Tendencias opuestas entre dos regiones | **Tomado del brief del equipo** | Confirmar si es un requisito o una sugerencia. |
| Recursos adicionales el 13 de noviembre | **Tomado del brief del equipo** | Ver `OFFICIAL_RESOURCES_READINESS.md`. |

**Acción pendiente:** abrir la página oficial desde un navegador con el almacén de certificados actualizado
y llenar la tabla "Requisitos explícitos" de abajo con citas literales.

### Requisitos (según el brief; marcar ✔ al verificar contra la página oficial)

| # | Requisito | Verificado | Cómo lo ejercita el laboratorio |
|---|---|---|---|
| R1 | Seleccionar variables de misiones o modelos | ☐ | T2M y PRECTOTCORR de NASA POWER (MERRA-2) |
| R2 | Obtener datos históricos | ☐ | Conector NASA POWER mensual, de 1981 al último año completo |
| R3 | Estudiar distintas ubicaciones | ☐ | Dos sitios: lugares predefinidos o coordenadas |
| R4 | Representar series temporales | ☐ | Gráficas interactivas mensual y anual |
| R5 | Detectar tendencias +, − o no concluyentes | ☐ | Mann-Kendall (+ Hamed-Rao) con veredicto de tres estados |
| R6 | Cuantificar magnitud y velocidad | ☐ | Theil-Sen y MCO por año y por década, cambio total |
| R7 | Evaluar significancia | ☐ | Valores p, IC 95 %, advertencias de supuestos |
| R8 | Explicar científicamente | ☐ | Plantillas deterministas que solo usan cifras calculadas |
| R9 | Tendencias opuestas entre regiones | ☐ | Opposite Trends Explorer con prueba sobre la serie de diferencias |

### Errores de interpretación probables (para evitarlos en la competencia)

1. Tratar "no significativa" como "no hay tendencia". La ausencia de evidencia no demuestra que no haya cambio. El laboratorio calcula la **detectabilidad** (Weatherhead et al., 1998).
2. Concluir que dos tendencias "difieren" solo porque sus signos son opuestos. Hace falta una prueba sobre la diferencia.
3. Aplicar Mann-Kendall o MCO a series **mensuales** sin tratar la estacionalidad ni la autocorrelación.
4. Presentar el valor de un **punto de cuadrícula** (½° × ⅝° en MERRA-2) como promedio de una ciudad o un país.
5. Sumar tasas de precipitación (mm/día) como si fueran acumulados, o promediarlas sin ponderar por los días del mes.
6. Elegir el período a conveniencia (cherry-picking). El laboratorio muestra la **sensibilidad de la pendiente al año inicial**.
7. Atribuir causas ("por el cambio climático", "por la urbanización") a partir de una tendencia estadística.
8. Mezclar productos distintos (MERRA-2 / GEOS-IT / IMERG) sin decirlo.

### Elementos opcionales que podrían diferenciar (recomendación, no requisito)

- Explicar la incertidumbre en lenguaje llano ("¿cuántos años harían falta para detectar esto?").
- Comprobar la robustez de cada conclusión: período, método y autocorrelación.
- Mostrar la procedencia (URL, fecha de consulta, producto, versión de la API) junto a cada resultado.
- Contar una historia local (Baja California) apoyada en una comparación global.

## B. Antecedentes de Space Apps

Fuentes verificadas: páginas de ganadores globales de NASA
([2024](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/),
[2025](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)).
**No revisamos el código** de ningún proyecto. Las descripciones vienen solo de esas páginas, y las "lecciones" son nuestra interpretación.

| Proyecto | Premio (verificado) | Qué dice NASA (resumen) | Lección útil para nosotros (recomendación) |
|---|---|---|---|
| **Waterwise** — GaamaRamma (2024) | Best Use of Data | Herramienta para que agricultores gestionen la disponibilidad de agua (sequía, plagas, enfermedades). | Anclar los datos a una **decisión de un usuario concreto**. Una tendencia vale más si responde "¿qué cambió donde yo vivo?". |
| **Connected Earth Museum** (2024) | Art & Technology | Museo virtual inmersivo con un anfitrión de IA y visualizaciones 2D/3D, incluidas series temporales de temperatura y de incendios. | Un **recorrido guiado y secuencial** en lugar de gráficas sueltas. Nosotros usamos un recorrido determinista, sin IA. |
| **SkySense** — Twisters, México (2025) | Best Use of Technology | Web app con datos de observación de la Tierra y análisis con IA. Pronósticos hiperlocales personalizados y evaluación de riesgo. | Encuadre **hiperlocal** y personalizado. Advertencia: nuestro desafío trata de **tendencias históricas**, no de pronósticos; no debemos prometer predicción. |
| **BloomWatch** — QUEÑARIS, Perú (2025) | Local Impact | Escasez de agua en Arequipa, ligada a la degradación de bosques de queñua. Combina datos satelitales, drones, microorganismos e IA. | Un problema **local** con datos globales. Para un equipo de la UABC, Baja California es un buen caso. |

Observación: hay repositorios públicos que se presentan como proyectos de 2026 para este desafío.
**No los revisamos**, para no contaminar nuestra solución. Conviene confirmar con los organizadores las reglas sobre trabajo previo al hackathon.

## C. Criterios de evaluación

**VERIFICADO (guía oficial de 2022):** *Space Apps 2022 Judging and Awards Guide* (PDF en `spaceapps-prod.s3.amazonaws.com`).
Lista cinco criterios con estas preguntas guía:

- **Impact:** ¿cuánto impacto (calidad y cantidad) puede tener?, ¿resuelve un problema grande o pequeño?
- **Creativity:** ¿qué tan creativo o innovador es el enfoque?, ¿es novedoso o incremental?
- **Validity:** ¿es científicamente válido?, ¿hará lo que promete?, ¿puede funcionar en el mundo real?
- **Relevance:** ¿responde al desafío?, ¿está completo?, ¿es técnicamente factible?, ¿es usable?
- **Presentation:** ¿comunicaron bien el proyecto: el desafío, la solución y su importancia?

La guía de 2022 **no publica ponderaciones**. Solo pide prestar "igual atención" al criterio de presentación.
**NO VERIFICADO para 2026:** la guía 2026 está en el mismo dominio con el problema TLS. Fuentes secundarias sugieren los mismos cinco criterios. **No asumimos pesos.**

### Matriz criterio → mecanismo para demostrarlo (RECOMENDACIÓN)

| Criterio | Mecanismo en el laboratorio | Evidencia para el jurado |
|---|---|---|
| Impacto | Comparación de dos lugares que el usuario elige; lenguaje llano | Demostración con un lugar del público y otro contrastante |
| Creatividad | Opposite Trends Explorer, detectabilidad, sensibilidad al período | "No significativa ≠ no existe", con una cifra concreta |
| Validez | MK/Hamed-Rao, Theil-Sen, MCO ajustado, pruebas con valores conocidos y referencia cruzada (`pymannkendall`) | Pruebas automáticas en verde y documento de métodos |
| Relevancia | Recorrido Variable → … → Interpretación; datos reales de NASA | Procedencia visible y comprobable (URL, fecha) |
| Presentación | Paneles con explicaciones deterministas; marca de agua en datos sintéticos | Guion de 3 minutos basado en el recorrido |

## D. Decisiones técnicas (justificación breve)

- **Python 3.12 + Streamlit:** el estudio de la estadística y la interfaz viven en un solo lenguaje, que el equipo puede leer.
- **SciPy:** `theilslopes` (IC de Sen) y `linregress`. Mann-Kendall, Hamed-Rao y Seasonal MK son **implementación propia**, validada contra `pymannkendall` en las pruebas. Así se puede usar el **tiempo real** (años) y no índices.
- **Plotly:** gráficas interactivas sin servidor adicional.
- **Sin base de datos ni microservicios:** caché JSON local para trabajar sin red durante la demostración.
- **Una sola API externa (NASA POWER):** las demás fuentes quedan documentadas en `DATA_SOURCES.md`.
