# Research: Explorador de tendencias por región (MVP)

Fecha de toda la investigación: **2026-11-14**. Etiquetas: **[H]** hecho comprobado en esta sesión · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

## 1. Herramientas y método realmente usados

| Herramienta | Estado en la sesión |
|---|---|
| Spec Kit | **[H]** Instalado en el repo durante la sesión (v1.4.1.dev0, integración `claude`, skills en `.claude/skills/speckit-*`); no lo instalé yo: mi intento con `uvx` fue denegado por el clasificador de permisos. Los artefactos se redactaron siguiendo las definiciones oficiales de cada comando (`templates/commands/*.md`, v1.4.0, leídas completas) y las plantillas oficiales. `check-prerequisites.sh` resuelve la funcionalidad activa a esta carpeta. **Las skills no se invocaron una a una**; conviene pasar `/speckit-analyze` como comprobación independiente. |
| Impeccable | **[H]** No instalado ni ejecutado. Leí `SKILL.md` v4.9.1 y las guías `critique`, `critique-rubric`, `audit`, `shape`, `operate`, `mode-operate`, `mode-read`, `craft-floor`, `init`, `document`. La revisión de `ux.md` aplica esas guías a mano: sin detector, sin subagentes (equivale a su modo «DEGRADED: single-context»). |
| Navegador | **[H]** La extensión de Chrome no estaba conectada. El prototipo se ejecutó con `npm run dev` y se recorrió con Chrome 157 headless por DevTools Protocol (GPU real: Intel UHD 630 vía ANGLE Metal) en 1440×900@2x, 1024×640, 700×500, 390×844@3x táctil y 844×390. Es render real con interacción guionizada; **no** es prueba en dispositivos físicos ni con personas. Capturas y datos en `evidence/`. |
| Laboratorio | **[H]** Código leído desde `practice/trendlens-lab` con `git archive` a una carpeta temporal, sin cambiar de rama. Suite ejecutada: **120 aprobadas, 9 omitidas (en vivo)**. El ejemplo grabado reproduce las cifras de su README (Mexicali +0,46 °C/década, IC 95 % 0,31–0,59, p < 0,001; son de un punto de cuadrícula, no de un estado). |

## 2. Estado comprobado del repositorio

- **[H]** `sync_main`: frontend React 19.3 + TypeScript 7 + Vite 8 con `react-globe.gl` 2.38 y `three` 0.187 (6 archivos fuente, ~470 líneas). Selección de 84 regiones por clic o lista, cámara animada, tooltip, panel lateral. **El panel solo contiene cuatro huecos con texto fijo**: no hay datos, gráficas, motor estadístico, pruebas ni estado en la URL.
- **[H]** `practice-lab/` en `sync_main` solo conserva `.venv`, cachés y `.pyc`. El prototipo completo vive en `practice/trendlens-lab`.
- **[H]** El laboratorio tiene núcleo científico sin dependencias de interfaz: `config`, `schema`, `processing`, `stats/*`, `explain`, `export`, `data/*` no importan Streamlit; solo `ui/*`, `app.py` (Streamlit) y `viz.py` (Plotly) dependen de la interfaz.
- **[H]** Existe además `practice/trendlens-lab-impeccable`; no se revisó, por instrucción de alcance.

## 3. Decisiones

### D1. Ruta de continuidad: refactorizar conservando lo útil
- **Decision**: Ruta B. Conservar globo, geografía y recursos; sustituir la composición de `App.tsx` y el panel; extraer el núcleo científico del laboratorio a un pipeline.
- **Rationale** (evidencia en §4 y `ux.md`): el globo resuelve bien selección, cámara e impacto visual; lo que limita es la estructura que lo rodea (panel de 360 px sin contenido, barra que en móvil se apila y queda tapada, sin estados de error) y la ausencia total de datos y análisis.
- **Alternatives considered**:

