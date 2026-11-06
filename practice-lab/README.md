# TrendLens Lab — Exploring Earth's Hidden Changes

**Laboratorio de práctica** para el desafío *Be An Earth System Trend Detective!* de NASA Space Apps 2026.
**No es la solución que se presentará a competencia.** Sirve para aprender, experimentar con datos de NASA y
comprobar métodos estadísticos antes del hackathon (14–15 de noviembre de 2026).

> Variable → Ubicación → Datos → Procesamiento → Análisis → Evidencia → Interpretación

## Qué hace
- Elige **temperatura a 2 m (T2M)** o **precipitación corregida (PRECTOTCORR)**, **dos ubicaciones** y un **período**.
- Tres fuentes de datos: **sintético** (sin red, con semillas documentadas y la marca *DATOS SINTÉTICOS — SOLO
  DEMOSTRACIÓN*), **NASA POWER** (datos reales de MERRA-2 por punto de cuadrícula) o **CSV propio** (una serie
  mensual por sitio, con la procedencia que declara quien sube el archivo).
- Estima la tendencia (Theil-Sen + MCO) y prueba su significancia con Mann-Kendall corregido por autocorrelación.
  Muestra IC del 95 %, advertencias y cuántos años harían falta para detectarla.
- **Opposite Trends Explorer:** compara dos lugares con una prueba formal sobre la serie de diferencias.
  Que los signos sean opuestos no basta.
- Explica cada resultado con plantillas deterministas (sin IA) y exporta CSV con procedencia.

## Instalación y ejecución (Windows / PowerShell)
Requiere Python ≥ 3.11 (verificado con 3.12.10).
```powershell
cd practice-lab
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m streamlit run app.py
```
Abre http://localhost:8501. En macOS o Linux usa `.venv/bin/python`.

## Pruebas
```powershell
.\.venv\Scripts\python.exe -m pytest                 # 120 pruebas sin red (≈ 30 s)
.\.venv\Scripts\python.exe -m pytest --run-live      # + 9 pruebas contra la API real de NASA POWER
.\.venv\Scripts\python.exe -m pytest tests/test_mann_kendall.py -v   # un archivo concreto
```
| Archivo | Qué verifica |
|---|---|
| `test_stats_known_values.py` | MCO, MK, Sen y detectabilidad contra valores calculados a mano y SciPy |
| `test_mann_kendall.py` | Validación cruzada con `pymannkendall` + calibración Monte Carlo de falsos positivos |
| `test_processing.py` | Bisiestos, ponderación por días, duplicados, relleno, unidades; coincidencia con el anual de POWER |
| `test_engine.py` | Creciente ⇒ +, decreciente ⇒ −, constante, faltantes, estacionalidad pura, datos insuficientes |
| `test_nasa_power.py` | Parseo de respuestas reales grabadas; errores 422, de conexión y de JSON ⇒ error, nunca datos |
| `test_compare_and_explain.py` | La comparación no afirma diferencias sin sustento; las explicaciones usan solo cifras calculadas |
| `test_csv_source.py` | La ruta CSV reproduce exactamente el análisis directo de POWER; formatos aceptados y rechazos |
| `test_export.py` | El CSV incluye período, procedencia e indicador sintético |
| `test_app_smoke.py` | Cada pantalla sin excepciones (sintético, CSV y POWER con `--run-live`) + flujo completo de carga de CSV |

## Reproducir un ejemplo (sin interfaz)
```powershell
.\.venv\Scripts\python.exe scripts\reproduce_example.py synthetic --a opuesta_pos --b opuesta_neg --code T2M
.\.venv\Scripts\python.exe scripts\reproduce_example.py fixture --code T2M        # datos reales GRABADOS el 2026-11-06
.\.venv\Scripts\python.exe scripts\reproduce_example.py power --a mexicali --b ensenada --code PRECTOTCORR
.\.venv\Scripts\python.exe scripts\reproduce_example.py experiment --phi 0.75 --sims 500
```
Con `fixture` y T2M (1981–2025) deben salir estas cifras exactas: Mexicali **+0.46 °C/década**
(IC 95 % +0.31 a +0.59, p < 0.001); Ushuaia +0.038 °C/década (no concluyente, p = 0.473).
Son puntos de cuadrícula de MERRA-2: no son promedios de ciudad y no dicen nada sobre causas.

