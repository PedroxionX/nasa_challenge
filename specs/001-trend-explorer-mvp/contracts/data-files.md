# Contrato: archivos de datos que lee el frontend

Única interfaz entre `pipeline/` y `web/`. Entidades y reglas en [../data-model.md](../data-model.md). Ruta base: `web/public/data/trends/`. Todo es JSON UTF-8; los números usan punto decimal; lo no evaluable es `null`, nunca `NaN`.

**`schema_version: 1`.** La revisión del 2026-11-14 (fuentes reales: MERRA-2 e IMERG desde GES DISC, decisión del equipo; ver [research.md](../research.md) D2–D3) **solo añade campos**: un lector o un archivo de la revisión anterior sigue siendo válido. Por eso no se sube a 2. El único cambio que no es aditivo son los **ids de variable** (`T2M` → `air_temperature`, `PRECTOTCORR` → `precipitation`); no cambia la forma de ningún archivo, y el frontend traduce los ids viejos de la URL (`?var=T2M`) sin aviso.

| Cambio de la revisión 2026-11-14 | Dónde | ¿Obligatorio? |
|---|---|---|
| Ids neutrales de variable | `catalog.variables[].id`, `series.variable`, `map.variable`, rutas, `?var=` | Sí |
| Periodo por variable: `first_year`, `last_complete_year` | `catalog.variables[]` | El pipeline los escribe siempre; el lector usa `catalog.period` si faltan |
| Producto de origen: `product_short_name`, `product_version` | `catalog.variables[]` | Igual |
| `short_name`, `version`, `doi`, `granules` | `series.provenance` | Igual |
| Columnas `line_mid`, `slope_decade_pct`, `ci_low_pct`, `ci_high_pct` (pedido de 004) | final de `series.windows.columns` | Opcionales (las cuatro juntas o ninguna) |
| Mapa de variables con `relative_change` en %/década | `map/{variable}.json` | Sí (ya lo hace 003 desde T014) |

## Ids de variable

Claves **neutrales y estables**, no nombres del producto: el producto puede cambiar (alternativa POWER, nueva versión) sin romper enlaces ni rutas. El producto exacto va en el catálogo y en `provenance`.

| `id` | Producto de la primera entrega | Alternativa si GES DISC falla |
|---|---|---|
| `air_temperature` | MERRA-2 `M2TMNXSLV` v5.12.4, `T2M` | NASA POWER `T2M` (mismo MERRA-2) |
| `precipitation` | GPM IMERG Final `GPM_3IMERGM` v07, `precipitation` | NASA POWER `PRECTOTCORR` (reanálisis; se rotula) |

## `catalog.json`

```json
{
  "schema_version": 1,
  "built_at_utc": "2026-11-14T18:00:00Z",
  "alpha": 0.05,
  "period": { "first_year": 1980, "last_complete_year": 2025, "min_window_years": 10 },
  "method": {
    "slope": "theil-sen",
    "test": "mann-kendall-ar1-corrected",
    "interval": "sen-1968-95",
    "contrast": "ols-santer-2000"
  },
  "variables": [
    { "id": "air_temperature", "label": "Temperatura del aire", "definition": "…", "kind": "reanalysis",
      "unit_annual": "°C", "aggregation": "mean_day_weighted", "relative_change": false,
      "first_year": 1980, "last_complete_year": 2025,
      "product_short_name": "M2TMNXSLV", "product_version": "5.12.4" },
    { "id": "precipitation", "label": "Precipitación", "definition": "…", "kind": "observation",
      "unit_annual": "mm", "aggregation": "sum_from_rate", "relative_change": true,
      "first_year": 2001, "last_complete_year": 2025,
      "product_short_name": "GPM_3IMERGM", "product_version": "07" }
  ],
  "regions": [
    { "id": "MX-BCN", "name": "Baja California", "country": "MX", "n_cells": 0, "small_region": false }
  ]
}
```

- **Periodo**: cada variable tiene el suyo (`first_year` = primer año completo del producto; `last_complete_year` = último año con 12 meses válidos). `catalog.period` se **conserva** como la envolvente (el mínimo de los `first_year` y el máximo de los `last_complete_year`) para lectores anteriores; la interfaz usa el de la variable activa. `period.min_window_years` sigue siendo global (10).
- `regions[].n_cells` y `small_region` se refieren a la malla más gruesa (MERRA-2, 0,5° × 0,625°), que es la que hace pequeñas a las regiones; el número de celdas de cada variable está en `provenance.n_cells` de su serie (IMERG, a 0,1°, usa muchas más).
- `n_cells` es 0 en el ejemplo porque aún no se ha calculado; no es un resultado.

## `series/{variable}/{region}.json`