| Criterio | A. Evolucionar la estructura actual | **B. Refactorizar conservando piezas** | C. Replantear la interfaz |
|---|---|---|---|
| Ajuste al reto | Medio: rellena huecos, uno de ellos objetable | Alto | Alto |
| Impacto visual | Alto | Alto | Incierto |
| Facilidad de uso | Baja en móvil (observado) | Alta si se cumple `ux.md` | Alta, a mayor coste |
| Integración de datos | Sin capa de datos | Contrato + archivos estáticos | Igual que B |
| Rendimiento | 2 280 llamadas de dibujo por cuadro, sin pausa | Mismo motor, con presupuesto y tareas | Depende de la migración |
| Accesibilidad | Parcial | Camino HTML completo | Igual que B |
| Esfuerzo | Bajo | Medio | Alto |
| Riesgo para la demo | Medio (móvil y errores) | Bajo-medio | Alto |

- **Evidencia que cambiaría la recomendación**: (a) tras T023, el globo no alcanza los objetivos de rendimiento en el teléfono de referencia → mapa 2D como vista principal en móvil; (b) en la prueba con usuarios, menos de 3 de 5 encuentran la región aun con el buscador → replantear la navegación; (c) nadie del equipo domina React → base Streamlit del laboratorio; (d) las reglas prohíben código previo → B se mantiene pero se reimplementa.
- **Migración a React Three Fiber**: no. Ningún problema observado nace de `react-globe.gl`; todos se corrigen con sus props (`pauseAnimation`, `rendererConfig`, capas) y con menos polígonos.

### D2. Fuente de datos: productos de GES DISC vía earthaccess (revisado 2026-11-14)
- **Decision** (equipo, 2026-11-14; no se reabre): el producto final usa datos **reales** de los mismos productos de la NASA que sirve Giovanni, más otras fuentes de la NASA. El pipeline descarga los productos mensuales desde **GES DISC** (y LP DAAC para MODIS) con **earthaccess**, que lee los gránulos directamente de **Earthdata Cloud**, y promedia cada estado con su polígono exacto (D4). **NASA POWER deja de ser la fuente principal** y queda como **alternativa** si GES DISC falla. **Giovanni no se automatiza**: su interfaz es manual y su API solo acepta puntos; queda para **validar** (D4, T008 de 003).
- **Rationale**: (1) mismos productos y versiones que Giovanni, de modo que la validación compara datos idénticos y solo difiere la regla espacial (T008 de 003); (2) la precipitación pasa a una observación (IMERG), lo que resuelve el riesgo de «precipitación de reanálisis poco fiable» (D3); (3) con earthaccess no se depende del OPeNDAP ni del HTTPS locales de GES DISC, que se apagaron en 2026.
- **Riesgo: migración de GES DISC a Earthdata Cloud** **[H]** (§5, aviso de migración): OPeNDAP local apagado del 20-08 al 30-09-2026, HTTPS local hasta el 30-09-2026 y redirección total tras noviembre de 2026. Por eso solo se usa el acceso en la nube (earthaccess + CMR); un cambio de rutas o de búsqueda en CMR se detecta en la primera ejecución porque el manifiesto registra gránulo, URL, fecha y huella. Si la nube falla, se usa la alternativa POWER para la temperatura (mismo MERRA-2) y la caché local ya descargada para la demo.
- **Credenciales**: earthaccess exige Earthdata Login (ver D5).
- **Alternatives considered**:

