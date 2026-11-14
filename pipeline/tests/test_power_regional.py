"""Descarga regional (FR-D01, T002). Sin red: las respuestas reales vienen de fixtures y la red se simula."""

import json
from pathlib import Path

import numpy as np
import pytest
import requests

from power_regional import (MAX_RETRIES, Downloader, DownloadFailed, Tile, build_url, merge_grids, parse_regional,
                            tiles_for_bounds, unique_manifest_path)
from trendlens.config import VARIABLES
from trendlens.data.base import DataSourceError

FIX = Path(__file__).parent / "fixtures"
T2M, PREC = VARIABLES["T2M"], VARIABLES["PRECTOTCORR"]
TILE = Tile(30.0, -116.0, 32.0, -114.0)


def fixture_text(code: str) -> str:
    return (FIX / f"power_regional_bcn_2024_2025_{code}.json").read_text(encoding="utf-8")


class FakeResponse:
    def __init__(self, status: int, text: str):
        self.status_code, self.text = status, text


class FakeSession:
    """Devuelve, en orden, las respuestas o excepciones de `script` y cuenta las llamadas."""

    def __init__(self, script):
        self.script, self.calls, self.headers = list(script), [], {}

    def get(self, url, timeout=None):
        self.calls.append((url, timeout))
        item = self.script.pop(0) if self.script else FakeResponse(500, "sin guion")
        if isinstance(item, Exception):
            raise item
        return item


def downloader(tmp_path, script):
    sleeps = []
    d = Downloader(cache_dir=tmp_path / "cache", session=FakeSession(script), sleep=sleeps.append)
    return d, sleeps


# ---- lectura -------------------------------------------------------------------------
def test_parse_real_response():
    g = parse_regional(json.loads(fixture_text("T2M")), T2M)
    assert g.values.shape == (15, 24)  # 5 latitudes × 3 longitudes, 24 meses
    assert g.months[0] == (2024, 1) and g.months[-1] == (2025, 12)
    assert g.sources == ["MERRA2"] and g.api_version == "v2.10.0" and g.unit_declared == "C"
    i = g.index_of(30.0, -115.625)
    assert g.values[i, 0] == pytest.approx(13.99)
    assert g.annual[2024][i] == pytest.approx(17.93)


def test_fill_value_becomes_nan():
    p = json.loads(fixture_text("T2M"))
    p["features"][0]["properties"]["parameter"]["T2M"]["202403"] = -999.0
    g = parse_regional(p, T2M)
    assert np.isnan(g.values[0, 2]) and np.isfinite(g.values[0, 3])


def test_unexpected_unit_is_an_error():
    p = json.loads(fixture_text("PRECTOTCORR"))
    p["parameters"]["PRECTOTCORR"]["units"] = "mm"
    with pytest.raises(DataSourceError, match="Unidad inesperada"):
        parse_regional(p, PREC)


def test_unexpected_source_is_an_error():
    p = json.loads(fixture_text("T2M"))
    p["header"]["sources"] = ["MERRA2", "OTRA"]
    with pytest.raises(DataSourceError, match="Fuentes"):
        parse_regional(p, T2M)


def test_malformed_payload_is_an_error():
    with pytest.raises(DataSourceError):
        parse_regional({"messages": ["algo salió mal"]}, T2M)


# ---- teselas -------------------------------------------------------------------------
def test_tiles_are_aligned_and_cover_with_margin():
    tiles = tiles_for_bounds((-118.37, 27.88, -112.54, 32.72))  # Baja California
    assert set(tiles) == {Tile(20, -120, 30, -110), Tile(30, -120, 40, -110)}
    assert tiles_for_bounds((-110.2, 29.9, -109.5, 30.1)) == [Tile(20, -120, 30, -110), Tile(20, -110, 30, -100),
                                                               Tile(30, -120, 40, -110), Tile(30, -110, 40, -100)]


def test_merge_removes_duplicate_border_cells():
    g = parse_regional(json.loads(fixture_text("T2M")), T2M)
    merged = merge_grids([g, g])
    assert len(merged.lats) == len(g.lats)


def test_build_url_rejects_start_before_1981():
    with pytest.raises(DataSourceError):
        build_url(T2M, TILE, 1980, 1990)


# ---- red, reintentos y caché -----------------------------------------------------------
def test_network_failure_is_an_error_never_data(tmp_path):
    err = requests.exceptions.ConnectionError("sin red")
    d, sleeps = downloader(tmp_path, [err] * (MAX_RETRIES + 1))
    with pytest.raises(DownloadFailed) as exc:
        d.fetch_many(T2M, [TILE], 2024, 2025)
    assert len(d.session.calls) == MAX_RETRIES + 1 == 4
    assert sleeps == [2.0, 4.0, 8.0]
    assert exc.value.failures[0]["tile"] == TILE.label
    assert d.manifest[0]["status"] == "error" and d.manifest[0]["sha256"] is None
    assert not list((tmp_path / "cache").glob("*")) if (tmp_path / "cache").exists() else True


