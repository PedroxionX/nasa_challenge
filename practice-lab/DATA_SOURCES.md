# Fuentes de datos

## 1. NASA POWER — integrada y VERIFICADA (2026-11-06)

**Endpoint:** `GET https://power.larc.nasa.gov/api/temporal/monthly/point`
**Ejemplo real usado en las pruebas:**
```
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=-115.45&latitude=32.62&start=1981&end=2025&format=JSON
```
No requiere autenticación ni clave de API.

| Hecho | Valor observado | Cómo se verificó |
|---|---|---|
| Versión de la API | `v2.10.0` ("POWER Monthly and Annual API") | `header.api` de la respuesta |
| Fuente declarada | `["MERRA2"]` | `header.sources` |
| Unidades T2M | `"C"` (°C), longname "Temperature at 2 Meters" | `parameters.T2M` |
| Unidades PRECTOTCORR | `"mm/day"` (tasa media diaria del mes), longname "Precipitation Corrected" | `parameters.PRECTOTCORR` |
| Formato de fechas | claves `"YYYYMM"`; **`"YYYY13"` = valor anual** | `properties.parameter` |
| Valor de relleno | `-999.0` (p. ej. oct–nov 2026 aún sin procesar) | `header.fill_value` y respuesta 2025–2026 |
| Inicio de la serie | 1981; `start=1979` ⇒ **HTTP 422** "The data starts at 1981/01/01." | solicitud real |
| Parámetro inválido | **HTTP 422** "One of your parameters is incorrect: NOTAPARAM." | solicitud real |
| Geometría | `coordinates = [lon, lat, elevación]` (p. ej. 156.89 m en Mexicali) | `geometry` |
| Estándar temporal | `"LST"` | `header.time_standard` |
| Límite documentado | hasta 20 parámetros por solicitud de un punto | página de documentación del endpoint mensual |
| Formatos documentados | JSON, CSV, ASCII, NetCDF (ICASA no) | página de documentación |
| Resolución (documentada) | MERRA-2: ½° lat × ⅝° lon, nativa; desde el 1 de enero de 1981 | página de metodología de POWER |
| Latencia (documentada) | MERRA-2 ≈ 1 mes; GEOS-IT se anexa para casi tiempo real (≈ 2 días) | página de metodología de POWER |

### Trampas encontradas (lecciones para el hackathon)
1. **`PRECTOTCORR_SUM` declara `"mm/day"`, pero sus valores son acumulados mensuales en mm.** Por ejemplo,
   en marzo de 2020: tasa 1.72 mm/día × 31 = 53.3, y SUM = 53.39. El laboratorio usa la tasa y convierte por
   su cuenta (`test_prectotcorr_sum_label_inconsistency_is_documented`). **Nunca confíes ciegamente en la etiqueta.**
2. **El "mes 13" es anual:** si no se filtra, se mezcla como un mes más.
3. **El año en curso viene con −999** en los meses pendientes y sin valor anual.
4. **Cambio de producto en el tramo reciente:** la documentación indica que GEOS-IT se anexa tras MERRA-2
   para baja latencia. En nuestras respuestas mensuales `header.sources` solo dijo `MERRA2`, pero el
   laboratorio advierte si aparecen varias fuentes.
5. **Punto ≠ región:** el valor es de una celda de ~50–60 km del reanálisis, no de una estación ni de un municipio.
6. **Certificados:** `spaceappschallenge.org` falló la validación TLS desde esta máquina; `power.larc.nasa.gov` funcionó.

### Caché local
Las respuestas válidas se guardan en `.cache/power/` (TTL de 7 días; ignorado por git). La interfaz indica
"desde caché local" en la procedencia. Los errores **nunca** se guardan.

## 2. Fuentes futuras por investigar (NO integradas; datos sin verificar en esta sesión)

> Todo lo de esta sección es **conocimiento previo por confirmar** en la documentación oficial. No se hizo
> ninguna solicitud a estos servicios.

| Producto / servicio | Qué ofrece | Resolución típica | Acceso y autenticación | Formato | Cómo estudiarlo |
|---|---|---|---|---|---|
| **GPM IMERG** (precipitación satelital) | Precipitación multisatélite | 0.1°; media hora, diaria y mensual | GES DISC; **Earthdata Login** | HDF5 / NetCDF4 | Comparar la serie mensual de un punto con PRECTOTCORR. POWER sirve IMERG diario a 0.1° (desde 1998, según su documentación) |
| **GLDAS** (modelo de superficie terrestre) | Humedad del suelo, ET, escorrentía, nieve, temperatura | 0.25° y 1°; 3 h y mensual | GES DISC; Earthdata Login | NetCDF4 | Tendencias de humedad del suelo; vigilar el cambio de versión (2.0 / 2.1 / 2.2): **no mezclar versiones** |
| **MODIS** (Terra 2000–, Aqua 2002–) | LST, NDVI/EVI, albedo, cobertura | 250 m – 5.6 km; 8–16 días y mensual | LP DAAC / AppEEARS; Earthdata Login | HDF-EOS / GeoTIFF / CSV (AppEEARS) | Extraer un punto con AppEEARS; atender las banderas de calidad (QA) y los huecos por nubes |
| **MERRA-2** directo | Reanálisis completo (cientos de variables) | 0.5° × 0.625°; horario y mensual | GES DISC; Earthdata Login | NetCDF4 | Útil si POWER no tiene la variable; leer con `xarray` |
| **NASA Giovanni** | Visualización y análisis en línea (series promediadas por área, mapas) | según el producto | Web; Earthdata Login | PNG / NetCDF / CSV | Validar nuestras series contra una herramienta oficial |
| **NASA Earthdata** (Search, CMR, EDL) | Catálogo y descarga unificados | — | Earthdata Login (usuario + token) | — | Librería `earthaccess` (Python) para buscar y descargar con autenticación |

### Regla de diseño
El prototipo **no** depende de cinco APIs. Cada fuente nueva entra como **un adaptador** que produce el
esquema normalizado (`trendlens/schema.py`). El motor científico no cambia.