| Fuente | Hallazgo **[H]** | Uso |
|---|---|---|
| **GES DISC vía earthaccess** (MERRA-2, IMERG) | Productos mensuales en la nube; mismo origen que Giovanni; exige Earthdata Login | **Principal** |
| NASA POWER, endpoint mensual regional | Sin autenticación; API v2.10.0; MERRA-2 en 0,5° × 0,625°; relleno −999; desde 1981; caja de 2° a 10°, 1 parámetro por solicitud | **Alternativa** si GES DISC falla (solo temperatura; su precipitación es de reanálisis y se rotularía) |
| Giovanni 4.40 | Promedio por área de formas (países, estados de EE. UU., cuencas); CSV; exige Earthdata Login; sin API para áreas (solo puntos) | **Validación** manual (D4) |
| AppEEARS / LP DAAC | API con token de 48 h y tareas asíncronas; MODIS (p. ej. NDVI) | Después del MVP: NDVI de MODIS `MOD13C2` por LP DAAC con earthaccess |
| NOAA CDO v2 | Token obligatorio; 5 solicitudes/s y 10 000/día; estaciones | **Contexto** |

### D3. Variables y productos (revisado 2026-11-14)

Productos de la primera entrega, **verificados en Giovanni** por el equipo (2026-11-14). Ids de variable neutrales en el contrato; el producto va en el catálogo y en `provenance` ([contracts/data-files.md](contracts/data-files.md)).

| | Temperatura del aire | Precipitación |
|---|---|---|
| `id` en el contrato | `air_temperature` | `precipitation` |
| Producto (short name) | MERRA-2 `M2TMNXSLV` (tavgM_2d_slv_Nx) | GPM IMERG Final Run mensual `GPM_3IMERGM` |
| Versión | 5.12.4 | 07 (V07) |
| Variable en el archivo | `T2M` | `Grid/precipitation` (dimensiones `time, lon, lat`: transponer) |
| ID en Giovanni | `M2TMNXSLV_5_12_4_T2M` | `GPM_3IMERGM_07_precipitation` |
| Malla | 0,5° × 0,625° | 0,1° × 0,1° |
| Unidad original | K | mm/h (tasa media del mes) |
| Unidad anual (`unit_annual`) | °C | mm (acumulado del año) |
| Conversión | K − 273,15 | tasa × horas del mes → mm/mes |
| Agregación anual | Media ponderada por días (`mean_day_weighted`) | Suma de 12 meses (`sum_from_rate`) |
| Relleno | según atributos del archivo | −9999,9 → faltante |
| Primer dato | 1980-01 | 2000-06 |
| Periodo del contrato | **1980–2025** (703 ventanas) | **2001–2025** (136 ventanas; 2000 está incompleto) |
| Naturaleza (`kind`) | **reanálisis** (modelo + asimilación); temperatura del aire a 2 m, no de superficie | **observación** de satélite calibrada con pluviómetros |
| `relative_change` | no | sí: el mapa usa %/década |
| DOI **[P]** | 10.5067/AP1B0BA5PD2K (comprobar en CMR) | 10.5067/GPM/IMERG/3B-MONTH/07 (comprobar en CMR) |

- **Riesgo resuelto**: la precipitación ya no es de reanálisis, así que desaparece el riesgo «precipitación de reanálisis poco fiable para tendencias» del plan. Queda un límite nuevo: **25 años** de precipitación frente a 46 de temperatura, con menos potencia; la interfaz muestra siempre el periodo propio.
- **Después del MVP**: GLDAS `GLDAS_NOAH025_M` v2.1 (humedad del suelo, temperatura de superficie), MERRA-2 `M2TMNXAER` `TOTEXTTAU` (espesor óptico de aerosoles) y NDVI de MODIS `MOD13C2` por LP DAAC (no está en Giovanni).