## Usar tus propios datos (modo «CSV propio»)
1. En el panel lateral elige **CSV propio** y la variable (temperatura en °C o precipitación como **tasa** en mm/día).
2. ¿No tienes un archivo a mano? Descarga el **CSV de ejemplo (sintético)** para ver el formato.
3. Declara la **fuente** (obligatoria), el producto y la resolución espacial, e indica si los datos son reales o sintéticos.
4. Sube un archivo por sitio y revisa las columnas de fecha y valor que se detectaron.
   Formato del archivo: separador (automático, `,`, `;` o tabulador), coma decimal, filas de encabezado a omitir.
5. Confirma la unidad. El período se ajusta a las fechas de los archivos.

Formato aceptado: **una fila por mes**, con fechas `AAAA-MM`, `AAAA-MM-DD` (día 1) o `AAAAMM`.
Se rechazan con un mensaje claro:
- fechas con `/` (ambiguas);
- valores no numéricos;
- más de un valor por mes;
- archivos de más de 5 MB.

El resultado lleva el aviso *procedencia no verificada por el laboratorio*.

## Estructura
```
practice-lab/
├── app.py                      # entrada de Streamlit (navegación + panel lateral)
├── trendlens/
│   ├── config.py               # catálogo de variables, ubicaciones y constantes metodológicas
│   ├── schema.py               # esquema normalizado + Provenance + SeriesBundle
│   ├── data/                   # acceso a datos: synthetic.py, nasa_power.py, csv_source.py, base.py
│   ├── processing.py           # limpieza, unidades, años completos, anomalías
│   ├── stats/                  # motor científico: ols, mann_kendall, diagnostics, engine, compare, experiments
│   ├── explain.py              # plantillas deterministas en español
│   ├── viz.py                  # figuras Plotly
│   ├── export.py               # CSV con procedencia
│   └── ui/                     # Streamlit: state, sidebar, pages, theme
├── tests/                      # pytest + fixtures reales de NASA POWER
├── scripts/reproduce_example.py
└── RESEARCH.md · SCIENTIFIC_METHOD.md · DATA_SOURCES.md · OFFICIAL_RESOURCES_READINESS.md · LIMITATIONS.md
```

## Estado
- **Funciona:** todo lo anterior, verificado con pruebas (ver `LIMITATIONS.md`).
- **Parcial:** el modo CSV solo acepta formato largo y sin conversión de unidades; falta una revisión visual humana
  del diseño, sobre todo en móvil.
- **No implementado:** NetCDF, otras fuentes de NASA, mapas de tendencias, IA.

## Lo que aprendimos (para el hackathon)
1. **Verifica las unidades en la respuesta, no en la etiqueta.** `PRECTOTCORR_SUM` dice "mm/day" y trae acumulados mensuales.
2. **El "mes 13" de POWER es anual** y el año en curso trae −999: filtrar ambos antes de analizar.
3. **La autocorrelación es el mayor riesgo estadístico.** MK sin corrección da ~42 % de falsos positivos con φ = 0.75. Medirlo con un Monte Carlo propio cambió nuestra elección de prueba.
4. **"No significativo" ≠ "no hay tendencia".** La detectabilidad convierte esa idea en un número comprensible.
5. **Signos opuestos ≠ tendencias distintas.** Probar la serie de diferencias, que además absorbe la correlación entre sitios.
6. **Punto de cuadrícula ≠ ciudad.** Decirlo en cada pantalla evita la crítica más fácil del jurado.
7. **La procedencia visible** (URL, fecha, versión) hace verificable cada cifra.
