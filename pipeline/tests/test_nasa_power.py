"""Conector NASA POWER: parseo de respuestas reales grabadas y manejo de errores sin sustitución silenciosa."""

import json

import numpy as np
import pytest
import requests

from trendlens.config import PRESETS_BY_ID, VARIABLES, Location
from trendlens.data.base import DataSourceError
from trendlens.data.nasa_power import NasaPowerSource, build_request, parse_power_monthly

MEX = PRESETS_BY_ID["mexicali"]


class FakeResponse:
    def __init__(self, status, payload=None, text=None):
        self.status_code = status
        self._payload = payload
        self.text = text if text is not None else json.dumps(payload)

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class FakeSession:
    def __init__(self, response=None, exc=None):
        self.response, self.exc, self.calls = response, exc, 0
        self.headers = {}

    def get(self, url, params=None, timeout=None):
        self.calls += 1
        if self.exc:
            raise self.exc
        return self.response


def test_parse_real_fixture(load_fixture):
    b = parse_power_monthly(load_fixture("power_mexicali_1981_2025.json"), VARIABLES["T2M"], MEX,
                            request_url="https://example/test", retrieved_at_utc="2026-11-06T00:00:00+00:00")
    assert len(b.data) == 45 * 12
    assert (b.data["unit"] == "°C").all()
    assert not b.is_synthetic and not b.data["is_synthetic"].any()
    p = b.provenance
    assert p.api_version == "v2.10.0" and p.extra["sources"] == ["MERRA2"]
    assert p.request_url and p.retrieved_at_utc
    assert len(p.source_annual_values) == 45  # el "mes 13" no se mezcla con los meses
    assert b.data["timestamp"].is_monotonic_increasing


def test_fill_values_in_partial_year_become_flagged_missing(load_fixture):
    b = parse_power_monthly(load_fixture("power_mexicali_2025_2026_partial.json"), VARIABLES["T2M"], MEX,
                            request_url="x", retrieved_at_utc="2026-11-06T00:00:00+00:00")
    fills = b.data[b.data["quality_flag"] == "fill_value"]
    assert len(fills) >= 1 and fills["value"].isna().all()
    assert -999.0 not in b.data["value"].to_numpy()
    assert 2026 not in b.provenance.source_annual_values  # año incompleto: sin valor anual


def test_unit_label_mismatch_is_rejected(load_fixture):
    payload = load_fixture("power_mexicali_1981_2025.json")
    payload["parameters"]["T2M"]["units"] = "K"
    with pytest.raises(DataSourceError, match="Unidad inesperada"):
        parse_power_monthly(payload, VARIABLES["T2M"], MEX, request_url="x", retrieved_at_utc="t")


def test_missing_parameter_is_rejected(load_fixture):
    payload = load_fixture("power_mexicali_1981_2025.json")
    del payload["properties"]["parameter"]["T2M"]
    with pytest.raises(DataSourceError, match="no incluye"):
        parse_power_monthly(payload, VARIABLES["T2M"], MEX, request_url="x", retrieved_at_utc="t")


def test_http_422_error_is_reported_with_server_message(load_fixture, tmp_path):
    sess = FakeSession(FakeResponse(422, load_fixture("power_error_422_start.json")))
    src = NasaPowerSource(session=sess, cache_dir=tmp_path)
    with pytest.raises(DataSourceError) as ei:
        src.fetch(VARIABLES["T2M"], MEX, 1981, 1982)
    assert ei.value.status_code == 422
    assert "1981" in str(ei.value)  # mensaje original del servidor
    assert not list(tmp_path.iterdir())  # los errores no se guardan en caché


@pytest.mark.parametrize("exc", [requests.exceptions.ConnectionError("dns"), requests.exceptions.Timeout("slow")])
def test_connection_errors_are_not_confused_with_data(exc, tmp_path):
    src = NasaPowerSource(session=FakeSession(exc=exc), cache_dir=tmp_path)
    result = None
    with pytest.raises(DataSourceError):
        result = src.fetch(VARIABLES["T2M"], MEX, 2000, 2010)
    assert result is None  # nunca se devuelve una serie (ni sintética) tras un fallo


def test_invalid_json_with_200_is_an_error(tmp_path):
    src = NasaPowerSource(session=FakeSession(FakeResponse(200, None, text="<html>")), cache_dir=tmp_path)
    with pytest.raises(DataSourceError, match="JSON"):
        src.fetch(VARIABLES["T2M"], MEX, 2000, 2010)


def test_validation_happens_before_network():
    sess = FakeSession(exc=AssertionError("no debería llamarse"))
    src = NasaPowerSource(session=sess, cache_dir=None)
    with pytest.raises(DataSourceError, match="1981"):
        src.fetch(VARIABLES["T2M"], MEX, 1975, 1990)
    with pytest.raises(DataSourceError, match="Coordenadas"):
        build_request(VARIABLES["T2M"], Location("bad", "x", 95.0, 0.0), 1990, 2000)
    assert sess.calls == 0


def test_cache_roundtrip_and_corruption(load_fixture, tmp_path):
    payload = load_fixture("power_mexicali_1981_2025.json")
    sess = FakeSession(FakeResponse(200, payload))
    src = NasaPowerSource(session=sess, cache_dir=tmp_path)
    b1 = src.fetch(VARIABLES["T2M"], MEX, 1981, 2025)
    b2 = src.fetch(VARIABLES["T2M"], MEX, 1981, 2025)
    assert not b1.provenance.from_cache and b2.provenance.from_cache and sess.calls == 1
    np.testing.assert_array_equal(b1.data["value"].to_numpy(), b2.data["value"].to_numpy())
    for f in tmp_path.iterdir():
        f.write_text("{corrupto", encoding="utf-8")
    b3 = src.fetch(VARIABLES["T2M"], MEX, 1981, 2025)
    assert not b3.provenance.from_cache and sess.calls == 2


@pytest.mark.live
def test_live_power_matches_recorded_fixture(load_fixture, tmp_path):
    """Consulta real (opcional): los valores 2018–2020 deben coincidir con lo grabado el 2026-11-06."""
    src = NasaPowerSource(cache_dir=tmp_path)
    live = src.fetch(VARIABLES["T2M"], MEX, 2018, 2020)
    rec = parse_power_monthly(load_fixture("power_mexicali_1981_2025.json"), VARIABLES["T2M"], MEX,
                              request_url="x", retrieved_at_utc="t").data
    rec = rec[rec["timestamp"].dt.year.between(2018, 2020)]["value"].to_numpy()
    np.testing.assert_allclose(live.data["value"].to_numpy(), rec, atol=0.011)
