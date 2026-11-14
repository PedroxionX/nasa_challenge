# Atribución y cómo citar los datos

Texto para que 006 (Textos y validación) lo cite en la interfaz, la hoja de métodos y el guion.
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
- **MERRA-2:** no da cita para MERRA-2. Si se quiere citar el reanálisis, el artículo de referencia habitual es Gelaro et al. (2017), *Journal of Climate*, 30, 5419–5454, doi:10.1175/JCLI-D-16-0758.1. Esto no sale de la guía de POWER: verificar antes de publicar.

## Peticiones de POWER (no obligatorias)

La guía las plantea como peticiones, no como condiciones:

- Enviar la referencia, el enlace o una breve descripción de los usos (pósteres, presentaciones, etc.) a `larc-power-project@mail.nasa.gov`.
- Avisar al proyecto si los datos de POWER se pasan a otros investigadores.

Decidir si se envía el aviso le toca al equipo. El pipeline no envía nada.

## Validación externa (Giovanni)

La comparación de la T008 usó Giovanni 4.40 (NASA GES DISC), con la variable `M2TMNXSLV_5_12_4_T2M` y la forma del estado de Texas. Si se menciona en la demo, citar Giovanni como herramienta de validación, no como fuente de los datos publicados. Detalle y URLs para reproducir la consulta: `pipeline/validation/t008_giovanni_us-tx.json`.
