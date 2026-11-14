# Feature Specification: Pipeline de datos y motor de tendencias

**Feature Branch**: `003-data-pipeline`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md). Produce los archivos que lee el frontend. Decisiones de fuente, promedio espacial y método en [../001-trend-explorer-mvp/research.md](../001-trend-explorer-mvp/research.md) (D2 a D7). Pedido de 002 para pasar a fuentes reales de GES DISC: [../002-foundation/handoff-003-fuentes-reales.md](../002-foundation/handoff-003-fuentes-reales.md).

## Clarifications

### Session 2026-11-14

- Q: ¿Qué hacemos con la parte de Alaska que cruza el meridiano 180° (Aleutianas occidentales, longitud hasta −188,9° en el GeoJSON)? → A: Recortar el polígono en −180°; las Aleutianas occidentales quedan fuera y se anota en `provenance.transformations`.
- Q: Al correr las 84 regiones, si un bloque de descarga de POWER sigue fallando tras reintentarlo, ¿el pipeline se detiene o publica lo demás? → A: Se detiene sin escribir en `web/public/data/trends/`, informa bloques y regiones fallidos, y al volver a correr la caché reutiliza lo ya descargado.
- Q: ¿El archivo del mapa (`map/{variable}.json`) trae la pendiente de las 84 regiones para todas las ventanas de 10 años o más, o solo para 1981–2025? → A: Todas las ventanas de 10 años o más (666 llaves `"inicio-fin"` con POWER 1981–2025; con las fuentes reales, las del periodo de cada variable: ver FR-D05), para que el mapa siga al periodo elegido.
- Q: En el mapa de precipitación, ¿cada estado se colorea por su cambio en mm/año por década o por su cambio relativo en % por década? → A: % por década (pendiente ÷ media de la ventana × 100), calculado en el pipeline; la temperatura sigue en °C/década y las series en mm/año. Se avisa a quien lleva 002 del `unit` `%/década`.
- Q: ¿Con qué estado de EE. UU. se hace la comparación contra Giovanni (T008)? → A: Texas (`US-TX`), la misma serie validada en T005.
- Q: (Pedido de 004, 2026-11-14) ¿El pipeline publica también el cambio de precipitación en % por década para el panel? → A: Sí. Tres columnas al final de `windows`: `slope_decade_pct`, `ci_low_pct`, `ci_high_pct` = pendiente e intervalo por década ÷ media de los valores anuales de esa ventana × 100; `null` en T2M y cuando la media es ≤ 0; documentado en `provenance.transformations`. El cambio del contrato (`contracts/data-files.md`, `TrendRow`) lo hace quien lleva 002.
- Q: (Segundo pedido de 004, 2026-11-14) ¿Cómo dibuja el panel la recta de Sen sin calcular en el navegador? → A: Columna `line_mid` en `windows`, antes de las de %: valor de la recta de Theil-Sen en el año central `c = (start + end) / 2`, en `unit_annual`, `mediana(yᵢ − b·(tᵢ − c))` sobre los años completos de la ventana con `b = slope_decade / 10`; `null` exactamente cuando `slope_decade` es `null`. Orden final de las columnas añadidas: `line_mid`, `slope_decade_pct`, `ci_low_pct`, `ci_high_pct`; `schema_version` sigue en 1; `map/` no cambia.
- Q: (Decisión del equipo y pedido de 002, 2026-11-14) ¿De dónde salen los datos publicados? → A: De los mismos productos que sirve Giovanni, leídos de GES DISC con `earthaccess`: `air_temperature` = MERRA-2 `M2TMNXSLV` v5.12.4, `T2M` (K → °C), 1980–2025; `precipitation` = GPM IMERG Final `GPM_3IMERGM` v07, `Grid/precipitation` (mm/h, dimensiones `time, lon, lat`), 2001–2024 completos (la colección v07 está cerrada y termina en 2025-09; 2025 queda como año parcial). NASA POWER queda como alternativa si GES DISC falla, **solo si alguien la elige a mano** (`--source power`); nunca se activa sola. Giovanni no se automatiza: solo valida. El método (D6) no cambia y «años para detectar» sigue prohibido.
- Q: ¿Se descargan los archivos completos? → A: No. Completos son 552 gránulos de MERRA-2 (31,5 GB) y 297 de IMERG (5,3 GB). Se abre cada gránulo con `earthaccess.open` y se lee solo la variable y el recuadro de las regiones (medido el 2026-11-14: ~18 s por gránulo de MERRA-2 y ~6 s por gránulo de IMERG); el recorte queda en caché local fuera de git.
- Q: ¿Cómo se autentica en Windows? → A: `earthaccess` busca `~/_netrc` en Windows; si no existe y sí existe `~/.netrc`, el pipeline apunta `NETRC` a `~/.netrc` antes de iniciar sesión. Las credenciales nunca están en el repositorio ni en el navegador.

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `pipeline/**` · `web/public/data/trends/**` (desde que se fusiona la base) | `web/src/**`, `web/package.json`, `web/public/textures/**`, `web/public/data/*.geojson` (solo los lee) |