### D4. Valor regional: promedio de área, no centroide
- **Decision**: media ponderada de las celdas que tocan el polígono, peso = cos(latitud) × fracción de la celda cubierta por el polígono. **Se mantiene** aunque Giovanni usa otra regla (ver abajo), porque es la única que da valor a regiones menores que una celda, como `US-DC`.
- **Corrección (verificado en la T008 de 003, 2026-11-14)**: la versión anterior de esta decisión decía que era «el mismo criterio que documenta Giovanni para formas». **No lo es**: Giovanni, con formas, usa **solo las celdas cuyo centro cae dentro de la forma** (ponderadas por cos(latitud)), no la fracción cubierta. En Texas (T2M de MERRA-2, 1981–2025), la regla «centro dentro» reproduce Giovanni con una diferencia máxima de 0,051 °C; la nuestra difiere en −0,098 °C de media (máx. 0,123 °C), con la **misma pendiente** (0,389 °C/década). Evidencia: `pipeline/validation/t008_giovanni_us-tx.json` en `origin/003-data-pipeline`.
- **Efecto y comunicación**: regiones menores que una celda (~3 000 km² en MERRA-2) quedan representadas por 1–4 celdas compartidas con vecinos; la interfaz muestra «Promedio de N celdas» y lo advierte cuando N ≤ 2. Con IMERG (0,1°) casi ninguna región es pequeña. Un centroide daría el valor de una sola celda y se llamaría así.

### D5. Arquitectura: pipeline previo y archivos estáticos, sin backend
- **Decision**: un pipeline en Python descarga, promedia, analiza y escribe JSON; el frontend solo lee. Se precalcula el resultado de **todas las ventanas de al menos 10 años dentro del periodo de cada variable** (703 por serie de temperatura, 1980–2025; 136 por serie de precipitación, 2001–2025).
- **Rationale**: un único motor produce todos los números (constitución I); cambiar el periodo no requiere estadística en el navegador ni servidor; la demo funciona sin red; el navegador no ve credenciales. Tamaño **[S]**: ~50 KB por serie de temperatura; medir en la T006 de 003.
- **Credenciales (revisado 2026-11-14)**: el pipeline ahora necesita **Earthdata Login** para earthaccess. Las credenciales viven **solo en la máquina que ejecuta el pipeline**: `~/.netrc` (`machine urs.earthdata.nasa.gov login … password …`) o las variables de entorno `EARTHDATA_USERNAME` y `EARTHDATA_PASSWORD`. **Nunca en el repositorio ni en el navegador** (constitución, «Restricciones adicionales»); el `.gitignore` raíz excluye `.netrc`, `_netrc` y `.env*`. Los archivos publicados en `web/public/data/trends/` no contienen nada que requiera credenciales, y las pruebas del pipeline corren sin ellas, con fixtures (las pruebas en vivo van marcadas).
- **Alternatives considered**: backend FastAPI con el motor (flexible, pero añade despliegue y un punto de fallo en la demo; es la evolución natural para regiones libres) · portar el motor a TypeScript (dos motores que mantener coherentes) · acceso en vivo desde el navegador (exigiría credenciales en el navegador: prohibido).

### D6. Método estadístico principal
- **Sin cambios con las fuentes reales (2026-11-14)**: se aplica igual a ambas variables, cada una sobre su propio periodo.
- **Decision**: sobre la serie **anual de años completos**: pendiente de **Theil-Sen** e intervalo de Sen; **Mann-Kendall con corrección de varianza por autocorrelación de lag 1** como prueba; MCO con ajuste de Santer et al. (2000) como contraste en los detalles técnicos.
- **Rationale**: el laboratorio ya lo implementa y prueba (contra `pymannkendall`, `scipy.stats.theilslopes` y valores a mano) y lo eligió con un Monte Carlo propio. Agregar a años completos elimina el ciclo estacional sin suponer un modelo. MK no exige normalidad y Sen resiste atípicos. `linregress` documenta que su valor p es una prueba de Wald con distribución t sobre «pendiente = 0» y solo menciona normalidad de residuos, no independencia.
- **Limitación declarada** **[H]** (experimento del laboratorio): con φ = 0,75 y n = 30–45, la prueba corregida rechaza ~9–11 % en vez de 5 %. Se advierte cuando r₁ es significativo.
- **Alternatives considered**: MCO sobre datos mensuales, como en el artículo de SeaWiFS (regresión de mínimos cuadrados con ANOVA y p < 0,05 sobre 9–10 años): sencillo, pero trata meses correlacionados como independientes · Mann-Kendall estacional (Hirsch, Slack y Smith 1982): útil con huecos, pero supone independencia entre estaciones; la corrección de Hirsch y Slack (1984) no está implementada → queda como diagnóstico · pruebas de raíz unitaria: no responden si hay tendencia determinista · comparación de medias entre dos mitades: no estima una tasa.
- Definiciones para la interfaz: **pendiente** = mediana de las pendientes entre todos los pares de años, en unidades por década; **IC 95 %** = rango de pendientes compatibles con los datos según Sen (1968), ensanchado por la autocorrelación; **valor p** = probabilidad de un patrón monótono al menos tan marcado si no hubiera tendencia; **α** = 0,05, umbral fijado antes de mirar.

