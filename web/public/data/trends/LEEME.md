# Datos de ejemplo — SINTÉTICOS

Estos archivos los generó 002 para que 004, 005 y 006 trabajen antes de que 003 publique los datos reales. **No son observaciones ni productos de la NASA.** Cada serie lleva `provenance.is_synthetic: true` y la interfaz debe rotularla como ejemplo. Los nombres de producto (MERRA-2 `M2TMNXSLV`, GPM IMERG `GPM_3IMERGM`) solo imitan la forma de la procedencia real; los valores son inventados.

Siguen el [contrato](../../../../specs/001-trend-explorer-mvp/contracts/data-files.md) revisado el 2026-11-14 (`schema_version: 1`): ids neutrales de variable, periodo por variable, procedencia ampliada (`short_name`, `version`, `doi`, `granules`) y las columnas opcionales `line_mid`, `slope_decade_pct`, `ci_low_pct` y `ci_high_pct`. Las cifras salen de una tendencia lineal más ruido con semilla fija; no anticipan ningún resultado real.

| Variable | Periodo | Ventanas | Mapa |
|---|---|---|---|
| `air_temperature` | 1980–2025 | 703 | `°C/década` |
| `precipitation` | 2001–2025 | 136 | `%/década` (relative_change) |

| Archivo | Caso que ilustra en el periodo completo |
|---|---|
| `series/air_temperature/MX-BCN.json` | `increasing` |
| `series/air_temperature/MX-SON.json` | `inconclusive` |
| `series/air_temperature/MX-CMX.json` | `insufficient` (años excluidos, región pequeña) |
| `series/air_temperature/US-TX.json` | `invalid` (escalón en 2001) |
| `series/precipitation/MX-BCN.json` | `decreasing` (con columnas de %) |
| `series/precipitation/MX-SON.json` | `inconclusive` |
| cualquier otra región | sin archivo → `DataError` `not_found` («sin datos») |
| `map/{variable}.json` | cambio por década de las 84 regiones para todas las ventanas de su periodo |

003 sustituye esta carpeta entera cuando publique (su T006).
