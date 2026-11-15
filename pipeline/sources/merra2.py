"""MERRA-2 M2TMNXSLV v5.12.4 (tavgM_2d_slv_Nx, mensual):
T2M (temperatura del aire a 2 m), QV2M (humedad específica a 2 m),
TQV (vapor de agua precipitable total) y TO3 (ozono total).

Estructura verificada el 2026-11-14: variables (time, lat, lon) = (1, 361, 576),
lat −90…90 cada 0,5°, lon −180…179,375 cada 0,625°.
"""

from __future__ import annotations

import numpy as np

from sources.gesdisc import READ_BOX, Product
from trendlens.data.base import DataSourceError


def _read_m2(fileobj, param: str, unit: str, factor: float = 1.0, offset: float = 0.0) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    import xarray as xr

    with xr.open_dataset(fileobj, engine="h5netcdf", decode_times=False) as ds:
        if param not in ds:
            raise DataSourceError(f"El gránulo no contiene {param}.")
        v = ds[param]
        if v.attrs.get("units") != unit:
            raise DataSourceError(f"Unidad inesperada para {param}: {v.attrs.get('units')!r} (se esperaba {unit!r}).")
        sub = v.isel(time=0).sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                 lon=slice(READ_BOX["west"], READ_BOX["east"]))
        arr = sub.values.astype(float)
        arr[np.abs(arr) > 1e10] = np.nan  # relleno 1e15 si no lo enmascaró xarray
        return sub["lat"].values.astype(float), sub["lon"].values.astype(float), arr * factor + offset


def read_t2m(fileobj):
    return _read_m2(fileobj, "T2M", "K", 1.0, -273.15)


def read_qv2m(fileobj):
    return _read_m2(fileobj, "QV2M", "kg kg-1", 1000.0, 0.0)


def read_tqv(fileobj):
    return _read_m2(fileobj, "TQV", "kg m-2", 1.0, 0.0)


def read_to3(fileobj):
    return _read_m2(fileobj, "TO3", "Dobsons", 1.0, 0.0)


_M2_COMMON = dict(short_name="M2TMNXSLV", version="5.12.4", doi="10.5067/AP1B0BA5PD2K",
                  product="MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV)", dlat=0.5, dlon=0.625)

MERRA2_T2M = Product(parameter="T2M", unit_declared="K", read=read_t2m, **_M2_COMMON)
MERRA2_QV2M = Product(parameter="QV2M", unit_declared="kg kg-1", read=read_qv2m, **_M2_COMMON)
MERRA2_TQV = Product(parameter="TQV", unit_declared="kg m-2", read=read_tqv, **_M2_COMMON)
MERRA2_TO3 = Product(parameter="TO3", unit_declared="Dobsons", read=read_to3, **_M2_COMMON)


# M2TMNXAER (tavgM_2d_aer_Nx) y M2SMNXSLV (statM_2d_slv_Nx): misma malla y estructura que M2TMNXSLV. Unidades
# comprobadas en el gránulo de 2024-07 el 2026-11-15: TOTEXTTAU y DUEXTTAU «1» (espesor óptico a 550 nm, sin
# unidad); T2MMAX y T2MMIN «K». DOI comprobados en CMR.
def read_totexttau(fileobj):
    return _read_m2(fileobj, "TOTEXTTAU", "1")


def read_duexttau(fileobj):
    return _read_m2(fileobj, "DUEXTTAU", "1")


def read_t2mmax(fileobj):
    return _read_m2(fileobj, "T2MMAX", "K", 1.0, -273.15)


def read_t2mmin(fileobj):
    return _read_m2(fileobj, "T2MMIN", "K", 1.0, -273.15)


# Se leen por OPeNDAP (recorte en el servidor): los archivos de M2TMNXAER pesan 80 MB y por HTTPS iban a ~4 por minuto.
_M2_ORIGIN = (-90.0, -180.0)  # centro de la primera celda del archivo
_M2_AER = dict(short_name="M2TMNXAER", version="5.12.4", doi="10.5067/FH9A0MLJPC7N",
               product="MERRA-2 tavgM_2d_aer_Nx (M2TMNXAER)", dlat=0.5, dlon=0.625, opendap_origin=_M2_ORIGIN)
_M2_STAT = dict(short_name="M2SMNXSLV", version="5.12.4", doi="10.5067/KVIMOMCUO83U",
                product="MERRA-2 statM_2d_slv_Nx (M2SMNXSLV)", dlat=0.5, dlon=0.625, opendap_origin=_M2_ORIGIN)

MERRA2_AOD = Product(parameter="TOTEXTTAU", unit_declared="1", read=read_totexttau, **_M2_AER)
MERRA2_DUST_AOD = Product(parameter="DUEXTTAU", unit_declared="1", read=read_duexttau, **_M2_AER)
MERRA2_T2MMAX = Product(parameter="T2MMAX", unit_declared="K", read=read_t2mmax, **_M2_STAT)
MERRA2_T2MMIN = Product(parameter="T2MMIN", unit_declared="K", read=read_t2mmin, **_M2_STAT)
