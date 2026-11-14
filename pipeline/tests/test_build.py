"""Construcción de archivos (T004). La rejilla de entrada es SINTÉTICA y solo existe en estas pruebas (FR-D06):
sirve para comprobar el armado, no describe ningún lugar real.
"""

import ast
import datetime as dt
import json
from pathlib import Path

import numpy as np
import pytest

import build
import contract
from power_regional import CellGrid, DownloadFailed, Tile
from weights import CellWeights

REGIONS = ["US-DC", "US-RI"]
TODAY = dt.date(2026, 11, 14)


def synthetic_tile_grid(code: str, tile: Tile) -> CellGrid:
    lats = np.arange(tile.south, tile.north + 1e-9, 0.5)
    j0, j1 = int(np.ceil(tile.west / 0.625 - 1e-9)), int(np.floor(tile.east / 0.625 + 1e-9))
    lons = np.arange(j0, j1 + 1) * 0.625
    la, lo = (a.ravel() for a in np.meshgrid(lats, lons, indexing="ij"))
    months = [(y, m) for y in range(1981, 2027) for m in range(1, 13)]
    t = np.array([y + (m - 0.5) / 12 for y, m in months])
    rng = np.random.default_rng(7)
    if code == "T2M":
        base = 12 + 0.03 * (t - 1981) + 8 * np.sin(2 * np.pi * (t % 1))
        vals = base[None, :] + 0.1 * la[:, None] / 40 + rng.normal(0, 0.3, (len(la), len(t)))
        unit = "C"
    else:
        base = 3 + 0.01 * (t - 1981) + np.sin(2 * np.pi * (t % 1))
        vals = np.clip(base[None, :] + rng.normal(0, 0.2, (len(la), len(t))), 0, None)
        unit = "mm/day"
    vals[:, -3:] = np.nan  # oct–dic 2026 aún sin procesar
    return CellGrid(code, unit, la, lo, months, vals, {}, ["MERRA2"], "v2.10.0", -999.0)


class FakeDownloader:
    def __init__(self, fail_tiles=(), times=None):
        self.manifest, self.fail_tiles, self.written = [], set(fail_tiles), []
        self.times = times or {}

    def fetch_many(self, variable, tiles, start, end):
        bad = [t for t in tiles if t in self.fail_tiles]
        for t in tiles:
            self.manifest.append({"variable": variable.code, "tile": t.label, "status": "error" if t in bad else "ok",
                                  "retrieved_at_utc": self.times.get(t, "2026-11-14T17:00:00Z"), "url": "u",
                                  "sha256": None, "from_cache": False})
        if bad:
            raise DownloadFailed([{"variable": variable.code, "tile": t.label, "error": "sin red"} for t in bad])
        return {t: synthetic_tile_grid(variable.code, t) for t in tiles}

    def write_manifest(self, path):
        self.written.append(Path(path).name)


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("o") / "trends"
    files = build.build(REGIONS, ["T2M", "PRECTOTCORR"], out, FakeDownloader(), last_year=2025,
                        manifest_dir=out.parent / "manifest", today=TODAY)
    return out, files


def read(out, rel):
    return json.loads((out / rel).read_text(encoding="utf-8"))


def test_writes_contract_files(built):
    out, files = built
    assert {p.relative_to(out).as_posix() for p in out.rglob("*.json")} == set(files) == {
        "catalog.json", "map/T2M.json", "map/PRECTOTCORR.json",
        *(f"series/{c}/{r}.json" for c in ("T2M", "PRECTOTCORR") for r in REGIONS)}
    for c in ("T2M", "PRECTOTCORR"):
        for r in REGIONS:
            assert contract.validate_series(read(out, f"series/{c}/{r}.json"), 1981, 2025) == []