```json
{
  "schema_version": 1,
  "region": "MX-BCN",
  "variable": "air_temperature",
  "unit": "°C",
  "years": [1980, 1981],
  "values": [0.0, 0.0],
  "excluded_years": [],
  "partial_year": { "year": 2026, "months_valid": 9 },
  "provenance": {
    "source": "NASA GES DISC (Earthdata Cloud) vía earthaccess",
    "product": "MERRA-2 tavgM_2d_slv_Nx",
    "short_name": "M2TMNXSLV",
    "version": "5.12.4",
    "doi": "10.5067/AP1B0BA5PD2K",
    "api_version": "earthaccess 0.0.0",
    "parameter": "T2M",
    "unit_declared": "K",
    "grid": "0.5° × 0.625°",
    "spatial_method": "Promedio de área ponderado por cos(latitud) y fracción de la celda cubierta por el polígono",
    "n_cells": 0,
    "granules": 552,
    "retrieved_at_utc": "2026-11-14T17:00:00Z",
    "requests": "manifest/2026-11-14.json",
    "transformations": ["K → °C (− 273,15)", "años incompletos excluidos"],
    "is_synthetic": false
  },
  "diagnostics": { "step_year": null, "autocorr_significant": false },
  "windows": {
    "columns": ["start", "end", "n", "slope_decade", "ci_low", "ci_high", "p", "p_uncorrected",
                "r1", "ols_slope_decade", "ols_p", "status", "flags",
                "line_mid", "slope_decade_pct", "ci_low_pct", "ci_high_pct"],
    "rows": [
      [1981, 2025, 45, 0.460, 0.307, 0.590, 0.000016, 0.000003, 0.08, 0.423, 0.000001, "increasing", [],
       19.2, null, null, null]
    ]
  }
}
```

La fila de ejemplo usa cifras reales del caso grabado del laboratorio (punto de cuadrícula de Mexicali, T2M, 1981–2025) solo para mostrar el formato. **No es el resultado de Baja California**; los `values` en cero, `granules`, `n_cells` y la versión de earthaccess son marcadores.

Reglas:

- Hay una fila por cada par `start ≤ end` **dentro del periodo de la variable** con `end − start + 1 ≥ 10` (MERRA-2 1980–2025: 703 filas; IMERG 2001–2025: 136). Un periodo más corto o fuera del de la variable no tiene fila: la interfaz muestra «datos insuficientes» sin consultar nada.
- `status` ∈ `increasing` | `decreasing` | `inconclusive` | `insufficient` | `invalid`.
- `ci_low ≤ slope_decade ≤ ci_high` siempre que no sean `null`.
- Una región sin celdas no tiene archivo y figura con `n_cells: 0` en el catálogo.
- **Columnas opcionales** (las cuatro juntas, después de `flags`, en este orden):
  - `line_mid`: valor de la recta de Theil-Sen en el año central `(start + end) / 2`, en `unit`. `null` exactamente cuando `slope_decade` es `null`.
  - `slope_decade_pct`, `ci_low_pct`, `ci_high_pct`: cambio relativo en % por década = cifra ÷ media de los valores anuales de la ventana × 100. `null` en variables con `relative_change: false`, si la media es ≤ 0 o si la cifra de origen es `null`. El signo de `slope_decade_pct` es el de `slope_decade`.
- **Procedencia**: `short_name`, `version`, `doi` y `granules` (número de gránulos leídos para esa serie) los escribe siempre el pipeline con fuentes de GES DISC; `requests` sigue apuntando al manifiesto (gránulo, URL, fecha y huella). `api_version` guarda la versión de la herramienta de acceso (earthaccess o la API de POWER).

## `map/{variable}.json`

```json
{
  "schema_version": 1,
  "variable": "air_temperature",
  "unit": "°C/década",
  "regions": ["MX-AGU", "MX-BCN"],
  "windows": { "1980-2025": [0.0, 0.0] },
  "classes": { "breaks": [-0.4, -0.1, 0.1, 0.4], "labels": ["Baja mucho", "Baja", "Casi sin cambio", "Sube", "Sube mucho"] }
}
```

- `windows[clave][i]` es el cambio por década de `regions[i]`; `null` = sin datos. Las claves son las ventanas del periodo de **esa** variable.
- Variables con `relative_change: false`: el valor es `slope_decade` y `unit` es «{unidad}/década».
- Variables con `relative_change: true` (precipitación): el valor es `slope_decade_pct` y `unit` es «%/década», para que regiones secas y húmedas sean comparables en el mapa.
- Los cortes de `classes` son un ejemplo y se fijan al ver la distribución real.

## Contrato de la interfaz (estado en la URL)

`?region=MX-BCN&var=air_temperature&from=1980&to=2025` · valores inexistentes se sustituyen por los predeterminados y se avisa · `var=T2M` y `var=PRECTOTCORR` (enlaces anteriores) se traducen a los ids nuevos sin aviso · el periodo se valida contra el de la variable activa.

## Lo que nunca se publica

Ningún campo de «años para ser significativo» o «años para detectar» (`yearsToDetect`, `detectability_years`…): constitución y [research.md](../research.md) D7. Solo una enmienda explícita de la constitución lo permitiría.

## Verificación

- El pipeline valida cada archivo contra este contrato antes de escribirlo (escritura todo o nada).
- `web/src/lib/data.ts` declara los mismos tipos, acepta las columnas y campos opcionales y rechaza un `schema_version` desconocido con un error recuperable.
