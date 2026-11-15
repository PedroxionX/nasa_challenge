"""Variables de la Phase 8 (T031–T038): escorrentía, nieve y temperatura del suelo de GLDAS; humedad del aire, vapor
de agua, ozono, aerosoles, polvo y temperatura máxima y mínima de MERRA-2.

Sin credenciales: recortes REALES de pocos KB (julio de 2024; Rhode Island para GLDAS, Washington D.C. para MERRA-2)
en tests/fixtures/. Cada conversión se comprueba contra el valor crudo del archivo, leído aparte con xarray.
"""

from pathlib import Path

import numpy as np
import pytest
import xarray as xr

import build
import variables
from sources import gesdisc, gldas, merra2
from sources.gesdisc import GesDiscSource, Granule
from trendlens.data.base import DataSourceError
from weights import GLDAS_GRID, MERRA2_GRID, load_regions, region_weights

FIX = Path(__file__).parent / "fixtures"
GLDAS_FILE = FIX / "gldas_extra_202407_ri_cut.nc4"
SLV_FILE = FIX / "merra2_slv_extra_202407_dc_cut.nc4"
AER_FILE = FIX / "merra2_aer_202407_dc_cut.nc4"
STAT_FILE = FIX / "merra2_stat_202407_dc_cut.nc4"
T2M_FILE = FIX / "merra2_T2M_202407_dc_cut.nc4"

NEW_IDS = ("soil_temperature", "runoff", "snow_water_equivalent", "specific_humidity", "total_precipitable_water",
           "total_ozone", "aerosol_optical_depth", "dust_optical_depth", "max_air_temperature", "min_air_temperature")


def raw(path, var):
    with xr.open_dataset(path, engine="h5netcdf", decode_times=False) as ds:
        return ds[var].load().values[0].astype(float)


# --------------------------------------------------------------------------------------
# GLDAS
# --------------------------------------------------------------------------------------
def test_runoff_is_surface_plus_baseflow_times_eight():
    """Los acumulados mensuales de GLDAS son la media de los pasos de 3 h: × 8 pasos al día → mm/día."""
    lats, lons, arr = gldas.read_runoff(open(GLDAS_FILE, "rb"))
    expected = (raw(GLDAS_FILE, "Qs_acc") + raw(GLDAS_FILE, "Qsb_acc")) * 8.0
    assert arr.shape == (len(lats), len(lons))
    assert np.allclose(arr, expected, equal_nan=True)
    assert np.isnan(arr).any() and np.isfinite(arr).any()  # hay mar y tierra en el recorte
    assert 0 <= np.nanmin(arr) and np.nanmax(arr) * 31 < 300  # julio en Nueva Inglaterra: decenas de mm al mes


def test_snow_keeps_units_and_is_zero_in_july():
    _, _, arr = gldas.read_swe(open(GLDAS_FILE, "rb"))
    assert np.allclose(arr, raw(GLDAS_FILE, "SWE_inst"), equal_nan=True)
    assert np.nanmax(arr) == 0.0 and np.isnan(arr).any()


def test_soil_temperature_converted_to_celsius():
    _, _, arr = gldas.read_avg_surf_t(open(GLDAS_FILE, "rb"))
    assert np.allclose(arr, raw(GLDAS_FILE, "AvgSurfT_inst") - 273.15, equal_nan=True)
    assert 15 < np.nanmean(arr) < 35


@pytest.mark.parametrize("reader,var", [(gldas.read_runoff, "Qsb_acc"), (gldas.read_avg_surf_t, "AvgSurfT_inst")])
def test_gldas_unexpected_unit_is_an_error(tmp_path, reader, var):
    ds = xr.open_dataset(GLDAS_FILE, engine="h5netcdf", decode_times=False).load()
    ds[var].attrs["units"] = "otra"
    bad = tmp_path / "bad.nc4"
    ds.to_netcdf(bad, engine="h5netcdf")
    with pytest.raises(DataSourceError, match="Unidad inesperada"):
        reader(open(bad, "rb"))


class Var:
    def __init__(self, var_id):
        self.id = var_id


def one_granule_source(tmp_path, product, path):
    def searcher(prod, first_year, end_year):
        return [Granule(f"{prod.short_name}.202407", (2024, 7), "https://example/202407", path)]

    return GesDiscSource(product, cache_dir=tmp_path / "cache", sleep=lambda s: None, searcher=searcher,
                         opener=lambda g: open(g.handle, "rb"), login=lambda: None)


@pytest.mark.parametrize("product,var_id", [(gldas.GLDAS_RUNOFF, "runoff"), (gldas.GLDAS_SWE, "snow_water_equivalent"),
                                            (gldas.GLDAS_SURF_TEMP, "soil_temperature")])
