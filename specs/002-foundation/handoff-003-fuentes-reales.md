# Pedido a 003: pasar el pipeline a fuentes reales de GES DISC

De: quien lleva 002 · Para: quien lleva 003 · Fecha: 2026-11-14

**Decisión del equipo (2026-11-14), cerrada**: el producto final usa datos **reales** de los mismos productos de la NASA que sirve Giovanni. El pipeline los descarga de GES DISC (y LP DAAC después del MVP) con **earthaccess** y promedia cada estado con su polígono exacto. NASA POWER queda como **alternativa** si GES DISC falla. Giovanni **no se automatiza**: su interfaz es manual y su API solo acepta puntos, así que queda para validar. El método (D6) **no cambia**. «Años para ser significativo» sigue **prohibido**.

Ya está hecho en `002-foundation` (lo recibes al hacer `git rebase origin/sync_main` cuando se fusione):

- [research.md](../001-trend-explorer-mvp/research.md) D2–D7, [plan.md](../001-trend-explorer-mvp/plan.md), [data-model.md](../001-trend-explorer-mvp/data-model.md) y el [contrato](../001-trend-explorer-mvp/contracts/data-files.md), revisados.
- `web/src/lib/data.ts` acepta ya los campos y columnas nuevos. Los archivos de ejemplo de `web/public/data/trends/` siguen el contrato nuevo y te sirven de referencia de forma.
- Mi visto bueno a tus dependencias, en la sección 6.

## 1. Productos de la primera entrega (verificados en Giovanni)

| `id` del contrato | Producto | Variable en el archivo | Malla | Unidad original → anual | Periodo |
|---|---|---|---|---|---|
| `air_temperature` | MERRA-2 `M2TMNXSLV` v5.12.4 (ID Giovanni `M2TMNXSLV_5_12_4_T2M`) | `T2M` | 0,5° × 0,625° | K → °C (media ponderada por días) | 1980–2025 |
| `precipitation` | GPM IMERG Final mensual `GPM_3IMERGM` v07 (ID Giovanni `GPM_3IMERGM_07_precipitation`) | `Grid/precipitation`, dimensiones **`time, lon, lat`** | 0,1° × 0,1° | mm/h → mm/mes (× horas del mes) → mm/año (suma de 12) | 2001–2025 (empieza en 2000-06) |

Después del MVP, con la misma interfaz: GLDAS `GLDAS_NOAH025_M` v2.1 (humedad del suelo y temperatura de superficie), MERRA-2 `M2TMNXAER` `TOTEXTTAU` (aerosoles) y NDVI de MODIS `MOD13C2` por LP DAAC (no está en Giovanni).

## 2. Qué reutilizar y qué sustituir

- **Se conservan**: `weights.py`, `contract.py`, `build.py`, `regions.py` y el motor `trendlens/` (stats, processing). Igual las pruebas del motor y de los pesos.
- **Se sustituye** `power_regional.py`, que queda como alternativa, por **adaptadores por producto** con una interfaz común. Por ejemplo, `pipeline/sources/merra2.py` e `pipeline/sources/imerg.py`, y `pipeline/sources/power.py` para la alternativa.
- **Interfaz común**: cada adaptador devuelve una rejilla de celdas `(lats, lons, meses, valores)` en la unidad mensual ya convertida, más su procedencia (`short_name`, `version`, `doi`, gránulos, manifiesto). A partir de ahí sigue **la misma ruta**: pesos → serie mensual regional → años completos → ventanas → escritura validada, todo o nada.

## 3. Lectura mínima, caché y manifiesto

- **Acceso**: `earthaccess.login()`, luego `earthaccess.search_data(short_name=…, version=…, temporal=…)` y `earthaccess.open(...)`. Lectura con `xarray` + `h5netcdf`; en IMERG, `group="Grid"`. Nada de OPeNDAP ni HTTPS locales de GES DISC, que se apagaron en la migración a Earthdata Cloud.
- **Solo lo necesario**: la variable pedida y el recuadro de México, EE. UU. continental, Alaska, Hawái y Puerto Rico. Pueden ser varios recuadros, para no leer el Pacífico entero.
- **Caché local fuera de git**: `pipeline/cache/` ya está en `pipeline/.gitignore`. Si una ejecución falla, la siguiente solo pide lo que faltó.
- **Concurrencia**: como mucho 2–4 peticiones a la vez.
- **Manifiesto**: por gránulo, su nombre, URL, fecha de lectura y huella (SHA-256). `provenance.requests` apunta al manifiesto de esa ejecución (como ya hace la T009), y `provenance.granules` cuenta los gránulos usados en la serie.

## 4. Pesos por malla y particularidades

- **Pesos calculados una vez por malla**, uno para MERRA-2 (0,5° × 0,625°) y otro para IMERG (0,1°), y reutilizados para todas las variables de esa malla. Misma regla de siempre: cos(latitud) × fracción de la celda cubierta por el polígono (D4). Recorte de Alaska en ±180° como ahora.
- **IMERG**: transponer `(lon, lat)` → `(lat, lon)` antes de pesar. El relleno −9999,9 pasa a faltante.
- **MERRA-2**: K − 273,15. Comprueba el atributo de relleno del archivo.
- **`n_cells` y `small_region` del catálogo**: se calculan con la malla de MERRA-2 (la más gruesa). `provenance.n_cells` lleva el número de celdas de la malla de cada variable.

## 5. Contrato (ya revisado; lo que cambia en `contract.py` y `build.py`)

