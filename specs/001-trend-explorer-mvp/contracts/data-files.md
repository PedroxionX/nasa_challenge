# Contrato: archivos de datos que lee el frontend

Única interfaz entre `pipeline/` y `web/`. Entidades y reglas en [../data-model.md](../data-model.md). Ruta base: `web/public/data/trends/`. Todo es JSON UTF-8; los números usan punto decimal; lo no evaluable es `null`, nunca `NaN`.

## `catalog.json`

```json
{
  "schema_version": 1,
  "built_at_utc": "2026-11-14T18:00:00Z",
  "alpha": 0.05,
  "period": { "first_year": 1981, "last_complete_year": 2025, "min_window_years": 10 },
  "method": {
    "slope": "theil-sen",
    "test": "mann-kendall-ar1-corrected",
    "interval": "sen-1968-95",
    "contrast": "ols-santer-2000"
  },
  "variables": [
    { "id": "T2M", "label": "Temperatura del aire", "definition": "…", "kind": "reanalysis",
      "unit_annual": "°C", "aggregation": "mean_day_weighted", "relative_change": false }
  ],
  "regions": [
    { "id": "MX-BCN", "name": "Baja California", "country": "MX", "n_cells": 0, "small_region": false }
  ]
}
```

`n_cells` es 0 en el ejemplo porque aún no se ha calculado; no es un resultado.

## `series/{variable}/{region}.json`

```json
{
  "schema_version": 1,
  "region": "MX-BCN",
  "variable": "T2M",
  "unit": "°C",
  "years": [1981, 1982],
  "values": [0.0, 0.0],
  "excluded_years": [],
  "partial_year": { "year": 2026, "months_valid": 9 },
  "provenance": {
    "source": "NASA POWER — API mensual regional",
    "product": "MERRA2",
    "api_version": "v2.10.0",
    "parameter": "T2M",
    "unit_declared": "C",
    "grid": "0.5° × 0.625°",
    "spatial_method": "Promedio de área ponderado por cos(latitud) y cobertura del polígono",
    "n_cells": 0,
    "retrieved_at_utc": "2026-11-14T17:00:00Z",
    "requests": "manifest/2026-11-14.json",
    "transformations": ["relleno −999 → faltante", "años incompletos excluidos"],
    "is_synthetic": false
  },
  "diagnostics": { "step_year": null, "autocorr_significant": false },
  "windows": {
    "columns": ["start", "end", "n", "slope_decade", "ci_low", "ci_high", "p", "p_uncorrected",
                "r1", "ols_slope_decade", "ols_p", "status", "flags"],
    "rows": [
      [1981, 2025, 45, 0.460, 0.307, 0.590, 0.000016, 0.000003, 0.08, 0.423, 0.000001, "increasing", []]
    ]
  }
}
```

La fila de ejemplo usa cifras reales del caso grabado del laboratorio (punto de cuadrícula de Mexicali, T2M, 1981–2025) solo para mostrar el formato. **No es el resultado de Baja California**; los `values` en cero son marcadores.

Reglas:

- Hay una fila por cada par `start ≤ end` con `end − start + 1 ≥ 10`. Un periodo más corto no tiene fila: la interfaz muestra «datos insuficientes» sin consultar nada.
- `status` ∈ `increasing` | `decreasing` | `inconclusive` | `insufficient` | `invalid`.
- `ci_low ≤ slope_decade ≤ ci_high` siempre que no sean `null`.
- Una región sin celdas no tiene archivo y figura con `n_cells: 0` en el catálogo.

## `map/{variable}.json`

```json
{
  "schema_version": 1,
  "variable": "T2M",
  "unit": "°C/década",
  "regions": ["MX-AGU", "MX-BCN"],
  "windows": { "1981-2025": [0.0, 0.0] },
  "classes": { "breaks": [-0.4, -0.1, 0.1, 0.4], "labels": ["Baja mucho", "Baja", "Casi sin cambio", "Sube", "Sube mucho"] }
}
```

`windows[clave][i]` es la pendiente por década de `regions[i]`; `null` = sin datos. Los cortes de `classes` son un ejemplo y se fijan al ver la distribución real.

## Contrato de la interfaz (estado en la URL)

`?region=MX-BCN&var=T2M&from=1981&to=2025` · valores inexistentes se sustituyen por los predeterminados y se avisa.

## Verificación

- El pipeline valida cada archivo contra este contrato antes de escribirlo.
- `web/src/lib/data.ts` declara los mismos tipos y rechaza un `schema_version` desconocido con un error recuperable.
