# Preparación para los recursos oficiales (se publican el 13 de noviembre de 2026)

> Revisar y actualizar este documento el **13 de noviembre**. Hasta entonces, todo lo marcado ☐ está pendiente.

## 1. Recursos verificados hoy (2026-11-06)
- ✔ API mensual por punto de NASA POWER: estructura, unidades, relleno, errores 422 y valores anuales (ver `DATA_SOURCES.md`).
- ✔ Criterios de evaluación de la guía oficial de 2022: Impact, Creativity, Validity, Relevance y Presentation. Sin ponderaciones publicadas.
- ✘ Página oficial del desafío 2026: **no se pudo leer** (certificado TLS no confiable desde esta red).

## 2. Pendiente de publicación o confirmación
- ☐ Lista oficial de recursos y conjuntos de datos del desafío.
- ☐ Texto literal de objetivos y "consideraciones" (contrastar con la tabla de requisitos de `RESEARCH.md`).
- ☐ Guía de evaluación 2026 (¿mismos cinco criterios?, ¿pesos?).
- ☐ Reglas sobre código o material preparado **antes** del hackathon. Por eso este laboratorio está en una rama y carpeta de práctica.

## 3. Qué confirmar el 13 de noviembre (lista de control)
| ☐ | Pregunta | Por qué importa |
|---|---|---|
| ☐ | ¿Qué productos se recomiendan (POWER, IMERG, GLDAS, MODIS, Giovanni…)? | Define qué adaptador construir primero |
| ☐ | ¿Requieren Earthdata Login? ¿Habrá tokens o cuentas para el evento? | Riesgo de bloqueo el día 1 |
| ☐ | Resolución temporal (diaria / mensual / anual) | Cambia la agregación y la estacionalidad |
| ☐ | Resolución espacial (punto, celda, promedio de área) | Cambia lo que se puede afirmar ("región" vs. "punto") |
| ☐ | Formato (CSV, JSON, NetCDF, HDF5, GeoTIFF) | Lector necesario |
| ☐ | Unidades declaradas y convenciones (tasas vs. acumulados, K vs. °C) | Ver la trampa de `PRECTOTCORR_SUM` |
| ☐ | Valores de relleno y banderas de calidad | Limpieza correcta |
| ☐ | Período disponible y cambios de versión del producto | Evitar mezclar versiones o productos |
| ☐ | Licencia y forma de citar los datos | Requisito de presentación |
| ☐ | Límites de tasa o volumen de las APIs | Estrategia de caché |

## 4. Interfaz de integración (ya implementada)
Toda fuente nueva debe producir un `SeriesBundle` (`trendlens/schema.py`) con este esquema largo:

| Columna | Contenido |
|---|---|
| `timestamp` | datetime (primer día del mes) |
| `variable` | código |
| `value` | float, NaN si falta |
| `unit` | unidad tal como llega (se valida contra el catálogo) |
| `latitude`, `longitude`, `location_id` | ubicación o identificador espacial |
| `source`, `product` | procedencia |
| `temporal_resolution`, `spatial_resolution` | resoluciones |
| `quality_flag` | ok / missing / fill_value / out_of_range |
| `is_synthetic` | bool (una serie no puede mezclar) |

Más un objeto `Provenance` con URL, fecha de consulta, versión, celda, semilla y notas.

Adaptadores: `data/synthetic.py`, `data/nasa_power.py` (JSON) y `data/csv_source.py` (CSV mensual genérico, ya probado).

### Cómo se integraría cada formato
- **CSV:** `load_monthly_csv(path, variable, location, unit=..., source_name=..., product=...)`. Exige declarar la unidad y fechas AAAA-MM-01.
- **JSON:** escribir `parse_<fuente>()` siguiendo el modelo de `parse_power_monthly()`: validar estructura, unidad y relleno, y separar los agregados.
- **NetCDF (pendiente):** `xarray.open_dataset` → `ds[var].sel(lat=..., lon=..., method="nearest")` → `to_dataframe()` → esquema.
  Atender `units`, `_FillValue`, `scale_factor` y `add_offset`, el calendario de `time` y la longitud 0–360 vs. −180–180.
  Agregar `xarray` y `netCDF4` a `requirements.txt` solo cuando se necesiten.

## 5. Riesgos de integración
1. Autenticación (Earthdata) no lista el día del evento → preparar cuentas el día 13.
2. Archivos grandes (NetCDF globales) → extraer el punto o el área en el servidor (OPeNDAP, AppEEARS o Giovanni) en lugar de descargar todo.
3. Resolución diaria → requiere reglas de completitud por mes (p. ej. ≥ 90 % de días) antes de agregar.
4. Productos satelitales con huecos (nubes en MODIS) → muchos años incompletos; considerar Seasonal MK o reglas de completitud distintas.
5. Variables acotadas o con muchos ceros (precipitación árida, nieve) → empates en MK y transformaciones.
6. Mezcla de versiones o productos en una serie → falsos saltos (el diagnóstico de escalón ayuda a detectarlos).

## 6. Pruebas necesarias al integrar una fuente nueva
- ☐ Fixture grabado de una respuesta real + prueba de parseo (unidades, relleno, fechas).
- ☐ Verificación cruzada contra un agregado publicado por la propia fuente, si existe (como el "mes 13" de POWER).
- ☐ Errores de red y HTTP simulados ⇒ `DataSourceError`, sin sustitución.
- ☐ Prueba de unidades: una etiqueta inesperada debe fallar.
- ☐ Prueba de extremo a extremo con el motor (veredicto, procedencia, período).

## 7. Preguntas para los mentores de NASA
1. ¿Qué producto recomiendan para tendencias de largo plazo de la variable X, y cuál **no** debería usarse para tendencias (por cambios de sensor o versión)?
2. ¿Hay saltos conocidos en la serie (cambio de satélite o de forzamiento) que debamos tratar?
3. ¿Qué período mínimo consideran defendible para hablar de tendencia en esa variable?
4. ¿Prefieren tendencias en un punto, en una celda o promedios de área? ¿Cómo comunicar esa diferencia al público?
5. ¿Esperan corrección por autocorrelación o por comparaciones múltiples (si se analizan muchos lugares)?
6. ¿Hay herramientas oficiales (Giovanni, AppEEARS) con las que debamos validar nuestras cifras?
7. ¿Cómo debemos citar los conjuntos de datos en la entrega?
