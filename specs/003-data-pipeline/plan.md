# Implementation Plan: Pipeline de datos y motor de tendencias

**Branch**: `003-data-pipeline` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-data-pipeline/spec.md`

## Summary

Parte del MVP común. Decisiones, arquitectura, riesgos y contrato viven en [../001-trend-explorer-mvp/plan.md](../001-trend-explorer-mvp/plan.md) y no se repiten aquí.

## Technical Context

**Language/Version / Primary Dependencies**: Python ≥ 3.11 (verificado con 3.13.7) · numpy, pandas, scipy, requests, shapely · earthaccess, xarray, h5netcdf, h5py (lectura de GES DISC) · pytest, pymannkendall. Versiones fijas en `pipeline/pyproject.toml`; todas aprobadas por 002 el 2026-11-14 (handoff §6).

**Fuentes**: MERRA-2 `M2TMNXSLV` e IMERG `GPM_3IMERGM` desde GES DISC con `earthaccess`, leyendo solo la variable y el recuadro de las regiones; NASA POWER como alternativa elegida a mano (`--source power`). Credenciales de Earthdata solo en la máquina que ejecuta (`~/.netrc`), nunca en el repositorio.

**Constraints**: editar solo las rutas de «Propiedad de archivos» de la especificación; cualquier dependencia nueva más allá de las aprobadas se pide a 002.

## Constitution Check

Hereda la comprobación de 001 (sin violaciones). Puertas propias: ningún archivo modificado fuera de las rutas propias; un fallo de GES DISC nunca cambia de fuente solo (II); credenciales fuera del repositorio (Restricciones).

## Project Structure

```text
pipeline/trendlens/          núcleo del laboratorio (motor, procesamiento, catálogo de variables)
pipeline/sources/            adaptadores con interfaz común: base.py, merra2.py, imerg.py, power.py (alternativa)
pipeline/power_regional.py   lectura de POWER (pasa a sources/power.py en T016)
pipeline/regions.py          las 84 regiones y sus nombres en español
pipeline/weights.py          pesos por celda, por malla
pipeline/contract.py         validador del contrato
pipeline/build.py            series, ventanas, mapa, catálogo y escritura todo o nada
pipeline/validate_sources.py contraste con la fuente y con Giovanni
pipeline/tests/              pruebas y fixtures reales pequeñas
pipeline/manifest/           manifiesto por ejecución (versionado)
pipeline/validation/         informes de validación (versionados)
pipeline/cache/              recortes y respuestas crudas (fuera de git)
web/public/data/trends/      salida
```

**Structure Decision**: Método y validación en ../001-trend-explorer-mvp/plan.md («Método de principio a fin» y «Validación científica»).

## Complexity Tracking

Sin violaciones que justificar.