def test_gldas_coastal_region_uses_the_land_rule(tmp_path, product, var_id):
    (ri,) = load_regions(["US-RI"])
    w = region_weights(ri.geometry, GLDAS_GRID)
    data = one_granule_source(tmp_path, product, GLDAS_FILE).read(Var(var_id), [ri], {ri.id: w}, w.lats, w.lons,
                                                                  2024, 2024)
    var = variables.get(var_id, "gesdisc")
    assert var.min_valid_fraction == 0.5 and var.grid == GLDAS_GRID
    assert np.isnan(build.regional_monthly(data, w)[0])  # con la regla de «todas las celdas» se perdería el mes
    assert np.isfinite(build.regional_monthly(data, w, var.min_valid_fraction)[0])


def test_three_gldas_variables_do_not_share_cache(tmp_path):
    (ri,) = load_regions(["US-RI"])
    w = region_weights(ri.geometry, GLDAS_GRID)
    out = {}
    for product, var_id in ((gldas.GLDAS_RUNOFF, "runoff"), (gldas.GLDAS_SURF_TEMP, "soil_temperature")):
        src = one_granule_source(tmp_path, product, GLDAS_FILE)
        out[var_id] = src.read(Var(var_id), [ri], {ri.id: w}, w.lats, w.lons, 2024, 2024).values
        assert src.manifest[0]["from_cache"] is False
    land = np.isfinite(out["runoff"][:, 0])
    assert np.nanmax(out["runoff"][land, 0]) < 10 < np.nanmin(out["soil_temperature"][land, 0])


# --------------------------------------------------------------------------------------
# MERRA-2
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize("reader,path,var,factor,offset,lo,hi", [
    (merra2.read_qv2m, SLV_FILE, "QV2M", 1000.0, 0.0, 8, 25),            # g/kg en julio, costa este
    (merra2.read_tqv, SLV_FILE, "TQV", 1.0, 0.0, 20, 60),                # mm de agua precipitable
    (merra2.read_to3, SLV_FILE, "TO3", 1.0, 0.0, 250, 400),              # unidades Dobson
    (merra2.read_totexttau, AER_FILE, "TOTEXTTAU", 1.0, 0.0, 0.05, 1),   # espesor óptico, sin unidad
    (merra2.read_duexttau, AER_FILE, "DUEXTTAU", 1.0, 0.0, 0.0, 0.2),
    (merra2.read_t2mmax, STAT_FILE, "T2MMAX", 1.0, -273.15, 20, 40),     # °C
    (merra2.read_t2mmin, STAT_FILE, "T2MMIN", 1.0, -273.15, 10, 30),
])
def test_merra2_conversion_against_the_raw_file(reader, path, var, factor, offset, lo, hi):
    lats, lons, arr = reader(open(path, "rb"))
    assert arr.shape == (len(lats), len(lons))
    assert np.allclose(arr, raw(path, var) * factor + offset)
    assert lo < arr.min() and arr.max() < hi
    assert np.allclose(np.diff(lats), MERRA2_GRID.dlat) and np.allclose(np.diff(lons), MERRA2_GRID.dlon)


def test_refactor_keeps_air_temperature_identical():
    _, _, arr = merra2.read_t2m(open(T2M_FILE, "rb"))
    assert np.array_equal(arr, raw(T2M_FILE, "T2M") - 273.15)


def test_mean_temperature_lies_between_minimum_and_maximum():
    """Comprobación independiente de qué son T2MMAX y T2MMIN: en cada celda, mínima ≤ media mensual ≤ máxima, y la
    amplitud es la de un ciclo diario (no la del extremo absoluto del mes)."""
    _, _, tmean = merra2.read_t2m(open(T2M_FILE, "rb"))
    _, _, tmax = merra2.read_t2mmax(open(STAT_FILE, "rb"))
    _, _, tmin = merra2.read_t2mmin(open(STAT_FILE, "rb"))
    assert tmean.shape == tmax.shape == tmin.shape
    assert np.all(tmin < tmean) and np.all(tmean < tmax)
    assert 3 < np.mean(tmax - tmin) < 15


def test_dust_is_a_part_of_total_aerosol():
    _, _, total = merra2.read_totexttau(open(AER_FILE, "rb"))
    _, _, dust = merra2.read_duexttau(open(AER_FILE, "rb"))
    assert np.all(dust >= 0) and np.all(dust < total)