### D7. «Años para ser significativo»: fuera del MVP
- Weatherhead et al. (1998) estiman los años necesarios para detectar una tendencia **de magnitud supuesta** dado el ruido y su autocorrelación, y advierten que los saltos de nivel alteran ese número. El laboratorio lo adapta a datos anuales y sustituye la tendencia supuesta por la **estimada**: eso es una potencia calculada a posteriori, muy sensible al ruido (118 años en su ejemplo de Ushuaia), y el título del panel lo convierte en promesa.
- **Decision**: no mostrarlo. **Prohibido** en el contrato, en la interfaz y en el pipeline (`yearsToDetect`, `detectability_years` o similares); el cambio de fuentes no lo reabre. Solo una **enmienda explícita de la constitución** lo permitiría. Si se recupera así (US5 o posterior): nombre «detectabilidad», tendencia hipotética elegida por la persona, supuestos visibles (lineal, AR(1), 90 % de potencia, α = 0,05), sin fechas.

### D8. Comparaciones múltiples y selección oportunista
- **Decision MVP**: el mapa colorea la **pendiente estimada**, no la significancia, y lo dice. La evidencia solo se afirma para la región abierta. Aviso fijo junto a la leyenda y aviso cuando el periodo no es el completo, con la variación de la pendiente según el año inicial.
- **Evolución**: marcar regiones con evidencia tras controlar la tasa de falsos descubrimientos (Benjamini y Hochberg 1995; Wilks 2016 lo recomienda para mapas).

### D9. Papel del globo
- **Decision**: navegación espacial principal y mapa de resultados, siempre con un buscador HTML equivalente. Sin mapa 2D en el MVP. Si no hay WebGL, la aplicación funciona con buscador, tabla y panel.
- **Rationale**: una segunda vista duplica leyenda, selección, estados y pruebas; el buscador ya garantiza completar el análisis sin gestos 3D. Ver D1 para lo que lo cambiaría.

### D10. Gráficas
- **Decision** **[R]**: componente SVG propio con `d3-scale` y `d3-shape` (una serie anual, recta, banda e hitos). **Rationale**: control de accesibilidad y estilo con poca dependencia. **Alternative**: uPlot o Recharts si el tiempo aprieta. Versiones por comprobar al instalar **[P]**.

## 4. Inventario de piezas

