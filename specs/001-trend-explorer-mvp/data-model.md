# Data Model: Explorador de tendencias por región (MVP)

El formato de archivo está en [contracts/data-files.md](contracts/data-files.md); aquí, las entidades y sus reglas.

## Region
| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto | ISO 3166-2 (`MX-BCN`, `US-TX`); único; igual al del GeoJSON |
| `name` | texto | En español |
| `country` | `MX` \| `US` | |
| `n_cells` | entero ≥ 0 | Celdas con peso > 0 en la malla más gruesa (MERRA-2); 0 ⇒ región sin datos. El número por variable está en `provenance.n_cells` de cada serie |
| `small_region` | booleano | `n_cells ≤ 2` ⇒ la interfaz lo advierte |

## Variable
| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto | Clave neutral y estable (`air_temperature`, `precipitation`); el producto va aparte. Los ids anteriores `T2M` y `PRECTOTCORR` solo se aceptan en la URL y se traducen |
| `label`, `definition` | texto | Nombre llano y definición de una o dos frases |
| `kind` | `reanalysis` \| `observation` | Se muestra junto al nombre (MERRA-2: reanálisis; IMERG: observación) |
| `unit_annual` | texto | `°C`, `mm` (acumulado del año) |
| `aggregation` | `mean_day_weighted` \| `sum_from_rate` | Determina la conversión |
| `relative_change` | booleano | Solo verdadero en magnitudes de razón (precipitación); el mapa usa entonces %/década |
| `first_year`, `last_complete_year` | años | Periodo propio: primer y último año con 12 meses válidos (temperatura 1980–2025; precipitación 2001–2025) |
| `product_short_name`, `product_version` | texto | Producto de origen (`M2TMNXSLV` 5.12.4; `GPM_3IMERGM` 07) |

## Series (una por región y variable)
| Campo | Tipo | Regla |
|---|---|---|
| `years`, `values` | listas paralelas | Solo años completos (12 meses válidos) |
| `excluded_years` | lista | Años incompletos; nunca se interpolan |
| `partial_year` | objeto opcional | Año en curso, solo para mostrar |
| `provenance` | Provenance | Obligatorio |

## TrendResult (uno por serie y ventana)
| Campo | Tipo | Regla |
|---|---|---|
| `start`, `end` | años | `end − start + 1 ≥ 10` para existir como fila |
| `n` | entero | Años completos dentro de la ventana |
| `slope_decade` | número | Theil-Sen × 10, en `unit_annual` por década |
| `ci_low`, `ci_high` | número | Intervalo de Sen al 95 % con la varianza corregida |
| `p` | número en [0, 1] o nulo | Mann-Kendall corregido; nulo si no es evaluable |
| `p_uncorrected` | número | Mann-Kendall original, para los detalles |
| `r1` | número | Autocorrelación de lag 1 de la serie sin tendencia |
| `ols_slope_decade`, `ols_p` | número o nulo | Contraste (MCO con ajuste de Santer) |
| `status` | enumeración | Ver transiciones |
| `flags` | lista | `autocorr`, `step`, `short` (n < 30), `ties`, `small_region` |
| `line_mid` | número o nulo, opcional | Recta de Theil-Sen en el año central; nulo exactamente cuando `slope_decade` es nulo |
| `slope_decade_pct`, `ci_low_pct`, `ci_high_pct` | número o nulo, opcional | % por década sobre la media de la ventana; nulo si la variable no tiene `relative_change` o la media es ≤ 0 |

**Estado** (lo fija el pipeline; el navegador no lo deriva):

```text
n < 10                          → insufficient
serie constante o validación KO → invalid
p < 0,05 y pendiente > 0        → increasing
p < 0,05 y pendiente < 0        → decreasing
en otro caso                    → inconclusive
```

## Provenance
| Campo | Regla |
|---|---|
| `source`, `product`, `api_version` | Tal como los declara la fuente; `api_version` = versión de la herramienta de acceso (earthaccess o API de POWER) |
| `short_name`, `version`, `doi` | Identificación exacta del producto (p. ej. `M2TMNXSLV`, `5.12.4`) |
| `granules` | Número de gránulos leídos para la serie |
| `parameter`, `unit_declared` | Parámetro y unidad textual de la fuente |
| `spatial_method`, `grid`, `n_cells` | «Promedio de área ponderado por cos(latitud) y fracción cubierta» (no es la regla de Giovanni, que usa celdas con centro dentro: research D4) |
| `retrieved_at_utc`, `requests` | Fecha y solicitudes de origen, o referencia al manifiesto |
| `transformations` | Lista ordenada y legible |
| `is_synthetic` | Siempre presente; `false` en producción |

## Relaciones

Region 1—N Series N—1 Variable · Series 1—N TrendResult · Series 1—1 Provenance.