@pytest.mark.parametrize("reader,path,var", [(merra2.read_to3, SLV_FILE, "TO3"), (merra2.read_totexttau, AER_FILE, "TOTEXTTAU"),
                                             (merra2.read_t2mmax, STAT_FILE, "T2MMAX")])
def test_merra2_unexpected_unit_is_an_error(tmp_path, reader, path, var):
    ds = xr.open_dataset(path, engine="h5netcdf", decode_times=False).load()
    ds[var].attrs["units"] = "otra"
    bad = tmp_path / "bad.nc4"
    ds.to_netcdf(bad, engine="h5netcdf")
    with pytest.raises(DataSourceError, match="Unidad inesperada"):
        reader(open(bad, "rb"))


def test_merra2_products_point_to_their_collection():
    assert (merra2.MERRA2_AOD.short_name, merra2.MERRA2_AOD.doi) == ("M2TMNXAER", "10.5067/FH9A0MLJPC7N")
    assert (merra2.MERRA2_T2MMAX.short_name, merra2.MERRA2_T2MMAX.doi) == ("M2SMNXSLV", "10.5067/KVIMOMCUO83U")
    assert merra2.MERRA2_QV2M.short_name == merra2.MERRA2_T2M.short_name == "M2TMNXSLV"


# --------------------------------------------------------------------------------------
# Lectura por OPeNDAP (recorte en el servidor)
# --------------------------------------------------------------------------------------
class FakeResponse:
    def __init__(self, status_code, content):
        self.status_code, self.content = status_code, content


class FakeSession:
    def __init__(self, response):
        self.response, self.urls = response, []

    def get(self, url, timeout=None):
        self.urls.append(url)
        return self.response


def cmr_granule(name="M2SMNXSLV.5.12.4:MERRA2_400.statM_2d_slv_Nx.202407.nc4"):
    handle = {"umm": {"RelatedUrls": [{"Type": "GET DATA", "URL": "https://data.example/x.nc4"},
                                      {"Type": "USE SERVICE API", "Subtype": "OPENDAP DATA",
                                       "URL": "https://opendap.example/granules/x"}]}}
    return Granule(name, (2024, 7), "https://data.example/x.nc4", handle)


def test_opendap_constraint_is_the_read_box_in_file_indices():
    # MERRA-2: lat = −90 + 0,5·i y lon = −180 + 0,625·j → 13…73° N son las filas 206…326; −180…−63,125° las columnas 0…187.
    assert gesdisc.opendap_constraint(merra2.MERRA2_T2MMAX) == "T2MMAX[0:0][206:326][0:187],lat[206:326],lon[0:187],time[0:0]"
    assert gesdisc.opendap_constraint(merra2.MERRA2_AOD).startswith("TOTEXTTAU[0:0][206:326][0:187],")


def test_opendap_url_is_the_one_cmr_announces():
    assert gesdisc.opendap_url(cmr_granule().handle) == "https://opendap.example/granules/x"
    with pytest.raises(DataSourceError, match="OPeNDAP"):
        gesdisc.opendap_url({"umm": {"RelatedUrls": [{"Type": "GET DATA", "URL": "https://data.example/x.nc4"}]}})


def test_opendap_subset_is_read_by_the_same_reader():
    session = FakeSession(FakeResponse(200, STAT_FILE.read_bytes()))
    f = gesdisc.open_granule_opendap(cmr_granule(), merra2.MERRA2_T2MMAX, session)
    _, _, arr = merra2.MERRA2_T2MMAX.read(f)
    assert np.allclose(arr, raw(STAT_FILE, "T2MMAX") - 273.15)
    assert session.urls == ["https://opendap.example/granules/x.nc4?" + gesdisc.opendap_constraint(merra2.MERRA2_T2MMAX)]


@pytest.mark.parametrize("status,content", [(401, b"HTTP Basic: Access denied."), (200, b"<html>Earthdata Login</html>")])
def test_opendap_answer_that_is_not_netcdf_is_an_error(status, content):
    with pytest.raises(OSError, match="OPeNDAP"):
        gesdisc.open_granule_opendap(cmr_granule(), merra2.MERRA2_T2MMAX, FakeSession(FakeResponse(status, content)))


