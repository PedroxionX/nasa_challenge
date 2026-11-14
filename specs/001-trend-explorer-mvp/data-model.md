# Data Model: Explorador de tendencias por región (MVP)

El formato de archivo está en [contracts/data-files.md](contracts/data-files.md); aquí, las entidades y sus reglas.

## Region
| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto | ISO 3166-2 (`MX-BCN`, `US-TX`); único; igual al del GeoJSON |
| `name` | texto | En español |
| `country` | `MX` \| `US` | |
| `n_cells` | entero ≥ 0 | Celdas con peso > 0; 0 ⇒ región sin datos |
| `small_region` | booleano | `n_cells ≤ 2` ⇒ la interfaz lo advierte |

## Variable
| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto | Parámetro exacto de la fuente (`T2M`, `PRECTOTCORR`) |
| `label`, `definition` | texto | Nombre llano y definición de una o dos frases |
| `kind` | `reanalysis` \| `observation` | Se muestra junto al nombre |
| `unit_annual` | texto | `°C`, `mm/año` |
| `aggregation` | `mean_day_weighted` \| `sum_from_rate` | Determina la conversión |
| `relative_change` | booleano | Solo verdadero en magnitudes de razón (precipitación) |

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
| `source`, `product`, `api_version` | Tal como los declara la respuesta |
| `parameter`, `unit_declared` | Parámetro y unidad textual de la fuente |
| `spatial_method`, `grid`, `n_cells` | «Promedio de área ponderado por cos(latitud) y cobertura» |
| `retrieved_at_utc`, `requests` | Fecha y solicitudes de origen, o referencia al manifiesto |
| `transformations` | Lista ordenada y legible |
| `is_synthetic` | Siempre presente; `false` en producción |

## Relaciones

Region 1—N Series N—1 Variable · Series 1—N TrendResult · Series 1—1 Provenance.