| Pieza | Rama | Decisión | Motivo | Depende de | h |
|---|---|---|---|---|---|
| `web/src/components/EarthGlobe.tsx` | sync_main | **Adaptar** | API limpia (`flyTo`, `flyToRegion`, `regionColor`); falta pausa, movimiento reducido, desplazamiento de cámara, límite de carga | three, react-globe.gl | 3 |
| `regionColor(id)` | sync_main | **Conservar** | Punto de enganche del mapa de tendencias | datos `map/` | 0,5 |
| `web/src/lib/geo.ts` | sync_main | **Conservar** | Tipos, carga y `viewForGeometry` correctos | GeoJSON | 0,5 |
| `mx-states`, `us-states` GeoJSON | sync_main | **Conservar** | IDs ISO 3166-2 = clave del contrato; 32 + 52 regiones | — | 0 |
| `countries.geojson` | sync_main | **Adaptar** | 177 polígonos de fondo causan la mayor parte de las llamadas de dibujo; 70 propiedades sin uso | T023 | 1 |
| Texturas | sync_main | **Adaptar** | 8,2 MB; tres de 4096×2048 (~150 MB de GPU estimados) | T023 | 1 |
| `index.css` | sync_main | **Adaptar** | Variables útiles; corregir barra móvil, vidrio y colores sueltos | `ux.md` | 2 |
| `App.tsx` | sync_main | **Reemplazar** | Composición y estado no admiten variable, periodo ni URL | — | 3 |
| `RegionPanel.tsx` | sync_main | **Reemplazar** | Solo huecos; uno se descarta (D7) | contrato | 3 |
| `trendlens/stats/*`, `processing.py`, `schema.py`, `config.py` | lab | **Conservar** (mover a `pipeline/`) | Probado; sin dependencias de interfaz | numpy, pandas, scipy | 1,5 |
| `trendlens/data/nasa_power.py` | lab | **Adaptar** | Caché, validación y errores reutilizables; falta el endpoint regional | requests | 3 |
| `trendlens/explain.py` | lab | **Adaptar** | Reglas de redacción probadas; pasar de «punto de cuadrícula» a «promedio regional» y a plantillas en el frontend | contrato | 2 |
| `tests/` y fixtures | lab | **Conservar** | Base de la validación científica | pytest, pymannkendall | 0,5 |
| `stats/compare.py`, `export.py` | lab | **Posponer** | US5 | — | — |
| `data/synthetic.py` | lab | **Conservar** solo para pruebas | Etiquetado obligatorio | — | 0 |
| `ui/*`, `app.py`, `viz.py`, `csv_source.py` | lab | **Posponer / no migrar** | Dependen de Streamlit o Plotly | — | — |

Conexión: `pipeline/` produce `web/public/data/trends/*` según `contracts/data-files.md`; el frontend lo lee con un único módulo de datos y pinta el globo con `regionColor`.

## 5. Registro de fuentes (consulta: 2026-11-14)