def test_series_content(built):
    out, _ = built
    s = read(out, "series/T2M/US-RI.json")
    assert s["years"] == list(range(1981, 2026)) and s["excluded_years"] == []
    assert s["partial_year"] == {"year": 2026, "months_valid": 9}
    assert len(s["windows"]["rows"]) == 666
    rows = [dict(zip(contract.WINDOW_COLUMNS, r)) for r in s["windows"]["rows"]]
    full = next(r for r in rows if (r["start"], r["end"]) == (1981, 2025))
    assert full["n"] == 45
    assert full["status"] == "increasing" and full["slope_decade"] == pytest.approx(0.3, abs=0.05)
    assert s["provenance"]["is_synthetic"] is False and s["provenance"]["requests"] == "manifest/2026-11-14.json"
    assert s["provenance"]["n_cells"] == 4
    dc = read(out, "series/T2M/US-DC.json")
    assert "small_region" in dc["windows"]["rows"][0][contract.WINDOW_COLUMNS.index("flags")]


def test_precipitation_annual_is_a_sum(built):
    out, _ = built
    s = read(out, "series/PRECTOTCORR/US-DC.json")
    assert s["unit"] == "mm/año"
    assert 900 < s["values"][0] < 1400  # ~3 mm/día × 365 días
    assert any("mm/año" in t for t in s["provenance"]["transformations"])


def test_map_keys_match_windows_and_values(built):
    out, _ = built
    for code in ("T2M", "PRECTOTCORR"):
        mp = read(out, f"map/{code}.json")
        assert len(mp["windows"]) == 666 and mp["regions"] == REGIONS
        for i, r in enumerate(REGIONS):
            s = read(out, f"series/{code}/{r}.json")
            years, values = np.array(s["years"]), np.array(s["values"])
            for row in s["windows"]["rows"][::37]:
                d = dict(zip(contract.WINDOW_COLUMNS, row))
                got = mp["windows"][f"{d['start']}-{d['end']}"][i]
                if code == "T2M":
                    assert got == pytest.approx(d["slope_decade"], abs=1e-4)
                else:
                    mean = values[(years >= d["start"]) & (years <= d["end"])].mean()
                    assert got == pytest.approx(d["slope_decade"] / mean * 100, abs=2e-3)
    assert read(out, "map/T2M.json")["unit"] == "°C/década"
    assert read(out, "map/PRECTOTCORR.json")["unit"] == "%/década"


def test_percent_columns(built):
    """slope_decade_pct, ci_low_pct, ci_high_pct: % de la media de la ventana en precipitación; null en T2M."""
    out, _ = built
    t2m = read(out, "series/T2M/US-RI.json")
    assert t2m["windows"]["columns"] == contract.WINDOW_COLUMNS_PCT
    assert all(r[-3:] == [None, None, None] for r in t2m["windows"]["rows"])
    pr = read(out, "series/PRECTOTCORR/US-RI.json")
    years, values = np.array(pr["years"]), np.array(pr["values"])
    mp = read(out, "map/PRECTOTCORR.json")
    i = mp["regions"].index("US-RI")
    for row in pr["windows"]["rows"][::29]:
        d = dict(zip(contract.WINDOW_COLUMNS_PCT, row))
        mean = values[(years >= d["start"]) & (years <= d["end"])].mean()
        assert d["slope_decade_pct"] == pytest.approx(d["slope_decade"] / mean * 100, abs=2e-3)
        assert d["ci_low_pct"] == pytest.approx(d["ci_low"] / mean * 100, abs=2e-3)
        assert d["ci_high_pct"] == pytest.approx(d["ci_high"] / mean * 100, abs=2e-3)
        assert d["ci_low_pct"] <= d["slope_decade_pct"] <= d["ci_high_pct"]
        assert mp["windows"][f"{d['start']}-{d['end']}"][i] == pytest.approx(d["slope_decade_pct"], abs=1e-4)
    assert any("ci_high_pct" in t for t in pr["provenance"]["transformations"])