- **Ids neutrales**: `air_temperature` y `precipitation`. Se usan en `catalog.variables[].id`, en `series.variable`, en `map.variable` y en las rutas (`series/air_temperature/…`, `map/precipitation.json`). Los ids viejos solo se aceptan en la URL del frontend.
- **Periodo por variable**: `catalog.variables[]` lleva `first_year`, `last_complete_year`, `product_short_name` y `product_version`. `catalog.period` se conserva como envolvente (1980–2025). Las ventanas de cada serie y las claves del mapa usan el periodo de **su** variable: 703 en temperatura y 136 en precipitación. Ajusta `window_keys` y la comprobación del número de llaves de la T006.
- **Procedencia**: añadir `short_name`, `version`, `doi` y `granules`. Se conservan `requests` (manifiesto) y el resto. `api_version` pasa a ser la versión de earthaccess o de la API de POWER.
- **Columnas opcionales**: `line_mid`, `slope_decade_pct`, `ci_low_pct` y `ci_high_pct`, tal como ya las publicas. Quedan en el contrato y en `TrendRow`/`pickWindow` como opcionales, así que **sin cambios por tu parte**.
- **Mapa de precipitación**: en `%/década` (`slope_decade_pct`), como ya haces desde la T014.
- `kind` de precipitación: `observation`.
- **`schema_version` sigue en 1**: todo es aditivo salvo los ids.

## 6. Dependencias: visto bueno de 002

- **Aprobadas**, con las versiones exactas que ya fijaste: numpy, pandas, scipy, requests (se queda por la alternativa POWER), shapely y, en `dev`, pytest y pymannkendall.
- **Se añaden** a `[project].dependencies`: `earthaccess`, `xarray` y `h5netcdf`. `h5py` entra como dependencia de `h5netcdf`; no añadas `netCDF4`.
- **Versión fija** (`==`), igual que el resto. Usa la última estable con al menos dos semanas de antigüedad el día que instales, verifica que las pruebas pasan y anota la fecha en el comentario de `pyproject.toml`.
- Con eso puedes marcar tu T001. Yo lo anoto en mi T014 al revisar la petición de fusión.

## 7. Validación

- **Giovanni, por producto**: repetir el contraste de la T008 para **US-TX y US-CA**, con MERRA-2 T2M e IMERG. Para cada caso, reportar la diferencia de las medias anuales y de la pendiente con **nuestra regla** (fracción cubierta) y con la de **«centro dentro»** (la de Giovanni). Guardar la «URL to Reproduce Results». La T008 ya mostró que la diferencia en Texas viene de la regla espacial y no de los datos (research D4).
- **Sanidad física de las 84 regiones**: rangos plausibles de temperatura media anual y de precipitación anual (≥ 0), ninguna región con todas las celdas faltantes y saltos entre años contiguos marcados para revisar.
- La serie de una sola celda frente al valor de esa celda en el gránulo debe dar diferencia ≤ 0,01.

## 8. Credenciales y pruebas

- **Credenciales**: solo en la máquina que ejecuta el pipeline (`~/.netrc` con `machine urs.earthdata.nasa.gov`, o `EARTHDATA_USERNAME` y `EARTHDATA_PASSWORD`). **Nunca en el repositorio ni en el navegador** (constitución). El `.gitignore` raíz ya excluye `.netrc`, `_netrc` y `.env*`.
- **Pruebas sin credenciales**: fixtures **pequeñas y reales**, es decir, recortes de pocos KB de un gránulo de cada producto, guardados en `pipeline/tests/fixtures/`. Las pruebas en vivo van marcadas (`live`) y se omiten salvo con `--run-live`, como ahora.

## 9. Publicación

- La **T006** (84 regiones) se ejecuta **con las fuentes nuevas, no con POWER**. Sustituye entera la carpeta `web/public/data/trends/`, ejemplos y `LEEME.md` incluidos, y deja `is_synthetic: false` en todo.
- Antes de abrir la petición de fusión: `git diff --name-only origin/sync_main...HEAD` debe listar solo `pipeline/**`, `web/public/data/trends/**` y `specs/003-*`.

## 10. Esfuerzo

En el índice he pasado 003 de 17,5 h a **31 h** (+13,5 h). Ajústalo en tu `tasks.md` si tu desglose da otra cifra y avísame.

| Trabajo nuevo | h |
|---|---|
| Interfaz común de adaptadores y adaptador MERRA-2 con earthaccess, caché y manifiesto | 4 |
| Adaptador IMERG (grupo `Grid`, transposición, relleno, tasa → acumulado) | 3 |
| Pesos por malla, incluida la de 0,1° | 1,5 |
| Contrato: ids, periodo por variable y procedencia en `contract.py` y `build.py` | 1,5 |
| Fixtures reales pequeñas y pruebas sin credenciales | 1,5 |
| Validación con Giovanni (2 regiones × 2 productos × 2 reglas) y sanidad de las 84 | 2 |
| **Total** | **13,5** |

## 11. Nota para `docs/regiones-mvp-giovanni.md`

Ese archivo no está en ninguna rama remota. Si lo tienes tú, ponle esta nota arriba (o pídeselo a 006, que es quien edita `docs/`):

> **Nota (2026-11-14)**: este documento vale por la lista de regiones, sus ids, las cajas y los casos especiales. El formato de entrega es el del [contrato](../specs/001-trend-explorer-mvp/contracts/data-files.md) (`catalog.json`, `series/`, `map/`), no el de este documento, y no se publica `yearsToDetect` ni ningún «años para detectar» (constitución; research D7).
