# Datos reales — fuentes de GES DISC

Publicado por 003 el 2026-11-14 con `python pipeline/build.py --out pipeline/out/gesdisc_all` (y `pipeline/fix_maps.py`),
copiado a esta carpeta tras validarlo. **Son datos reales** (`provenance.is_synthetic: false`) de las 84 regiones y las
dos variables, con las tendencias de todas las ventanas de al menos 10 años de cada variable, según el
[contrato](../../../../specs/001-trend-explorer-mvp/contracts/data-files.md) revisado el 2026-11-14.
Sustituye a la versión provisional con NASA POWER.

| Variable | Producto | Tipo | Periodo | Ventanas | Mapa |
|---|---|---|---|---|---|
| `air_temperature` | MERRA-2 `M2TMNXSLV` v5.12.4, `T2M` (K → °C), 0,5° × 0,625° | `reanalysis` | 1980–2025 (2026 parcial) | 703 | `°C/década` |
| `precipitation` | GPM IMERG Final `GPM_3IMERGM` v07, mm/h → mm, 0,1° | `observation` | 2001–2024 (2025 parcial: la colección v07 termina en 2025-09) | 120 | `%/década` |

Cada serie es el promedio de área del estado (cos(latitud) × fracción de la celda dentro del polígono).

Validación (en `pipeline/validation/`):
- `real_single_cell.json`: la serie de una celda (US-DC) coincide con el gránulo original (diferencia 0,0).
- `real_sanity.json`: las 84 regiones con valores físicos plausibles.
- `real_giovanni_*.json`: Texas y California frente a Giovanni con dos reglas espaciales. Precipitación dentro del
  2 % con ambas; temperatura de Texas dentro de 0,1 °C con la regla de Giovanni; California explicado por el contorno.

Cómo citar: `pipeline/ATTRIBUTION.md`, sección 1. Lecturas: `pipeline/manifest/` (gránulo, URL, fecha y huella).
