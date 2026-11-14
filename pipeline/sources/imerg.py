"""GPM IMERG Final mensual GPM_3IMERGM v07: precipitación (T018).

Estructura verificada el 2026-11-14: grupo `Grid`, `precipitation` (time, lon, lat) = (1, 3600, 1800),
unidades mm/hr, _FillValue −9999,9, centros cada 0,1° desde ±179,95 / ±89,95. El tiempo usa calendario juliano:
se abre con decode_times=False y el mes sale del gránulo. Se transpone a (lat, lon) y la tasa se entrega en
mm/día (× 24): el procesamiento multiplica por los días del mes, así que el acumulado mensual es mm/h × horas.
"""

from __future__ import annotations

import numpy as np

from sources.gesdisc import READ_BOX, Product
from trendlens.data.base import DataSourceError


def read_precipitation(fileobj) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    import xarray as xr

    with xr.open_dataset(fileobj, engine="h5netcdf", group="Grid", decode_times=False) as ds:
        if "precipitation" not in ds:
            raise DataSourceError("El gránulo no contiene Grid/precipitation.")
        p = ds["precipitation"]
        if p.attrs.get("units") not in ("mm/hr", "mm/h"):
            raise DataSourceError(f"Unidad inesperada para precipitation: {p.attrs.get('units')!r} (se esperaba 'mm/hr').")
        if set(p.dims) != {"time", "lon", "lat"}:
            raise DataSourceError(f"Dimensiones inesperadas: {p.dims}.")
        sub = p.isel(time=0).transpose("lat", "lon").sel(lat=slice(READ_BOX["south"], READ_BOX["north"]),
                                                         lon=slice(READ_BOX["west"], READ_BOX["east"]))
        arr = sub.values.astype(float)
        arr[arr < -9000] = np.nan  # relleno −9999,9 si no lo enmascaró xarray
        return sub["lat"].values.astype(float), sub["lon"].values.astype(float), arr * 24.0


IMERG_PRECIP = Product(
    short_name="GPM_3IMERGM", version="07", doi="10.5067/GPM/IMERG/3B-MONTH/07",
    product="GPM IMERG Final Precipitation L3 1 month 0.1° (GPM_3IMERGM)", parameter="precipitation",
    unit_declared="mm/hr", dlat=0.1, dlon=0.1, read=read_precipitation)