def test_timeout_is_30_seconds(tmp_path):
    d, _ = downloader(tmp_path, [FakeResponse(200, fixture_text("T2M"))])
    d.fetch_many(T2M, [TILE], 2024, 2025)
    assert d.session.calls[0][1] == (10, 30)


def test_transient_error_then_success(tmp_path):
    d, sleeps = downloader(tmp_path, [FakeResponse(503, "ocupado"), FakeResponse(200, fixture_text("T2M"))])
    grids = d.fetch_many(T2M, [TILE], 2024, 2025)
    assert TILE in grids and sleeps == [2.0]


def test_client_error_is_not_retried(tmp_path):
    d, sleeps = downloader(tmp_path, [FakeResponse(422, '{"messages": ["start < 1981"]}')])
    with pytest.raises(DownloadFailed, match="HTTP 422"):
        d.fetch_many(T2M, [TILE], 2024, 2025)
    assert len(d.session.calls) == 1 and sleeps == []


def test_bad_unit_from_network_is_not_cached(tmp_path):
    p = json.loads(fixture_text("T2M"))
    p["parameters"]["T2M"]["units"] = "K"
    bad = json.dumps(p)
    d, _ = downloader(tmp_path, [FakeResponse(200, bad)])
    with pytest.raises(DownloadFailed, match="Unidad inesperada"):
        d.fetch_many(T2M, [TILE], 2024, 2025)
    assert not (tmp_path / "cache").exists() or not list((tmp_path / "cache").glob("*.gz"))


def test_second_run_only_requests_what_failed(tmp_path):
    other = Tile(30.0, -114.0, 32.0, -112.0)
    err = requests.exceptions.Timeout("lento")
    d1, _ = downloader(tmp_path, [FakeResponse(200, fixture_text("T2M"))] + [err] * (MAX_RETRIES + 1))
    with pytest.raises(DownloadFailed) as exc:
        d1.fetch_many(T2M, [TILE, other], 2024, 2025)
    assert [f["tile"] for f in exc.value.failures] == [other.label]

    d2, _ = downloader(tmp_path, [FakeResponse(200, fixture_text("T2M"))])
    grids = d2.fetch_many(T2M, [TILE, other], 2024, 2025)
    assert len(grids) == 2
    assert len(d2.session.calls) == 1 and "longitude-min=-114" in d2.session.calls[0][0]
    by_tile = {e["tile"]: e for e in d2.manifest}
    assert by_tile[TILE.label]["from_cache"] is True and by_tile[other.label]["from_cache"] is False


def test_manifest_records_url_date_and_fingerprint(tmp_path):
    import hashlib
    body = fixture_text("T2M")
    d, _ = downloader(tmp_path, [FakeResponse(200, body)])
    d.fetch_many(T2M, [TILE], 2024, 2025)
    path = d.write_manifest(unique_manifest_path(tmp_path / "manifest", "2026-11-14"))
    assert path.name == "2026-11-14.json"
    entry = json.loads(path.read_text(encoding="utf-8"))["requests"][0]
    assert entry["url"] == build_url(T2M, TILE, 2024, 2025)
    assert entry["retrieved_at_utc"].endswith("Z")
    assert entry["sha256"] == hashlib.sha256(body.encode("utf-8")).hexdigest()
    assert entry["status"] == "ok" and entry["from_cache"] is False


def test_manifest_never_overwrites_another_run(tmp_path):
    import datetime as dt
    m = tmp_path / "manifest"
    first = unique_manifest_path(m, "2026-11-14")
    m.mkdir()
    first.write_text("{}", encoding="utf-8")
    now = dt.datetime(2026, 11, 14, 18, 5, 9)
    second = unique_manifest_path(m, "2026-11-14", now)
    assert second.name == "2026-11-14-180509.json"
    second.write_text("{}", encoding="utf-8")
    assert unique_manifest_path(m, "2026-11-14", now).name == "2026-11-14-180509-2.json"


def test_corrupted_cache_is_downloaded_again(tmp_path):
    d1, _ = downloader(tmp_path, [FakeResponse(200, fixture_text("T2M"))])
    d1.fetch_many(T2M, [TILE], 2024, 2025)
    for p in (tmp_path / "cache").glob("*.gz"):
        p.write_bytes(b"basura")
    d2, _ = downloader(tmp_path, [FakeResponse(200, fixture_text("T2M"))])
    d2.fetch_many(T2M, [TILE], 2024, 2025)
    assert len(d2.session.calls) == 1
