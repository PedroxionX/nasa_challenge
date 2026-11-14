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

### D2. Fuente de datos del MVP: NASA POWER (MERRA-2), endpoint mensual regional
- **Decision**: serie mensual por celda de la cuadrícula nativa vía `GET /api/temporal/monthly/regional`, promediada por polígono.
- **Rationale** **[H]** (solicitudes reales de hoy): sin autenticación; API v2.10.0; `sources: ["MERRA2"]`; cuadrícula 0,5° lat × 0,625° lon; relleno −999; clave `YYYY13` = anual; datos desde 1981; último mes válido 2026-09. Límites observados: caja de **2° a 10°** por lado, **1 parámetro por solicitud**, inicio ≥ 1981 (HTTP 422 con mensaje claro). Una caja de 10°×10° y 45 años devolvió 336 celdas, 2,9 MB, en 4 s.
- **Alternatives considered**:

| Fuente | Hallazgo **[H]** | Por qué no es la principal |
|---|---|---|
| Giovanni 4.40 | Promedia por área con peso cos(latitud) ajustado por cobertura de la forma; formas: países, **estados de EE. UU.**, cuencas; CSV; exige Earthdata Login (invitado: 4 instantes y sin descargas); sin API documentada | No tiene estados de México; no automatizable. **Uso: validación** |
| AppEEARS | API con token de 48 h, tareas asíncronas (`pending → processing → done`), área por GeoJSON; catálogo público de 193 productos (p. ej. `MOD13A3.061` NDVI mensual 1 km desde 2000, `MOD11A2.061` LST 8 días) | Requiere credenciales y espera; ~25 años. **Uso: segunda fuente tras el MVP** |
| Earthdata Cloud (MERRA-2, IMERG directos) | OPeNDAP local y HTTPS local de GES DISC apagados el 30-09-2026; hoy solo nube, CMR, Harmony | Credenciales y más procesamiento. **Evolución** |
| NOAA CDO v2 | Token obligatorio; 5 solicitudes/s y 10 000/día; mensual limitado a 10 años por solicitud; datos de estaciones | Estación ≠ región. **Contexto** |

- **Alternativa de acceso si falla el endpoint regional**: endpoint por punto (**[H]** funciona hoy) consultando el centro de cada celda; y como alternativa de demo, las respuestas ya descargadas con su manifiesto.

### D3. Variables
| | Temperatura | Precipitación |
|---|---|---|
| Parámetro exacto **[H]** | `T2M`, «Temperature at 2 Meters», unidad declarada `C` | `PRECTOTCORR`, «Precipitation Corrected», unidad declarada `mm/day` |
| Naturaleza | Temperatura **del aire** a 2 m, de **reanálisis** (modelo + asimilación), no de estación ni de superficie (`TS`, «Earth Skin Temperature», existe y es otra variable) | **Tasa** media diaria del mes; se convierte a acumulado mensual con los días reales y a mm/año |
| Agregación anual | Media ponderada por días | Suma de 12 meses |
| Cobertura / resolución | 1981–presente; 0,5° × 0,625° | Igual |
| Calidad | Sin banderas por celda; relleno −999; rango físico comprobado | Igual; muchos ceros en zonas áridas restan potencia |
| **[P]** | Versión del producto MERRA-2 subyacente (colección) no la declara la API: citar como «MERRA-2 vía NASA POWER v2.10.0» | La idoneidad de la precipitación de reanálisis para tendencias es limitada: se comunica y se contrasta tras el MVP con IMERG o estaciones |

### D4. Valor regional: promedio de área, no centroide
- **Decision**: media ponderada de las celdas que tocan el polígono, peso = cos(latitud) × fracción de la celda cubierta por el polígono (el mismo criterio que documenta Giovanni para formas).
- **Efecto y comunicación**: regiones menores que una celda (~3 000 km²) quedan representadas por 1–4 celdas compartidas con vecinos; la interfaz muestra «Promedio de N celdas de ~50 km» y lo advierte cuando N ≤ 2. Un centroide daría el valor de una sola celda y se llamaría así.

