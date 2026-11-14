"""MERRA-2 M2TMNXSLV v5.12.4 (tavgM_2d_slv_Nx, mensual): temperatura del aire a 2 m, T2M (T017).

Estructura verificada el 2026-11-14: T2M (time, lat, lon) = (1, 361, 576), unidades K, _FillValue 1e15,
lat −90…90 cada 0,5°, lon −180…179,375 cada 0,625°. Se convierte a °C (K − 273,15).
"""

from __future__ import annotations

import numpy as np

from sources.gesdisc import READ_BOX, Product
from trendlens.data.base import DataSourceError


def read_t2m(fileobj) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    import xarray as xr

    with xr.open_dataset(fileobj, engine="h5netcdf", decode_times=False) as ds:
        if "T2M" not in ds:
            raise DataSourceError("El gránulo no contiene T2M.")
        v = ds["T2M"]
        if v.attrs.get("units") != "K":
            raise DataSourceError(f"Unidad inesperada para T2M: {v.attrs.get('units')!r} (se esperaba 'K').")
        sub = v.isel(time=0).sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                 lon=slice(READ_BOX["west"], READ_BOX["east"]))
        arr = sub.values.astype(float)
        arr[np.abs(arr) > 1e10] = np.nan  # relleno 1e15 si no lo enmascaró xarray
        return sub["lat"].values.astype(float), sub["lon"].values.astype(float), arr - 273.15


MERRA2_T2M = Product(
    short_name="M2TMNXSLV", version="5.12.4", doi="10.5067/AP1B0BA5PD2K",
    product="MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV)", parameter="T2M", unit_declared="K",
    dlat=0.5, dlon=0.625, read=read_t2m)