| Recurso | Acceso | Hallazgo útil | Limitación | Uso |
|---|---|---|---|---|
| [Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) y [manual](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html) | App: solo cabecera (v4.40). Manual: leído casi completo. **Usado con cuenta por 003 (T008, 2026-11-14)** | Ver D2; MODIS NDVI/EVI/LST retirados de Giovanni desde 2024-06-26; con formas promedia solo las celdas con centro dentro (D4) | Sin estados de México; requiere cuenta; API solo para puntos | Validación |
| [Migración GES DISC](https://github.com/nasa/gesdisc-tutorials/blob/main/user-guidance/GES_DISC_Migration_to_Earthdata_Website_and_Earthdata_Cloud.md) | Leído | OPeNDAP local apagado 20-08 a 30-09-2026; HTTPS local hasta 30-09-2026; redirección total tras noviembre de 2026; Giovanni «hasta nuevo aviso» | — | Riesgo |
| [Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series) | HTTP 200, página vacía sin JavaScript: **no leída** | El aviso de migración da Data Rods por retirado (no antes de 2025-10-31) | Servicio en transición | Fuera del MVP |
| [AppEEARS](https://appeears.earthdatacloud.nasa.gov/) y [API](https://appeears.earthdatacloud.nasa.gov/api/) | Portada: requiere JavaScript. API y catálogo: leídos | Ver D2; enlaces de descarga válidos 48 h | Límites de área no documentados | Evolución |
| [NOAA CDO](https://www.ncei.noaa.gov/cdo-web/) y [API v2](https://www.ncei.noaa.gov/cdo-web/webservices/v2) | Leídos; API no probada (sin token) | Ver D2 | Estaciones | Contexto |
| [Artículo SeaWiFS](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf) (Acker et al.) | PDF de 27 páginas; **leídas 1–6** | Giovanni, cajas de 0,5°, clorofila mensual 1998–2007; regresión + ANOVA, p < 0,05; anomalías anuales; advierte de CDOM y de valores extremos | Sin tratamiento de autocorrelación | Contexto y contraste de método |
| [KNMI Climate Explorer](https://climexp.knmi.nl/) | Leído | Series, reanálisis y tendencias; pide verificar que eres humano antes de usarlo | No automatizable | Validación manual |
| [Artículo de pruebas de tendencia (Medium)](https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b) | **HTTP 403: no leído** | — | — | Sin uso; métodos justificados con fuentes primarias |
| [Guía de significancia (Statsig)](https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance) | Leída | Definiciones didácticas; «no significativo no prueba la hipótesis nula» | Pensada para pruebas A/B: compara medias, sin series ni autocorrelación | Lenguaje pedagógico |
| [RCM](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm) y [acceso CSA](https://www.asc-csa.gc.ca/eng/satellites/radarsat/access-to-data/about.asp) | El lector web falló por certificado; leído con `curl` (HTTP 200) | Ficha de catálogo; acceso por EODMS; público: ≥ 16 m sobre Canadá | Imágenes SAR, no series; registro | Fuera del MVP |
| [GEO.ca](https://geo.ca/) | Solo selector de idioma: **contenido no leído** | — | Sin evidencia de servicio de series | Fuera del MVP |
| [SWOT](https://www.asc-csa.gc.ca/eng/satellites/swot/) | Leído | Lanzado el 16-12-2022 | Menos de 4 años de historia | Fuera del MVP |
| [Ecosistemas desde el espacio](https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp) | Leído (modificado 2022-04-22) | Casos de uso | Sin datos | Contexto |
| [Tutorial SAR](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial) | Leído | Visualizar un ráster y un vector en QGIS o Python | Sin series ni tendencias | Fuera del MVP |
| [`linregress`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html) | Leído (SciPy 1.18.0) | Ver D6 | — | Método de contraste |
| [Hirsch y Slack 1984](https://pubs.usgs.gov/publication/70012890) | Resumen leído | Robusta a correlación serial salvo persistencia fuerte (φ > 0,6) o registros de ~5 años | No implementada | Límite declarado |
| [Weatherhead et al. 1998](https://doi.org/10.1029/98JD00995) | Editorial 403; resumen leído vía Crossref | Ver D7 | Texto completo no leído | Decisión D7 |
| Santer 2000, Hamed y Rao 1998, Yue y Wang 2004, Sen 1968, Mann 1945, Wilks 2016, Benjamini y Hochberg 1995 | Registros comprobados en Crossref | Referencias exactas | Textos completos no leídos | Citas |
| [react-globe.gl](https://github.com/vasturiano/react-globe.gl), three.js: [tamaño](https://threejs.org/manual/pages/responsive.html), [liberación](https://threejs.org/manual/pages/how-to-dispose-of-objects.html) | Leídos | `pauseAnimation`, `rendererConfig`, coste de la interacción de puntero; tope de píxeles; quién crea un recurso lo libera | — | `ux.md` §3 |
| Reglas de Space Apps 2026 (spaceappschallenge.org) | **Error de certificado: no leídas** | Fechas 14–15 nov y cinco criterios, por fuentes secundarias | Regla sobre código previo no leída | Resuelto por decisión del equipo (2026-11-14): se reutiliza el laboratorio |

## 6. Limitaciones de esta investigación

No se ejecutó ninguna descarga autenticada en esta investigación (la T008 de 003 sí usó Giovanni con cuenta; las descargas por earthaccess quedan para 003). No se probó en teléfonos reales ni con personas. Las cifras de tiempo por cuadro son de un portátil con GPU integrada en modo headless y solo orientan. No se compiló la versión de producción (`npm run build`).