def test_percent_is_null_when_mean_not_positive():
    assert build.pct_of_mean(1.0, (0.5, 1.5), 0.0) == [None, None, None]
    assert build.pct_of_mean(1.0, (0.5, 1.5), -2.0) == [None, None, None]
    assert build.pct_of_mean(1.0, (0.5, 1.5), 50.0) == [2.0, 1.0, 3.0]


def test_catalog(built):
    out, _ = built
    cat = read(out, "catalog.json")
    assert [r["id"] for r in cat["regions"]] == REGIONS
    assert cat["period"] == {"first_year": 1981, "last_complete_year": 2025, "min_window_years": 10}
    assert cat["regions"][0]["small_region"] is True and cat["regions"][1]["small_region"] is False
    assert {v["id"]: v["relative_change"] for v in cat["variables"]} == {"T2M": False, "PRECTOTCORR": True}


def test_invalid_output_writes_nothing(tmp_path, monkeypatch):
    out = tmp_path / "trends"
    out.mkdir()
    (out / "previo.json").write_text("{}", encoding="utf-8")
    real = build.build_series

    def broken(region, *a, **k):
        res = real(region, *a, **k)
        if region.id == "US-RI":
            res.doc["windows"]["rows"][0][11] = "quizás"
        return res

    monkeypatch.setattr(build, "build_series", broken)
    with pytest.raises(contract.ContractError):
        build.build(REGIONS, ["T2M"], out, FakeDownloader(), last_year=2025, manifest_dir=tmp_path / "m", today=TODAY)
    assert [p.name for p in out.iterdir()] == ["previo.json"]  # lo anterior queda intacto
    assert not list(tmp_path.glob(".trends-tmp-*"))


def test_download_failure_writes_nothing_and_lists_regions(tmp_path):
    out = tmp_path / "trends"
    fake = FakeDownloader(fail_tiles={Tile(40.0, -80.0, 50.0, -70.0)})  # tesela de Rhode Island
    with pytest.raises(DownloadFailed) as exc:
        build.build(REGIONS, ["T2M"], out, fake, last_year=2025, manifest_dir=tmp_path / "m", today=TODAY)
    assert exc.value.affected_regions == ["US-RI"]
    assert not out.exists()
    assert fake.written == ["2026-11-14.json"]  # el manifiesto se escribe aunque falle


def test_retrieved_at_uses_only_the_region_tiles(tmp_path):
    ri_tile = Tile(40.0, -80.0, 50.0, -70.0)
    fake = FakeDownloader(times={ri_tile: "2026-11-14T23:59:59Z"})
    files = build.build(REGIONS, ["T2M"], tmp_path / "trends", fake, last_year=2025, manifest_dir=tmp_path / "m",
                        today=TODAY)
    assert files["series/T2M/US-RI.json"]["provenance"]["retrieved_at_utc"] == "2026-11-14T23:59:59Z"
    assert files["series/T2M/US-DC.json"]["provenance"]["retrieved_at_utc"] == "2026-11-14T17:00:00Z"


def test_regional_monthly_weighted_mean_and_all_cells_rule():
    grid = CellGrid("T2M", "C", np.array([30.0, 30.0]), np.array([-115.0, -114.375]), [(2000, 1), (2000, 2)],
                    np.array([[10.0, 10.0], [20.0, np.nan]]), {}, ["MERRA2"], "v", -999.0)
    cw = CellWeights(np.array([30.0, 30.0]), np.array([-115.0, -114.375]), np.array([1.0, 0.5]), np.array([3.0, 1.0]))
    out = build.regional_monthly(grid, cw)
    assert out[0] == pytest.approx((3 * 10 + 1 * 20) / 4)
    assert np.isnan(out[1])


def test_build_does_not_import_synthetic_data():
    tree = ast.parse(Path(build.__file__).read_text(encoding="utf-8"))
    mods = [n.module or "" for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)]
    mods += [a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names]
    assert not any("synthetic" in m for m in mods)
