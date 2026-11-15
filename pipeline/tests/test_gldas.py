"""GLDAS Noah (T025, T026). Sin credenciales: recorte REAL de pocos KB (julio de 2024, alrededor de Rhode Island,
con celdas de mar) en tests/fixtures/. La prueba en vivo va marcada.
"""

from pathlib import Path

import numpy as np
import pytest
import xarray as xr

import build
import variables
from sources.gesdisc import GesDiscSource, Granule
from sources.gldas import (GLDAS_EVAPOTRANSPIRATION, GLDAS_SOIL_MOISTURE, read_evapotranspiration,
                           read_soil_moisture)
from trendlens.data.base import DataSourceError
from weights import GLDAS_GRID, load_regions, region_weights

FIX = Path(__file__).parent / "fixtures" / "gldas_202407_ri_cut.nc4"


def raw(var):
    with xr.open_dataset(FIX, engine="h5netcdf", decode_times=False) as ds:
        return ds[var].load()


def test_soil_moisture_keeps_units_and_sea_is_nan():
    lats, lons, arr = read_soil_moisture(open(FIX, "rb"))
    r = raw("SoilMoi0_10cm_inst")
    assert arr.shape == (len(lats), len(lons))
    assert np.allclose(arr, r.values[0], equal_nan=True)
    assert np.isnan(arr).any() and np.isfinite(arr).any()  # hay mar y tierra en el recorte
    assert np.allclose(np.diff(lats), 0.25) and np.allclose(np.diff(lons), 0.25)
    assert 0 < np.nanmin(arr) and np.nanmax(arr) < 100


def test_evapotranspiration_converted_to_mm_per_day():
    _, _, arr = read_evapotranspiration(open(FIX, "rb"))
    r = raw("Evap_tavg")
    assert np.allclose(arr, r.values[0] * 86400, equal_nan=True)
    assert 0 < np.nanmean(arr) < 10  # julio en Nueva Inglaterra: unos mm/día


def test_unexpected_unit_is_an_error(tmp_path):
    ds = xr.open_dataset(FIX, engine="h5netcdf", decode_times=False).load()
    ds["Evap_tavg"].attrs["units"] = "mm/day"
    bad = tmp_path / "bad.nc4"
    ds.to_netcdf(bad, engine="h5netcdf")
    with pytest.raises(DataSourceError, match="Unidad inesperada"):
        read_evapotranspiration(open(bad, "rb"))


def test_grid_matches_file_cell_centers():
    lats, lons, _ = read_soil_moisture(open(FIX, "rb"))
    assert np.allclose((lats - GLDAS_GRID.lat0) / GLDAS_GRID.dlat % 1, 0, atol=1e-6)
    assert np.allclose((lons - GLDAS_GRID.lon0) / GLDAS_GRID.dlon % 1, 0, atol=1e-6)


class Var:
    def __init__(self, var_id):
        self.id = var_id


def ri_source(tmp_path, product):
    def searcher(prod, first_year, end_year):
        return [Granule(f"{prod.short_name}.202407", (2024, 7), "https://example/202407", FIX)]

    return GesDiscSource(product, cache_dir=tmp_path / "cache", sleep=lambda s: None, searcher=searcher,
                         opener=lambda g: open(g.handle, "rb"), login=lambda: None)


@pytest.mark.parametrize("product,var_id", [(GLDAS_SOIL_MOISTURE, "soil_moisture"),
                                            (GLDAS_EVAPOTRANSPIRATION, "evapotranspiration")])
def test_coastal_region_uses_land_cells_with_50_percent_rule(tmp_path, product, var_id):
    (ri,) = load_regions(["US-RI"])
    w = region_weights(ri.geometry, GLDAS_GRID)
    data = ri_source(tmp_path, product).read(Var(var_id), [ri], {ri.id: w}, w.lats, w.lons, 2024, 2024)
    assert np.isnan(data.values).any()  # Rhode Island toca celdas de mar
    var = variables.get(var_id, "gesdisc")
    assert var.min_valid_fraction == 0.5
    strict = build.regional_monthly(data, w)
    land = build.regional_monthly(data, w, var.min_valid_fraction)
    assert np.isnan(strict[0])  # con la regla de siempre el mes se perdería
    assert np.isfinite(land[0])  # con la regla de tierra es la media de las celdas con dato
    valid = np.isfinite(data.values[:, 0])
    expected = np.sum(w.weights[valid] * data.values[valid, 0]) / np.sum(w.weights[valid])
    assert land[0] == pytest.approx(expected)
    assert data.info.short_name == "GLDAS_NOAH025_M" and data.info.doi == "10.5067/SXAVCZFAQLNO"
    assert data.info.grid_text == "0.25° × 0.25°"


def test_two_variables_of_the_same_product_do_not_share_cache(tmp_path):
    """Regresión: humedad del suelo y evapotranspiración vienen del mismo producto y del mismo gránulo; con la
    misma caché, la segunda leería los valores de la primera."""
    (ri,) = load_regions(["US-RI"])
    w = region_weights(ri.geometry, GLDAS_GRID)
    sm = ri_source(tmp_path, GLDAS_SOIL_MOISTURE).read(Var("soil_moisture"), [ri], {ri.id: w}, w.lats, w.lons, 2024, 2024)
    et_src = ri_source(tmp_path, GLDAS_EVAPOTRANSPIRATION)
    et = et_src.read(Var("evapotranspiration"), [ri], {ri.id: w}, w.lats, w.lons, 2024, 2024)
    assert et_src.manifest[0]["from_cache"] is False  # no reutiliza la caché de la humedad del suelo
    land = np.isfinite(sm.values[:, 0])
    assert not np.allclose(sm.values[land, 0], et.values[land, 0])
    assert np.nanmax(et.values) < 10 < np.nanmin(sm.values)  # mm/día frente a kg/m²


def test_variable_definitions():
    sm, et = variables.get("soil_moisture", "gesdisc"), variables.get("evapotranspiration", "gesdisc")
    assert (sm.kind, et.kind) == ("reanalysis", "reanalysis")
    assert sm.relative_change and et.relative_change
    assert (sm.unit_annual, et.unit_annual) == ("kg/m²", "mm")
    assert sm.grid == GLDAS_GRID and sm.first_request_year == 2000
    assert "no es una medición directa" in sm.definition
    assert set(build.default_sources("gesdisc")) >= {"soil_moisture", "evapotranspiration"}


@pytest.mark.live
def test_live_one_year(tmp_path):
    from sources.gesdisc import GesDiscSource as Real
    (ri,) = load_regions(["US-RI"])
    w = region_weights(ri.geometry, GLDAS_GRID)
    data = Real(GLDAS_SOIL_MOISTURE, cache_dir=tmp_path / "cache").read(Var("soil_moisture"), [ri], {ri.id: w},
                                                                        w.lats, w.lons, 2024, 2024)
    assert len(data.months) == 12
    assert np.isfinite(build.regional_monthly(data, w, 0.5)).all()