def test_only_the_new_merra2_collections_use_opendap(tmp_path, monkeypatch):
    assert all(p.opendap_origin == (-90.0, -180.0) for p in (merra2.MERRA2_AOD, merra2.MERRA2_DUST_AOD,
                                                             merra2.MERRA2_T2MMAX, merra2.MERRA2_T2MMIN))
    assert all(p.opendap_origin is None for p in (merra2.MERRA2_T2M, merra2.MERRA2_QV2M, gldas.GLDAS_RUNOFF))
    # Sin `opener`, el producto decide: los de OPeNDAP no abren el archivo entero.
    monkeypatch.setattr(gesdisc, "open_granule", lambda g: pytest.fail("no debe abrir el archivo completo"))
    monkeypatch.setattr(gesdisc, "open_granule_opendap", lambda g, product: open(STAT_FILE, "rb"))
    with xr.open_dataset(STAT_FILE, engine="h5netcdf", decode_times=False) as ds:
        lats, lons = np.meshgrid(ds.lat.values, ds.lon.values, indexing="ij")
    vals, meta = gesdisc.read_granule_cached(merra2.MERRA2_T2MMIN, cmr_granule(), lats.ravel(), lons.ravel(), "k",
                                             tmp_path / "cache")
    assert meta["status"] == "ok" and meta["from_cache"] is False
    assert np.allclose(vals, (raw(STAT_FILE, "T2MMIN") - 273.15).ravel())


def test_worker_login_is_retried(monkeypatch):
    calls = []

    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise OSError("tiempo de espera agotado")

    monkeypatch.setattr(gesdisc, "ensure_login", flaky)
    monkeypatch.setattr(gesdisc.time, "sleep", lambda s: None)
    gesdisc._worker_init()
    assert len(calls) == 3


# --------------------------------------------------------------------------------------
# Catálogo de variables y regla de estado
# --------------------------------------------------------------------------------------
def test_every_variable_has_a_source_and_valid_map_breaks():
    sources = build.default_sources("gesdisc")
    assert set(sources) == set(variables.VARIABLE_IDS) and set(NEW_IDS) <= set(sources)
    for vid in variables.VARIABLE_IDS:
        v = variables.get(vid, "gesdisc")
        b = v.breaks
        assert len(b) == 4 and b == sorted(b) and b[0] == -b[3] and b[1] == -b[2], vid
        assert v.map_unit == ("%/década" if v.relative_change else f"{v.unit_annual}/década"), vid
        assert v.kind in ("reanalysis", "observation"), vid


def test_new_variable_definitions():
    get = lambda vid: variables.get(vid, "gesdisc")  # noqa: E731
    # En valor absoluto: las que pueden valer cero (nieve) o cruzar el cero (temperaturas en °C).
    assert not any(get(v).relative_change for v in ("snow_water_equivalent", "soil_temperature", "max_air_temperature",
                                                    "min_air_temperature"))
    assert all(get(v).relative_change for v in ("runoff", "specific_humidity", "total_precipitable_water",
                                                "total_ozone", "aerosol_optical_depth", "dust_optical_depth"))
    assert get("runoff").aggregation == "sum_from_rate" and get("runoff").unit_annual == "mm"
    assert all(get(v).kind == "reanalysis" for v in NEW_IDS)
    merra = [v for v in NEW_IDS if get(v).grid != GLDAS_GRID]
    assert all(get(v).min_valid_fraction is None and get(v).grid == MERRA2_GRID for v in merra)
    # Los aerosoles empiezan en 2003 (salto de 2000 al cambiar los satélites asimilados, El Chichón y Pinatubo).
    assert {v: get(v).first_request_year for v in merra} == {
        "specific_humidity": 1980, "total_precipitable_water": 1980, "total_ozone": 1980, "max_air_temperature": 1980,
        "min_air_temperature": 1980, "aerosol_optical_depth": 2003, "dust_optical_depth": 2003}
    assert "2003" in get("aerosol_optical_depth").definition and "2003" in get("dust_optical_depth").definition
    assert "2004" in get("total_ozone").definition  # aviso del cambio de sensor


def test_status_follows_the_published_slope():
    """Una pendiente que se publica como 0 no puede ir con «sube» o «baja», aunque la prueba sea significativa
    (pasa con la nieve donde casi no nieva)."""
    years = np.arange(2000, 2026)
    tiny = 1e-9 * (years - 2000.0)  # monótona: Mann-Kendall la da por significativa
    row = build.analyze_window(2000, 2025, years, tiny, False).row
    assert row[3] == 0 and row[11] == "inconclusive"
    clear = 0.5 * (years - 2000.0) + np.sin(years)
    assert build.analyze_window(2000, 2025, years, clear, False).row[11] == "increasing"


def test_constant_series_has_no_trend_value():
    """Donde nunca nieva la serie es cero todos los años: la ventana es «invalid» y la pendiente null (sin dato en el
    mapa), no una tendencia de cero."""
    years = np.arange(2000, 2026)
    row = build.analyze_window(2000, 2025, years, np.zeros(len(years)), False).row
    assert row[3] is None and row[11] == "invalid"
