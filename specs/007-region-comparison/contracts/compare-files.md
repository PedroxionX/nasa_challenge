# Contrato: archivos de comparación entre regiones

Ampliación de [../../001-trend-explorer-mvp/contracts/data-files.md](../../001-trend-explorer-mvp/contracts/data-files.md). **Solo añade archivos**: no cambia ninguno existente y `schema_version` sigue en 1. Un lector que no conozca `compare/` sigue funcionando. Ruta base: `web/public/data/trends/compare/`. Mismas reglas generales: JSON UTF-8, punto decimal, `null` para lo no evaluable.

Estado: borrador de 007. Quien lleva 002 lo incorpora al contrato principal al aceptar la petición de fusión.

## Variables: lista abierta

Las variables son las que declara `catalog.variables[]`; el contrato deja de enumerarlas. Un `id` es estable y tiene la forma `^[a-z][a-z0-9_]*$`. Ningún lector debe depender de una lista fija: todo lo que necesita (etiqueta, definición, unidad, periodo, `relative_change`) está en el catálogo.

## `compare/index.json`

```json
{
  "schema_version": 1,
  "built_at_utc": "2026-11-15T03:00:00Z",
  "alpha": 0.05,
  "method": { "series": "difference-common-years", "slope": "theil-sen",
              "test": "mann-kendall-ar1-corrected", "interval": "sen-1968-95" },
  "variables": {
    "precipitation": {
      "basis": "relative",
      "unit": "puntos porcentuales/década",
      "end": 2024,
      "starts": [2001, 2002, 2003],
      "n_pairs": 3486,
      "series_sha256": "…"
    }
  }
}
```

- Una variable del catálogo puede no figurar aquí: significa que su prueba de la diferencia aún no se ha publicado. No es un error.
- `basis`: `absolute` si la variable tiene `relative_change: false` (diferencia en `unit_annual` por década); `relative` si es `true` (cada serie en % de su media en los años comunes de la ventana; diferencia en puntos porcentuales por década).
- `end` es el `last_complete_year` de la variable; `starts` son los años iniciales con fila, todos con `end − start + 1 ≥ min_window_years`.
- `series_sha256`: huella de los archivos `series/{variable}/*.json` de los que salieron las cifras, en orden de id. `compare_build.py --check` la comprueba.

## `compare/{variable}/{region}.json`

```json
{
  "schema_version": 1,
  "variable": "precipitation",
  "region": "MX-BCN",
  "basis": "relative",
  "unit": "puntos porcentuales/década",
  "end": 2024,
  "starts": [2001, 2002, 2003],
  "columns": ["n", "diff_decade", "ci_low", "ci_high", "p", "status"],
  "partners": {
    "US-TX": [[24, 0.0, 0.0, 0.0, 1.0, "inconclusive"], [23, 0.0, 0.0, 0.0, 1.0, "inconclusive"]]
  },
  "not_comparable": { "US-DC": "identical_series" }
}
```

Las cifras del ejemplo son marcadores, no resultados.

Reglas:

- El archivo de una región contiene los pares con las regiones cuyo id va **después** en orden alfabético. El par (A, B) está en el archivo de `min(A, B)` y en ningún otro. La última región no tiene archivo.
- La diferencia es siempre **región del archivo − región asociada**. El lector no invierte el signo: presenta el par en ese orden.
- `partners[id][i]` corresponde a la ventana `starts[i]`–`end`.
- `n`: años completos comunes de la ventana. `diff_decade`, `ci_low`, `ci_high` en `unit`; `ci_low ≤ diff_decade ≤ ci_high` si no son `null`.
- `status` ∈ `differ` | `inconclusive` | `insufficient` | `invalid`. Con `insufficient` o `invalid` las cuatro cifras son `null`.
- `not_comparable[id]` ∈ `different_unit` | `different_product` | `mixed_synthetic` | `identical_series`. Un id está en `partners` o en `not_comparable`, nunca en los dos.
- Una región sin serie no aparece en ningún archivo.

## Estado en la URL

`?region=MX-BCN&vs=US-TX&var=precipitation&from=2001&to=2024` · `vs` inexistente o igual a `region` se descarta con aviso · sin `region`, `vs` se ignora.

## Lo que nunca se publica

Igual que en el contrato principal: ningún campo de «años para que la diferencia sea significativa». Tampoco una clasificación de regiones ni un orden de mejor a peor.

## Verificación

- `compare_build.py` valida cada archivo contra este contrato antes de escribir y escribe todo o nada por variable.
- `web/src/lib/data.ts` declara los mismos tipos; `not_found` en `index.json` o en un archivo de región se trata como «prueba no publicada», no como error.
