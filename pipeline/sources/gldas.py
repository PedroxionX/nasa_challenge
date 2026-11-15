"""GLDAS Noah Land Surface Model L4 mensual 0,25° V2.1 (GLDAS_NOAH025_M): humedad del suelo y evapotranspiración (T025).

Estructura verificada el 2026-11-14: variables (time, lat, lon) = (1, 600, 1440), lat −59,875…89,875 y
lon −179,875…179,875 cada 0,25°, relleno −9999 sobre el mar (solo hay datos sobre tierra), un archivo por mes
(~23 MB). DOI 10.5067/SXAVCZFAQLNO. Es salida de un modelo de superficie alimentado con observaciones.

- SoilMoi0_10cm_inst: humedad del suelo de la capa 0–10 cm, kg m⁻² (= mm de agua), sin conversión.
- Evap_tavg: evapotranspiración, kg m⁻² s⁻¹; se entrega en mm/día (× 86 400) y el procesamiento la acumula
  con los días reales de cada mes (mm/mes) y la suma por año (mm).
"""

from __future__ import annotations

import numpy as np

from sources.gesdisc import READ_BOX, Product
from trendlens.data.base import DataSourceError

SECONDS_PER_DAY = 86400.0


def _read(fileobj, var: str, unit: str, factor: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    import xarray as xr

    with xr.open_dataset(fileobj, engine="h5netcdf", decode_times=False) as ds:
        if var not in ds:
            raise DataSourceError(f"El gránulo no contiene {var}.")
        v = ds[var]
        if v.attrs.get("units") != unit:
            raise DataSourceError(f"Unidad inesperada para {var}: {v.attrs.get('units')!r} (se esperaba {unit!r}).")
        if v.dims != ("time", "lat", "lon"):
            raise DataSourceError(f"Dimensiones inesperadas para {var}: {v.dims}.")
        sub = v.isel(time=0).sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                 lon=slice(READ_BOX["west"], READ_BOX["east"]))
        arr = sub.values.astype(float)
        arr[arr <= -9000] = np.nan  # relleno −9999 si no lo enmascaró xarray
        return sub["lat"].values.astype(float), sub["lon"].values.astype(float), arr * factor


def read_soil_moisture(fileobj):
    return _read(fileobj, "SoilMoi0_10cm_inst", "kg m-2", 1.0)


def read_evapotranspiration(fileobj):
    return _read(fileobj, "Evap_tavg", "kg m-2 s-1", SECONDS_PER_DAY)


def read_runoff(fileobj):
    import xarray as xr

    with xr.open_dataset(fileobj, engine="h5netcdf", decode_times=False) as ds:
        for var in ("Qs_acc", "Qsb_acc"):
            if var not in ds:
                raise DataSourceError(f"El gránulo no contiene {var}.")
            if ds[var].attrs.get("units") != "kg m-2":
                raise DataSourceError(f"Unidad inesperada para {var}: {ds[var].attrs.get('units')!r} (se esperaba 'kg m-2').")
        sub_s = ds["Qs_acc"].isel(time=0).sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                              lon=slice(READ_BOX["west"], READ_BOX["east"]))
        sub_b = ds["Qsb_acc"].isel(time=0).sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                               lon=slice(READ_BOX["west"], READ_BOX["east"]))
        arr_s = sub_s.values.astype(float)
        arr_b = sub_b.values.astype(float)
        arr_s[arr_s <= -9000] = np.nan
        arr_b[arr_b <= -9000] = np.nan
        # kg m-2 (acumulado por paso de 3h) x 8 pasos/día = mm/día
        total = (arr_s + arr_b) * 8.0
        return sub_s["lat"].values.astype(float), sub_s["lon"].values.astype(float), total


def read_swe(fileobj):
    return _read(fileobj, "SWE_inst", "kg m-2", 1.0)


def read_avg_surf_t(fileobj):
    import xarray as xr

    with xr.open_dataset(fileobj, engine="h5netcdf", decode_times=False) as ds:
        if "AvgSurfT_inst" not in ds:
            raise DataSourceError("El gránulo no contiene AvgSurfT_inst.")
        v = ds["AvgSurfT_inst"]
        if v.attrs.get("units") != "K":
            raise DataSourceError(f"Unidad inesperada para AvgSurfT_inst: {v.attrs.get('units')!r} (se esperaba 'K').")
        sub = v.isel(time=0).sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                 lon=slice(READ_BOX["west"], READ_BOX["east"]))
        arr = sub.values.astype(float)
        arr[arr <= -9000] = np.nan
        return sub["lat"].values.astype(float), sub["lon"].values.astype(float), arr - 273.15


_COMMON = dict(short_name="GLDAS_NOAH025_M", version="2.1", doi="10.5067/SXAVCZFAQLNO",
               product="GLDAS Noah Land Surface Model L4 monthly 0.25 x 0.25 degree V2.1 (GLDAS_NOAH025_M)",
               dlat=0.25, dlon=0.25)
GLDAS_SOIL_MOISTURE = Product(parameter="SoilMoi0_10cm_inst", unit_declared="kg m-2", read=read_soil_moisture, **_COMMON)
GLDAS_EVAPOTRANSPIRATION = Product(parameter="Evap_tavg", unit_declared="kg m-2 s-1", read=read_evapotranspiration,
                                   **_COMMON)
GLDAS_RUNOFF = Product(parameter="runoff", unit_declared="kg m-2", read=read_runoff, **_COMMON)
GLDAS_SWE = Product(parameter="SWE_inst", unit_declared="kg m-2", read=read_swe, **_COMMON)
GLDAS_SURF_TEMP = Product(parameter="AvgSurfT_inst", unit_declared="K", read=read_avg_surf_t, **_COMMON)
