# Datos reales — versión PROVISIONAL (NASA POWER)

Publicado por 003 el 2026-11-14 con `python pipeline/build.py --source power --out web/public/data/trends`.
**Son datos reales** (`provenance.is_synthetic: false`) de las 84 regiones y las dos variables, con las tendencias de
todas las ventanas de al menos 10 años, según el [contrato](../../../../specs/001-trend-explorer-mvp/contracts/data-files.md)
revisado el 2026-11-14.

**Por qué es provisional:** la fuente acordada por el equipo son los productos de GES DISC (MERRA-2 `M2TMNXSLV` e
IMERG `GPM_3IMERGM`), cuya lectura completa tarda más de una hora. Mientras termina se publica la alternativa
NASA POWER, elegida a mano y declarada en cada archivo. Esta carpeta se sustituirá entera por la salida de GES DISC.

| Variable | Fuente en esta versión | Periodo | Ventanas | Mapa |
|---|---|---|---|---|
| `air_temperature` | NASA POWER `T2M` = el mismo MERRA-2 (`kind: reanalysis`) | 1981–2025 | 666 | `°C/década` |
| `precipitation` | NASA POWER `PRECTOTCORR`, reanálisis MERRA-2 (`kind: reanalysis`) | 1981–2025 | 666 | `%/década` |

Al pasar a GES DISC cambian: temperatura 1980–2025 (703 ventanas, mismo producto) y precipitación de IMERG, que es
observación (`kind: observation`), 2001–2024 (120 ventanas). La interfaz debe tomar el periodo y el `kind` del catálogo.

Validación: `pipeline/validation/power_sanity.json` (84 regiones con valores físicos plausibles) y
`pipeline/validation/t005.json` (celdas y región de una sola celda iguales a la fuente).
Cómo citar: `pipeline/ATTRIBUTION.md`, sección 2.
