"""Adaptadores de GES DISC (T017, T018, T021). Sin credenciales: los gránulos son recortes REALES de pocos KB
(julio de 2024, alrededor de Washington D.C.) guardados en tests/fixtures/. Las pruebas en vivo van marcadas.
"""

from pathlib import Path

import numpy as np
import pytest
import xarray as xr

import variables
from sources.base import ReadFailed
from sources.gesdisc import GesDiscSource, Granule, cell_indices, netrc_env_fix
from sources.imerg import IMERG_PRECIP, read_precipitation
from sources.merra2 import MERRA2_T2M, read_t2m
from trendlens.data.base import DataSourceError
from weights import IMERG_GRID, MERRA2_GRID, load_regions, region_weights

FIX = Path(__file__).parent / "fixtures"
MERRA_FILE = FIX / "merra2_T2M_202407_dc_cut.nc4"
IMERG_FILE = FIX / "imerg_precip_202407_dc_cut.HDF5"


def raw(path, var, group=None):
    with xr.open_dataset(path, engine="h5netcdf", group=group, decode_times=False) as ds:
        return ds[var].load()


# ---- lectura de un gránulo -------------------------------------------------------------
def test_read_t2m_converts_kelvin_and_keeps_grid():
    lats, lons, arr = read_t2m(open(MERRA_FILE, "rb"))
    k = raw(MERRA_FILE, "T2M")
    assert arr.shape == (len(lats), len(lons)) == (7, 7)
    assert np.allclose(arr, k.values[0] - 273.15)
    assert np.allclose(np.diff(lats), 0.5) and np.allclose(np.diff(lons), 0.625)
    assert 15 < np.nanmean(arr) < 35  # julio cerca de D.C., °C


def test_read_imerg_transposes_and_converts_to_mm_per_day():
    lats, lons, arr = read_precipitation(open(IMERG_FILE, "rb"))
    p = raw(IMERG_FILE, "precipitation", "Grid")
    assert p.dims == ("time", "lon", "lat")  # así viene el archivo real
    assert arr.shape == (len(lats), len(lons))  # (lat, lon) tras transponer
    assert np.allclose(arr, p.values[0].T * 24.0)
    assert np.allclose(np.diff(lats), 0.1, atol=1e-4) and np.nanmin(arr) >= 0


def test_unexpected_unit_is_an_error(tmp_path):
    ds = xr.open_dataset(MERRA_FILE, engine="h5netcdf", decode_times=False).load()
    ds["T2M"].attrs["units"] = "C"
    bad = tmp_path / "bad.nc4"
    ds.to_netcdf(bad, engine="h5netcdf")
    with pytest.raises(DataSourceError, match="Unidad inesperada"):
        read_t2m(open(bad, "rb"))


def test_imerg_fill_value_becomes_nan(tmp_path):
    ds = xr.open_dataset(IMERG_FILE, engine="h5netcdf", group="Grid", decode_times=False, mask_and_scale=False).load()
    ds["precipitation"].values[0, 0, 0] = -9999.9
    p = tmp_path / "fill.HDF5"
    ds.to_netcdf(p, engine="h5netcdf", group="Grid")
    _, _, arr = read_precipitation(open(p, "rb"))
    assert np.isnan(arr[0, 0]) and np.isfinite(arr[1, 1])


def test_cell_indices_rejects_cells_outside_the_file():
    lats, lons = np.array([38.0, 38.5]), np.array([-77.5, -76.875])
    i, j = cell_indices(lats, lons, np.array([38.5]), np.array([-76.875]), 0.5, 0.625)
    assert (i[0], j[0]) == (1, 1)
    with pytest.raises(DataSourceError):
        cell_indices(lats, lons, np.array([45.0]), np.array([-76.875]), 0.5, 0.625)


# ---- fuente completa con gránulos de prueba ------------------------------------------------
class Var:
    def __init__(self, var_id):
        self.id = var_id


def dc_cells(grid):
    (dc,) = load_regions(["US-DC"])
    w = region_weights(dc.geometry, grid)
    return dc, w


def make_source(tmp_path, product, path, fail_times=0, months=((2024, 7),)):
    calls = {"open": 0}

    def searcher(prod, first_year, end_year):
        return [Granule(f"{prod.short_name}.{y}{m:02d}", (y, m), f"https://example/{y}{m:02d}", path)
                for y, m in months]

    def opener(g):
        calls["open"] += 1
        if calls["open"] <= fail_times:
            raise ConnectionError("sin red")
        return open(g.handle, "rb")

    src = GesDiscSource(product, cache_dir=tmp_path / "cache", sleep=lambda s: None, searcher=searcher,
                        opener=opener, login=lambda: None)
    return src, calls


def test_source_reads_dc_merra2_and_matches_the_cell(tmp_path):
    dc, w = dc_cells(MERRA2_GRID)
    src, _ = make_source(tmp_path, MERRA2_T2M, MERRA_FILE)
    data = src.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    k = raw(MERRA_FILE, "T2M")
    expected = float(k.sel(lat=w.lats[0], lon=w.lons[0]).values[0]) - 273.15
    assert data.months == [(2024, 7)] and data.values.shape == (1, 1)
    assert abs(data.values[0, 0] - expected) <= 0.01  # US1: región de una sola celda = celda del gránulo
    assert data.info.short_name == "M2TMNXSLV" and data.info.doi == "10.5067/AP1B0BA5PD2K"
    assert data.granules_by_region == {"US-DC": 1}
    e = src.manifest[0]
    assert e["status"] == "ok" and e["sha256"] and e["granule"] == "M2TMNXSLV.202407" and e["from_cache"] is False


