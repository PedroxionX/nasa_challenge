# Atribución y cómo citar los datos

Texto para que 006 (Textos y validación) lo cite en la interfaz, la hoja de métodos y el guion.

**Fuentes publicadas (desde el 2026-11-14):** los productos de GES DISC de la sección 1. NASA POWER (sección 2) solo
se usa si alguien elige la alternativa a mano (`--source power`); en ese caso la procedencia de cada archivo lo dice.

## 1. Productos de GES DISC (fuente principal)

Citas comprobadas el 2026-11-14 en las páginas del catálogo de Earthdata a las que lleva cada DOI y en los metadatos
de CMR. Las páginas de GES DISC (`disc.gsfc.nasa.gov/datasets/...`) no muestran texto sin JavaScript.

### Temperatura del aire (`air_temperature`): MERRA-2 M2TMNXSLV v5.12.4

| Campo | Valor |
|---|---|
| Producto | MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV), mensual, 0.5° × 0.625°, variable `T2M` (K → °C) |
| DOI | 10.5067/AP1B0BA5PD2K |
| Autoría | Global Modeling and Assimilation Office (GMAO); el catálogo añade a S. Pawson |
| Publica | NASA Goddard Earth Sciences Data and Information Services Center (GES DISC) |
| Año | 2015 |
| De dónde sale | <https://www.earthdata.nasa.gov/data/catalog/ges-disc-m2tmnxslv-5.12.4> (destino del DOI) y <https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=M2TMNXSLV&version=5.12.4> |

Cita (estilo APA, como la ofrece el catálogo):
> Global Modeling and Assimilation Office, & Pawson, S. (2015). *MERRA-2 tavgM_2d_slv_Nx: 2d,Monthly mean,Time-Averaged,Single-Level,Assimilation,Single-Level Diagnostics V5.12.4* [Data set]. NASA Goddard Earth Sciences Data and Information Services Center. https://doi.org/10.5067/AP1B0BA5PD2K

### Precipitación (`precipitation`): GPM IMERG Final mensual GPM_3IMERGM v07

| Campo | Valor |
|---|---|
| Producto | GPM IMERG Final Precipitation L3 1 month 0.1° × 0.1° V07 (GPM_3IMERGM), variable `Grid/precipitation` (mm/h) |
| DOI | 10.5067/GPM/IMERG/3B-MONTH/07 |
| Autoría | Huffman, G. J.; Stocker, E. F.; Bolvin, D. T.; Nelkin, E. J.; Tan, J. |
| Publica | NASA Goddard Earth Sciences Data and Information Services Center (GES DISC) |
| Año | 2023 |
| Cobertura | la colección está cerrada (CMR: «COMPLETE») y termina el **2025-09-30**; por eso el último año completo es 2024 |
| De dónde sale | <https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergm-07> (destino del DOI) y <https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=GPM_3IMERGM&version=07> |

Cita (estilo APA, como la ofrece el catálogo):
> Huffman, G. J., Stocker, E. F., Bolvin, D. T., Nelkin, E. J., & Tan, J. (2023). *GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07* [Data set]. NASA Goddard Earth Sciences Data and Information Services Center. https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07

Añadir «Fecha de consulta: AAAA-MM-DD» con la de `provenance.retrieved_at_utc` del archivo publicado.

### Versión breve para la interfaz (traducción propia, no texto oficial)

> Datos: temperatura del reanálisis MERRA-2 (GMAO, NASA) y precipitación de GPM IMERG Final v07 (NASA), obtenidos de GES DISC. Promedio de área por estado calculado por Trend Detective.

## 2. NASA POWER (alternativa)

Fuente de las indicaciones: guía oficial de NASA POWER, <https://power.larc.nasa.gov/docs/referencing/> (consultada el 2026-11-14).

## Qué datos usamos

| Campo | Valor |
|---|---|
| Servicio | NASA POWER — API mensual regional (`/api/temporal/monthly/regional`) |
| Versión de la API | v2.10.0 (la declara cada respuesta en `header.api.version`) |
| Producto de origen | MERRA-2 (`header.sources = ["MERRA2"]`), cuadrícula 0.5° × 0.625° |
| Parámetros | `T2M` (temperatura del aire a 2 m) y `PRECTOTCORR` (precipitación corregida) |
| Periodo | 1981 al último año completo |
| Fecha de consulta | la de cada serie, en `provenance.retrieved_at_utc`; cada solicitud está en `pipeline/manifest/` |

## Referencias que POWER pide incluir

La guía oficial pide incluir **dos** referencias en cualquier producto o publicación:

1. **Referencia de POWER**:
   > The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division.

2. **Referencia de los datos.** La guía da la plantilla «The data was obtained from the POWER Project's Hourly 2.x.x version on YYYY/MM/DD.» y pide nombrar el servicio, la versión y la fecha de consulta. Aplicada a lo que usamos:
   > The data was obtained from the POWER Project's Monthly and Annual (regional) API v2.10.0 on 2026/11/14.

   La fecha cambia en cada nueva descarga: usar la de `retrieved_at_utc` del archivo publicado.

## Versión en español para la interfaz (traducción propia, no texto oficial)

> Datos: proyecto POWER (Prediction Of Worldwide Energy Resources) del Centro de Investigación Langley de la NASA, financiado por la División de Ciencias de la Tierra de la NASA. API mensual regional v2.10.0, basada en el reanálisis MERRA-2; consulta del AAAA-MM-DD.

Junto a la cita conviene recordar lo que ya exige la constitución: es un **reanálisis** (modelo con asimilación de observaciones), no una estación. Cada valor es un **promedio de área del estado**, ponderado por cos(latitud) y por la parte de cada celda que cae dentro del estado. No es el valor de un punto.

## Lo que la guía no dice

- **Licencia:** la guía no declara licencia ni restricciones de uso formales.
- **DOI:** no da DOI para los datos de POWER.
- **MERRA-2:** no da cita para MERRA-2. La cita comprobada del producto está en la sección 1. Si además se quiere citar el artículo del reanálisis, el habitual es Gelaro et al. (2017), *Journal of Climate*, 30, 5419–5454, doi:10.1175/JCLI-D-16-0758.1; ese dato no está comprobado en una fuente oficial: verificar antes de publicar.

## Peticiones de POWER (no obligatorias)

La guía las plantea como peticiones, no como condiciones:

- Enviar la referencia, el enlace o una breve descripción de los usos (pósteres, presentaciones, etc.) a `larc-power-project@mail.nasa.gov`.
- Avisar al proyecto si los datos de POWER se pasan a otros investigadores.

Decidir si se envía el aviso le toca al equipo. El pipeline no envía nada.

## Validación externa (Giovanni)

La comparación de la T008 usó Giovanni 4.40 (NASA GES DISC), con la variable `M2TMNXSLV_5_12_4_T2M` y la forma del estado de Texas. Si se menciona en la demo, citar Giovanni como herramienta de validación, no como fuente de los datos publicados. Detalle y URLs para reproducir la consulta: `pipeline/validation/t008_giovanni_us-tx.json`.
