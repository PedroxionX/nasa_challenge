# Limitaciones y estado del laboratorio

## Qué funciona (verificado con pruebas el 2026-11-06)
- Aplicación Streamlit de 4 pantallas. Cada pantalla se ejecuta sin errores en modo sintético (sin red) y en modo NASA POWER (red); hay pruebas `AppTest` de ambos.
- 9 escenarios sintéticos deterministas con semilla documentada, incluidos los 7 exigidos más un escalón.
- Conector NASA POWER (T2M, PRECTOTCORR) con validación de unidades, relleno, errores HTTP y caché.
- Motor estadístico: MK, MK con corrección AR(1), Hamed-Rao, Seasonal MK, Theil-Sen con IC, MCO con ajuste de Santer, escalón vs. recta, detectabilidad y sensibilidad.
- Opposite Trends Explorer con prueba formal sobre la serie de diferencias.
- Explicaciones deterministas en español. Exportación CSV con procedencia.
- 93 pruebas fuera de línea + 9 en vivo (`--run-live`), todas aprobadas.

## Parcialmente implementado
- **Adaptador CSV:** existe y está probado, pero **no** está conectado a la interfaz (no hay carga de archivos).
- **Seasonal Mann-Kendall:** implementado y validado, pero sin la corrección de Hirsch-Slack por dependencia entre meses. Solo es diagnóstico.
- **Revisión visual de la interfaz:** no se pudo hacer con navegador en esta sesión (la extensión de Chrome no estaba conectada). La interfaz se verificó con `AppTest` y el servidor respondió `health ok`; falta una revisión humana del diseño, sobre todo en móvil.
- **Diseño adaptable:** columnas de Streamlit y CSS con un punto de quiebre a 640 px. No se ha probado en un dispositivo real.

## No implementado
- Lectores de NetCDF/HDF y fuentes distintas de POWER (IMERG, GLDAS, MODIS, Giovanni; ver `DATA_SOURCES.md`).
- Datos diarios, promedios de área y mapas de tendencias (a propósito: no hay datos espaciales suficientes).
- Corrección por comparaciones múltiples al probar muchos pares de lugares.
- Prueba exacta de MK para n < 10 (se usa la aproximación normal con advertencia y sin veredicto).
- Internacionalización (la interfaz solo está en español) e informes PDF.
- Cualquier función de IA generativa (decisión deliberada).

## Limitaciones científicas
1. **Puntos de cuadrícula de un reanálisis:** MERRA-2 (½° × ⅝°) no es una estación. En relieve complejo, costas o ciudades puede diferir mucho de la realidad local.
2. **La autocorrelación nunca se corrige perfectamente** con series cortas: en nuestro experimento, ≈ 9–11 % de falsos positivos con φ = 0.75, frente al 5 % nominal.
3. **Tendencia lineal y monótona:** no describe oscilaciones, aceleraciones ni saltos. El diagnóstico BIC solo detecta un escalón único.
4. **El período importa:** las pendientes cambian con el año inicial (ver la gráfica de sensibilidad).
5. **No hay atribución causal ni pronóstico.**
6. **Escenario "autocorrelada" (T2M, semilla 1108):** da un **falso positivo** incluso con la corrección (p ≈ 0.039). No se cambió la semilla para ocultarlo: ilustra el punto 2.
7. **Precipitación árida:** muchos meses en cero producen empates. MK lo corrige en la varianza, pero pierde potencia.
8. **Redondeo de POWER a 2 decimales:** error de conversión ≤ 0.005 × días ≈ 0.16 mm/mes.

## Qué es solo material de entrenamiento
**Todo este directorio (`practice-lab/`)**. Para el hackathon conviene reutilizar el **conocimiento**, no el código:
- las decisiones de `SCIENTIFIC_METHOD.md` y el experimento que las justifica;
- la lista de trampas de datos de `DATA_SOURCES.md`;
- la lista de control de `OFFICIAL_RESOURCES_READINESS.md`.

Las reglas oficiales sobre trabajo previo deben confirmarse antes de reutilizar cualquier archivo.

## Mejoras para un proyecto futuro
- Elegir la prueba principal con un Monte Carlo **ajustado a la autocorrelación observada** en los datos oficiales, no a φ genéricos.
- Bootstrap por bloques (moving block bootstrap) como alternativa no paramétrica para IC con autocorrelación.
- Corrección por FDR (Benjamini-Hochberg) si se analizan muchas ubicaciones.
- Pruebas de interfaz visuales (Playwright) y de accesibilidad automatizadas.
- Carga de CSV en la interfaz para probar datos oficiales en minutos.
