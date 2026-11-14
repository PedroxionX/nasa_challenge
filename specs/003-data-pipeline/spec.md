# Feature Specification: Pipeline de datos y motor de tendencias

**Feature Branch**: `003-data-pipeline`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md). Produce los archivos que lee el frontend. Decisiones de fuente, promedio espacial y método en [../001-trend-explorer-mvp/research.md](../001-trend-explorer-mvp/research.md) (D2 a D6).

## Clarifications

### Session 2026-11-14

- Q: ¿Qué hacemos con la parte de Alaska que cruza el meridiano 180° (Aleutianas occidentales, longitud hasta −188,9° en el GeoJSON)? → A: Recortar el polígono en −180°; las Aleutianas occidentales quedan fuera y se anota en `provenance.transformations`.
- Q: Al correr las 84 regiones, si un bloque de descarga de POWER sigue fallando tras reintentarlo, ¿el pipeline se detiene o publica lo demás? → A: Se detiene sin escribir en `web/public/data/trends/`, informa bloques y regiones fallidos, y al volver a correr la caché reutiliza lo ya descargado.
- Q: ¿El archivo del mapa (`map/{variable}.json`) trae la pendiente de las 84 regiones para todas las ventanas de 10 años o más, o solo para 1981–2025? → A: Todas las ventanas de 10 años o más (666 llaves `"inicio-fin"`), para que el mapa siga al periodo elegido.
- Q: En el mapa de precipitación, ¿cada estado se colorea por su cambio en mm/año por década o por su cambio relativo en % por década? → A: % por década (pendiente ÷ media de la ventana × 100), calculado en el pipeline; la temperatura sigue en °C/década y las series en mm/año. Se avisa a quien lleva 002 del `unit` `%/década`.
- Q: ¿Con qué estado de EE. UU. se hace la comparación contra Giovanni (T008)? → A: Texas (`US-TX`), la misma serie validada en T005.
- Q: (Pedido de 004, 2026-11-14) ¿El pipeline publica también el cambio de precipitación en % por década para el panel? → A: Sí. Tres columnas al final de `windows`: `slope_decade_pct`, `ci_low_pct`, `ci_high_pct` = pendiente e intervalo por década ÷ media de los valores anuales de esa ventana × 100; `null` en T2M y cuando la media es ≤ 0; documentado en `provenance.transformations`. El cambio del contrato (`contracts/data-files.md`, `TrendRow`) lo hace quien lleva 002.
- Q: (Segundo pedido de 004, 2026-11-14) ¿Cómo dibuja el panel la recta de Sen sin calcular en el navegador? → A: Columna `line_mid` en `windows`, antes de las de %: valor de la recta de Theil-Sen en el año central `c = (start + end) / 2`, en `unit_annual`, `mediana(yᵢ − b·(tᵢ − c))` sobre los años completos de la ventana con `b = slope_decade / 10`; `null` exactamente cuando `slope_decade` es `null`. Orden final de las columnas añadidas: `line_mid`, `slope_decade_pct`, `ci_low_pct`, `ci_high_pct`; `schema_version` sigue en 1; `map/` no cambia.

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `pipeline/**` · `web/public/data/trends/**` (desde que se fusiona la base) | `web/src/**`, `web/package.json`, `web/public/textures/**`, `web/public/data/*.geojson` (solo los lee) |

Si el contrato necesita un cambio, se pide a quien lleva 002; no se edita desde esta rama.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una serie real validada (Priority: P1)

Para una región y una variable existe un archivo con la serie anual, la tabla de ventanas y la procedencia, y sus cifras coinciden con la fuente.

**Independent Test**: Baja California y Texas con `T2M`: el valor de una región de una sola celda coincide con el endpoint por punto, y las medias anuales con la clave anual de la fuente, con diferencia ≤ 0,01.

**Acceptance Scenarios**:

1. **Given** el núcleo del laboratorio en `pipeline/`, **When** se ejecutan sus pruebas, **Then** pasan todas las pruebas traídas (83 aprobadas y 1 omitida en vivo, registro de T001 del 2026-11-14) sin importar Streamlit ni Plotly.
2. **Given** un fallo de red o una unidad inesperada, **When** se descarga, **Then** el resultado es un error, nunca datos.

### User Story 2 - Todas las regiones y las dos variables (Priority: P1)