Si el contrato necesita un cambio, se pide a quien lleva 002; no se edita desde esta rama.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una serie real validada (Priority: P1)

Para una región y una variable existe un archivo con la serie anual, la tabla de ventanas y la procedencia, y sus cifras coinciden con la fuente.

**Independent Test**: el valor regional de una región de una sola celda (`US-DC`) coincide con el valor de esa celda en el gránulo de origen, con diferencia ≤ 0,01, en cada producto. (Con la alternativa POWER se cumplió el 2026-11-14 para Baja California, Texas y `US-DC`, también frente a la clave anual de la fuente: `pipeline/validation/t005.json`.)

**Acceptance Scenarios**:

1. **Given** el núcleo del laboratorio en `pipeline/`, **When** se ejecutan sus pruebas, **Then** pasan todas las pruebas traídas (83 aprobadas y 1 omitida en vivo, registro de T001 del 2026-11-14) sin importar Streamlit ni Plotly.
2. **Given** un fallo de red o una unidad inesperada, **When** se descarga, **Then** el resultado es un error, nunca datos.

### User Story 2 - Todas las regiones y las dos variables (Priority: P1)

Los 84 estados y las dos variables (`air_temperature` de MERRA-2 y `precipitation` de IMERG) quedan escritos según el contrato, con manifiesto de lecturas.

**Independent Test**: cada archivo valida contra el contrato; toda fila tiene estado; las series de temperatura tienen 703 filas (1980–2025) y las de precipitación 120 (2001–2024; IMERG v07 termina en 2025-09). El periodo de cada variable se deriva de los datos: primer y último año con 12 meses; `is_synthetic: false` en todo.

### User Story 3 - Validación externa (Priority: P2)

Texas (`US-TX`) y California (`US-CA`) se comparan con Giovanni para los dos productos y el resultado se anota.

**Independent Test**: para cada región × producto (MERRA-2 `T2M`, IMERG `precipitation`), *Time Series: Area-Averaged* de Giovanni con la forma del estado y el mismo periodo, frente al pipeline con **dos reglas**: la nuestra (fracción cubierta, FR-D02) y la de «centro dentro» que usa Giovanni (research D4). Se reportan la diferencia de las medias anuales y la de la pendiente, con la «URL to Reproduce Results». Con la regla de «centro dentro» las medias anuales difieren ≤ 0,1 °C en temperatura y ≤ 2 % de la media anual del periodo en precipitación; con la nuestra, la diferencia se documenta con su causa (resultado previo de Texas con POWER: `pipeline/validation/t008_giovanni_us-tx.json`).

## Requirements *(mandatory)*

