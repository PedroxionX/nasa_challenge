# Datos de ejemplo — SINTÉTICOS

Estos archivos los generó 002 (T007) para que 004, 005 y 006 trabajen antes de que 003 publique los datos reales. **No son observaciones ni productos de la NASA.** Cada serie lleva `provenance.is_synthetic: true` y la interfaz debe rotularla como ejemplo.

Siguen el [contrato](../../../../specs/001-trend-explorer-mvp/contracts/data-files.md) (`schema_version: 1`). Las cifras salen de una tendencia lineal más ruido con semilla fija; no anticipan ningún resultado real.

| Archivo | Caso que ilustra en 1981–2025 |
|---|---|
| `series/T2M/MX-BCN.json` | `increasing` |
| `series/T2M/MX-SON.json` | `inconclusive` |
| `series/T2M/MX-CMX.json` | `insufficient` (años excluidos, región pequeña) |
| `series/T2M/US-TX.json` | `invalid` (escalón en 2001) |
| `series/PRECTOTCORR/MX-BCN.json` | `decreasing` |
| `series/PRECTOTCORR/MX-SON.json` | `inconclusive` |
| cualquier otra región | sin archivo → `DataError` `not_found` («sin datos») |
| `map/{variable}.json` | pendientes por década de las 84 regiones para las 666 ventanas |

003 sustituye esta carpeta entera cuando publique (su T006).