Los 84 estados y las dos variables quedan escritos según el contrato, con manifiesto de descargas.

**Independent Test**: cada archivo valida contra el contrato; toda fila tiene estado.

### User Story 3 - Validación externa (Priority: P2)

Texas (`US-TX`), la misma serie validada en la T005, se compara con una herramienta oficial (Giovanni) y el resultado se anota.

**Independent Test**: medias anuales de `T2M` de Texas en el pipeline frente a Giovanni (*Time Series: Area-Averaged*, variable `T2M` de MERRA-2, forma del estado de Texas, mismo periodo): diferencia ≤ 0,1 °C en cada año, con la «URL to Reproduce Results» registrada.

## Requirements *(mandatory)*

- **FR-D01**: Descarga por teselas de 2° a 10°, un parámetro por solicitud, con caché y manifiesto de URL, fecha y huella. Si un bloque sigue fallando, la ejecución se detiene **sin escribir nada** en `web/public/data/trends/` (la publicación es todo o nada) y lista los bloques y regiones afectados; una nueva ejecución reutiliza la caché y solo vuelve a pedir lo que falló.
- **FR-D02**: Promedio regional ponderado por cos(latitud) y cobertura del polígono; regla y aviso de región pequeña (cubre FR-003 de 001). Antes de calcular pesos, toda geometría se recorta a longitudes en [−180°, 180°]; en `US-AK` esto excluye las Aleutianas al oeste de 180° y la serie lo declara en `provenance.transformations` («Aleutianas al oeste de 180° excluidas»). Prueba: el polígono recortado de Alaska no tiene longitudes < −180° y su serie lleva esa transformación.
- **FR-D03**: Años completos; tasa de precipitación convertida a acumulado; nada se interpola.
- **FR-D04**: Theil-Sen, intervalo de Sen y Mann-Kendall corregido para todas las ventanas de al menos 10 años; estado asignado aquí (FR-006 a FR-008).
- **FR-D05**: Salida validada contra el contrato; procedencia obligatoria (FR-010). `map/{variable}.json` incluye una llave `"inicio-fin"` por cada ventana con al menos 10 años (666 entre 1981 y 2025), cada una con la pendiente por década de las 84 regiones en el orden de `regions` (`null` sin datos), de modo que el mapa siga al periodo elegido sin calcular en el navegador. Prueba: las llaves del mapa coinciden con las filas de `windows` de las series y cada valor es igual a su `slope_decade`, salvo en variables con `relative_change: true` (precipitación), donde el mapa lleva `unit: "%/década"` y cada valor es `slope_decade ÷ media de la serie en esa ventana × 100` (`null` si la media es ≤ 0), igual a la columna `slope_decade_pct`. La tabla `windows` añade al final `line_mid` (recta de Theil-Sen en el año central de la ventana, `null` exactamente cuando `slope_decade` es `null`) y `slope_decade_pct`, `ci_low_pct` y `ci_high_pct` (mismo cálculo para pendiente e intervalo; `null` en variables sin `relative_change`, cuando la media es ≤ 0 o si la cifra de origen es `null`; `ci_low_pct ≤ slope_decade_pct ≤ ci_high_pct` y mismo signo que `slope_decade`); las demás columnas siguen en `unit_annual`. Ambas fórmulas se declaran en `provenance.transformations`. Este uso de `unit` en el mapa se comunica a quien lleva 002 antes de publicar.
- **FR-D06**: Los datos sintéticos solo existen en pruebas y van marcados.
- **FR-D07**: Texto de atribución de la fuente en `pipeline/ATTRIBUTION.md`, para que 006 lo cite.

## Success Criteria *(mandatory)*

- **SC-D01**: Coincidencia con una implementación independiente (`pymannkendall`, `scipy`) dentro de las tolerancias de las pruebas (SC-006 de 001).
- **SC-D02**: Una serie real coincide con una referencia externa (SC-007 de 001).
- **SC-D03**: Tiempo de cómputo y tamaño total medidos y anotados.

## Assumptions

- Se reutiliza el código del laboratorio (decisión del equipo, 2026-11-14).
- El equipo dispone de cuenta de Earthdata Login (confirmado el 2026-11-14), así que la validación con Giovanni se hace. Las credenciales no se guardan en el repositorio.