- **FR-D01**: Lectura por **adaptadores de fuente** con una interfaz común (`pipeline/sources/`): cada uno devuelve una rejilla de celdas (latitudes, longitudes, meses, valores en la unidad mensual nativa) y su procedencia. Adaptadores: MERRA-2 y IMERG con `earthaccess` (`search_data` + `open`, lectura con `xarray`/`h5netcdf` solo de la variable y del recuadro de las regiones, como mucho 4 lecturas a la vez) y la alternativa POWER (teselas de 2° a 10°, un parámetro por solicitud). Todos con caché local fuera de git y manifiesto por solicitud o gránulo (nombre, URL, fecha y huella SHA-256 de lo leído). Si una lectura sigue fallando tras 3 reintentos, la ejecución se detiene **sin escribir nada** en `web/public/data/trends/` (la publicación es todo o nada) y lista lo que falló y las regiones afectadas; una nueva ejecución reutiliza la caché y solo vuelve a pedir lo que falló. Un fallo nunca produce datos ni cambia de fuente en silencio (constitución II): la alternativa POWER solo se usa si se pide explícitamente con `--source power`, y entonces los archivos lo declaran: `provenance.source`, `short_name` y `version` de POWER, y `kind: "reanalysis"` en la precipitación (`PRECTOTCORR`), para que la interfaz lo rotule.
- **FR-D02**: Promedio regional ponderado por cos(latitud) y cobertura del polígono; regla y aviso de región pequeña (cubre FR-003 de 001). Los pesos se calculan una vez **por malla** (MERRA-2 0,5° × 0,625°; IMERG 0,1° × 0,1°) y se reutilizan; `n_cells` y `small_region` del catálogo usan la malla de MERRA-2, y `provenance.n_cells` la de cada variable. Antes de calcular pesos, toda geometría se recorta a longitudes en [−180°, 180°]; en `US-AK` esto excluye las Aleutianas al oeste de 180° y la serie lo declara en `provenance.transformations` («Aleutianas al oeste de 180° excluidas»). Prueba: el polígono recortado de Alaska no tiene longitudes < −180° y su serie lleva esa transformación.
- **FR-D03**: Años completos; nada se interpola. MERRA-2: K − 273,15 y el relleno declarado en el archivo pasa a faltante. IMERG: dimensiones `(lon, lat)` transpuestas a `(lat, lon)` antes de pesar, −9999,9 pasa a faltante y la tasa (mm/h) se convierte a acumulado mensual con las horas reales del mes; el año es la suma de 12 meses.
- **FR-D04**: Theil-Sen, intervalo de Sen y Mann-Kendall corregido para todas las ventanas de al menos 10 años; estado asignado aquí (FR-006 a FR-008).
- **FR-D05**: Salida validada contra el contrato revisado del 2026-11-14; procedencia obligatoria (FR-010). Ids neutrales de variable (`air_temperature`, `precipitation`) en el catálogo, las series, el mapa y las rutas. **Periodo por variable**: `catalog.variables[]` lleva `first_year`, `last_complete_year`, `product_short_name` y `product_version`; `catalog.period` es la envolvente. La procedencia añade `short_name`, `version`, `doi` y `granules`. `map/{variable}.json` incluye una llave `"inicio-fin"` por cada ventana con al menos 10 años **dentro del periodo de su variable** (hoy 703 en temperatura 1980–2025 y 120 en precipitación 2001–2024; el periodo sale de los datos: primer y último año con 12 meses en la fuente), cada una con la pendiente por década de las 84 regiones en el orden de `regions` (`null` sin datos), de modo que el mapa siga al periodo elegido sin calcular en el navegador. Prueba: las llaves del mapa coinciden con las filas de `windows` de las series y cada valor es igual a su `slope_decade`, salvo en variables con `relative_change: true` (precipitación), donde el mapa lleva `unit: "%/década"` y cada valor es `slope_decade ÷ media de la serie en esa ventana × 100` (`null` si la media es ≤ 0), igual a la columna `slope_decade_pct`. La tabla `windows` añade al final `line_mid` (recta de Theil-Sen en el año central de la ventana, `null` exactamente cuando `slope_decade` es `null`) y `slope_decade_pct`, `ci_low_pct` y `ci_high_pct` (mismo cálculo para pendiente e intervalo; `null` en variables sin `relative_change`, cuando la media es ≤ 0 o si la cifra de origen es `null`; `ci_low_pct ≤ slope_decade_pct ≤ ci_high_pct` y mismo signo que `slope_decade`); las demás columnas siguen en `unit_annual`. Ambas fórmulas se declaran en `provenance.transformations`. Este uso de `unit` en el mapa se comunica a quien lleva 002 antes de publicar.
- **FR-D06**: Los datos sintéticos solo existen en pruebas y van marcados.
- **FR-D07**: Texto de atribución de la fuente en `pipeline/ATTRIBUTION.md`, para que 006 lo cite; incluye MERRA-2 e IMERG con su DOI.
- **FR-D08**: Credenciales de Earthdata solo en la máquina que ejecuta el pipeline (`~/.netrc` o `EARTHDATA_USERNAME`/`EARTHDATA_PASSWORD`), nunca en el repositorio, en la salida ni en el manifiesto. En Windows, si falta `~/_netrc` y existe `~/.netrc`, se usa este. Las pruebas corren sin credenciales con fixtures pequeñas y reales; las que leen en vivo van marcadas `live` y se omiten salvo con `--run-live`.

## Success Criteria *(mandatory)*

- **SC-D01**: Coincidencia con una implementación independiente (`pymannkendall`, `scipy`) dentro de las tolerancias de las pruebas (SC-006 de 001).
- **SC-D02**: Una serie real coincide con una referencia externa (SC-007 de 001).
- **SC-D03**: Tiempo de cómputo y tamaño total medidos y anotados.

## Assumptions

- Se reutiliza el código del laboratorio (decisión del equipo, 2026-11-14).
- El equipo dispone de cuenta de Earthdata Login (confirmado el 2026-11-14), así que la validación con Giovanni se hace. Las credenciales no se guardan en el repositorio.
- Acceso a GES DISC verificado el 2026-11-14 con `earthaccess` 0.19.0 desde fuera de la nube (HTTPS de `data.gesdisc.earthdata.nasa.gov`). Dependencias nuevas aprobadas por 002, con versión fija: `earthaccess`, `xarray`, `h5netcdf` y `h5py` (este último hay que declararlo: `h5netcdf` 1.8 ya no lo instala).