def test_source_reads_imerg_cells(tmp_path):
    dc, w = dc_cells(IMERG_GRID)
    src, _ = make_source(tmp_path, IMERG_PRECIP, IMERG_FILE)
    data = src.read(Var("precipitation"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    p = raw(IMERG_FILE, "precipitation", "Grid")
    for k, (la, lo) in enumerate(zip(w.lats, w.lons)):
        exp = float(p.sel(lat=la, lon=lo, method="nearest").values[0]) * 24
        assert abs(data.values[k, 0] - exp) < 1e-4
    assert data.values.shape == (w.n_cells, 1) and w.n_cells == 6


def test_second_run_uses_cache(tmp_path):
    dc, w = dc_cells(MERRA2_GRID)
    src, calls = make_source(tmp_path, MERRA2_T2M, MERRA_FILE)
    src.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    src2, calls2 = make_source(tmp_path, MERRA2_T2M, MERRA_FILE)
    d2 = src2.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    assert calls["open"] == 1 and calls2["open"] == 0
    assert src2.manifest[0]["from_cache"] is True and np.isfinite(d2.values).all()


def test_transient_failure_is_retried(tmp_path):
    dc, w = dc_cells(MERRA2_GRID)
    src, calls = make_source(tmp_path, MERRA2_T2M, MERRA_FILE, fail_times=2)
    src.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    assert calls["open"] == 3


def test_persistent_failure_raises_and_reports(tmp_path):
    dc, w = dc_cells(MERRA2_GRID)
    src, calls = make_source(tmp_path, MERRA2_T2M, MERRA_FILE, fail_times=99)
    with pytest.raises(ReadFailed) as exc:
        src.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    assert calls["open"] == 4  # 1 intento + 3 reintentos
    assert exc.value.affected_regions == ["US-DC"]
    assert src.manifest[0]["status"] == "error" and src.manifest[0]["sha256"] is None
    assert not list((tmp_path / "cache").rglob("*.npz"))


def test_bad_unit_is_not_retried(tmp_path):
    ds = xr.open_dataset(MERRA_FILE, engine="h5netcdf", decode_times=False).load()
    ds["T2M"].attrs["units"] = "C"
    bad = tmp_path / "bad.nc4"
    ds.to_netcdf(bad, engine="h5netcdf")
    dc, w = dc_cells(MERRA2_GRID)
    src, calls = make_source(tmp_path, MERRA2_T2M, bad)
    with pytest.raises(ReadFailed, match="Unidad inesperada"):
        src.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    assert calls["open"] == 1


def test_duplicate_month_is_an_error(tmp_path):
    dc, w = dc_cells(MERRA2_GRID)
    src, _ = make_source(tmp_path, MERRA2_T2M, MERRA_FILE, months=((2024, 7), (2024, 7)))
    with pytest.raises(DataSourceError, match="más de un gránulo"):
        src.read(Var("air_temperature"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)


def test_max_four_concurrent_reads():
    src = GesDiscSource(MERRA2_T2M, max_workers=16, login=lambda: None)
    assert src.max_workers == 4


# ---- credenciales ---------------------------------------------------------------------
def test_netrc_fix_on_windows(tmp_path):
    (tmp_path / ".netrc").write_text("x", encoding="utf-8")
    env = {}
    assert netrc_env_fix(tmp_path, env, is_windows=True) == str(tmp_path / ".netrc")
    assert env["NETRC"] == str(tmp_path / ".netrc")


def test_netrc_fix_leaves_existing_setup_alone(tmp_path):
    (tmp_path / ".netrc").write_text("x", encoding="utf-8")
    assert netrc_env_fix(tmp_path, {"NETRC": "otro"}, is_windows=True) is None
    assert netrc_env_fix(tmp_path, {}, is_windows=False) is None
    (tmp_path / "_netrc").write_text("x", encoding="utf-8")
    assert netrc_env_fix(tmp_path, {}, is_windows=True) is None


def test_no_credentials_in_pipeline_code():
    root = Path(__file__).resolve().parents[1]
    for p in list(root.glob("*.py")) + list((root / "sources").glob("*.py")):
        text = p.read_text(encoding="utf-8").lower()
        assert "machine urs.earthdata" not in text, p
        assert "password=" not in text.replace(" ", ""), p


def test_variable_definitions_per_source():
    t, p = variables.get("air_temperature", "gesdisc"), variables.get("precipitation", "gesdisc")
    assert (t.grid, p.grid) == (MERRA2_GRID, IMERG_GRID)
    assert p.kind == "observation" and p.unit_annual == "mm" and p.relative_change
    assert variables.get("precipitation", "power").kind == "reanalysis"
    with pytest.raises(KeyError):
        variables.get("T2M", "gesdisc")


# ---- en vivo (se omiten salvo con --run-live; requieren ~/.netrc) ------------------------
@pytest.mark.live
@pytest.mark.parametrize("product,grid", [(MERRA2_T2M, MERRA2_GRID), (IMERG_PRECIP, IMERG_GRID)])
def test_live_one_granule(tmp_path, product, grid):
    dc, w = dc_cells(grid)
    src = GesDiscSource(product, cache_dir=tmp_path / "cache")
    data = src.read(Var("x"), [dc], {dc.id: w}, w.lats, w.lons, 2024, 2024)
    assert len(data.months) == 12 and np.isfinite(data.values).all()