### D5. Arquitectura: pipeline previo y archivos estáticos, sin backend
- **Decision**: un pipeline en Python descarga, promedia, analiza y escribe JSON; el frontend solo lee. Se precalcula el resultado de **todas las ventanas de al menos 10 años** (666 por serie entre 1981 y 2025).
- **Rationale**: un único motor produce todos los números (constitución I); cambiar el periodo no requiere estadística en el navegador ni servidor; la demo funciona sin red; no hay credenciales. Tamaño **[S]**: ~50 KB por serie, ~8 MB en total sin comprimir; medir en T007.
- **Alternatives considered**: backend FastAPI con el motor (flexible, pero añade despliegue y un punto de fallo en la demo; es la evolución natural para regiones libres) · portar el motor a TypeScript (dos motores que mantener coherentes) · acceso en vivo desde el navegador (depende de la red y de CORS; sin promedio de área).

### D6. Método estadístico principal
- **Decision**: sobre la serie **anual de años completos**: pendiente de **Theil-Sen** e intervalo de Sen; **Mann-Kendall con corrección de varianza por autocorrelación de lag 1** como prueba; MCO con ajuste de Santer et al. (2000) como contraste en los detalles técnicos.
- **Rationale**: el laboratorio ya lo implementa y prueba (contra `pymannkendall`, `scipy.stats.theilslopes` y valores a mano) y lo eligió con un Monte Carlo propio. Agregar a años completos elimina el ciclo estacional sin suponer un modelo. MK no exige normalidad y Sen resiste atípicos. `linregress` documenta que su valor p es una prueba de Wald con distribución t sobre «pendiente = 0» y solo menciona normalidad de residuos, no independencia.
- **Limitación declarada** **[H]** (experimento del laboratorio): con φ = 0,75 y n = 30–45, la prueba corregida rechaza ~9–11 % en vez de 5 %. Se advierte cuando r₁ es significativo.
- **Alternatives considered**: MCO sobre datos mensuales, como en el artículo de SeaWiFS (regresión de mínimos cuadrados con ANOVA y p < 0,05 sobre 9–10 años): sencillo, pero trata meses correlacionados como independientes · Mann-Kendall estacional (Hirsch, Slack y Smith 1982): útil con huecos, pero supone independencia entre estaciones; la corrección de Hirsch y Slack (1984) no está implementada → queda como diagnóstico · pruebas de raíz unitaria: no responden si hay tendencia determinista · comparación de medias entre dos mitades: no estima una tasa.
- Definiciones para la interfaz: **pendiente** = mediana de las pendientes entre todos los pares de años, en unidades por década; **IC 95 %** = rango de pendientes compatibles con los datos según Sen (1968), ensanchado por la autocorrelación; **valor p** = probabilidad de un patrón monótono al menos tan marcado si no hubiera tendencia; **α** = 0,05, umbral fijado antes de mirar.

### D7. «Años para ser significativo»: fuera del MVP
- Weatherhead et al. (1998) estiman los años necesarios para detectar una tendencia **de magnitud supuesta** dado el ruido y su autocorrelación, y advierten que los saltos de nivel alteran ese número. El laboratorio lo adapta a datos anuales y sustituye la tendencia supuesta por la **estimada**: eso es una potencia calculada a posteriori, muy sensible al ruido (118 años en su ejemplo de Ushuaia), y el título del panel lo convierte en promesa.
- **Decision**: no mostrarlo. Si se recupera (US5 o posterior): nombre «detectabilidad», tendencia hipotética elegida por la persona, supuestos visibles (lineal, AR(1), 90 % de potencia, α = 0,05), sin fechas.

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
| [Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) y [manual](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html) | App: solo cabecera (v4.40). Manual: leído casi completo | Ver D2; MODIS NDVI/EVI/LST retirados de Giovanni desde 2024-06-26 | Sin estados de México; requiere cuenta | Validación |
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

No se ejecutó ninguna descarga autenticada. No se probó en teléfonos reales ni con personas. Las cifras de tiempo por cuadro son de un portátil con GPU integrada en modo headless y solo orientan. No se compiló la versión de producción (`npm run build`).
