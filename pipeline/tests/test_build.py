"""Construcción de archivos (T004, T020). La rejilla de entrada es SINTÉTICA y solo existe en estas pruebas
(FR-D06): sirve para comprobar el armado, no describe ningún lugar real.
"""

import ast
import datetime as dt
import json
from pathlib import Path

import numpy as np
import pytest

import build
import contract
from sources.base import GridData, ReadFailed, SourceInfo
from weights import CellWeights

REGIONS = ["US-DC", "US-RI"]
TODAY = dt.date(2026, 11, 14)
# Como los productos reales: MERRA-2 1980-01…2026-09; IMERG 2001-01…2025-09 (2025 incompleto).
MONTHS = {"air_temperature": [(y, m) for y in range(1980, 2027) for m in range(1, 13) if (y, m) <= (2026, 9)],
          "precipitation": [(y, m) for y in range(2001, 2026) for m in range(1, 13) if (y, m) <= (2025, 9)]}


def synthetic_values(var_id, lats, months):
    t = np.array([y + (m - 0.5) / 12 for y, m in months])
    rng = np.random.default_rng(7)
    if var_id == "air_temperature":
        base = 12 + 0.03 * (t - 1981) + 8 * np.sin(2 * np.pi * (t % 1))
        return base[None, :] + 0.1 * lats[:, None] / 40 + rng.normal(0, 0.3, (len(lats), len(t)))
    base = 3 + 0.01 * (t - 1981) + np.sin(2 * np.pi * (t % 1))  # mm/día
    return np.clip(base[None, :] + rng.normal(0, 0.2, (len(lats), len(t))), 0, None)


class FakeSource:
    """Fuente de prueba con la interfaz común; id «gesdisc» para usar las definiciones de producción."""

    id = "gesdisc"

    def __init__(self, fail=False, times=None):
        self.manifest, self.fail, self.times = [], fail, times or {}

    def read(self, var, regions, weights, union_lats, union_lons, first_year, end_year):
        self.manifest.append({"variable": var.id, "granule": "sintetico", "status": "error" if self.fail else "ok"})
        if self.fail:
            raise ReadFailed([{"variable": var.id, "item": "sintetico", "error": "sin red"}], ["US-RI"])
        months = MONTHS[var.id]
        vals = synthetic_values(var.id, union_lats, months)
        info = SourceInfo("PRUEBA", "producto de prueba", "TEST", "1", None, "test 0", var.parameter, "x",
                          var.grid.text)
        return GridData(union_lats, union_lons, months, vals, info,
                        {r.id: self.times.get(r.id, "2026-11-14T17:00:00Z") for r in regions},
                        {r.id: len(months) for r in regions})


def run(out, var_ids=("air_temperature", "precipitation"), source=None, manifest_dir=None):
    src = source or FakeSource()
    return build.build(REGIONS, list(var_ids), out, {v: src for v in var_ids},
                       manifest_dir=manifest_dir or out.parent / "manifest", today=TODAY)


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("o") / "trends"
    return out, run(out)


def read(out, rel):
    return json.loads((out / rel).read_text(encoding="utf-8"))


def test_writes_contract_files(built):
    out, files = built
    assert {p.relative_to(out).as_posix() for p in out.rglob("*.json")} == set(files) == {
        "catalog.json", "map/air_temperature.json", "map/precipitation.json",
        *(f"series/{c}/{r}.json" for c in ("air_temperature", "precipitation") for r in REGIONS)}
    for r in REGIONS:
        assert contract.validate_series(read(out, f"series/air_temperature/{r}.json"), 1980, 2025) == []
        assert contract.validate_series(read(out, f"series/precipitation/{r}.json"), 2001, 2024) == []


def test_series_content(built):
    out, _ = built
    s = read(out, "series/air_temperature/US-RI.json")
    assert s["variable"] == "air_temperature" and s["unit"] == "°C"
    assert s["years"] == list(range(1980, 2026)) and s["excluded_years"] == []
    assert s["partial_year"] == {"year": 2026, "months_valid": 9}
    assert len(s["windows"]["rows"]) == 703
    rows = [dict(zip(contract.WINDOW_COLUMNS, r)) for r in s["windows"]["rows"]]
    full = next(r for r in rows if (r["start"], r["end"]) == (1980, 2025))
    assert full["n"] == 46
    assert full["status"] == "increasing" and full["slope_decade"] == pytest.approx(0.3, abs=0.05)
    assert s["provenance"]["is_synthetic"] is False and s["provenance"]["requests"] == "manifest/2026-11-14.json"
    assert s["provenance"]["n_cells"] == 4
    assert {"short_name", "version", "doi", "granules"} <= set(s["provenance"])
    assert s["provenance"]["granules"] == len(MONTHS["air_temperature"])
    pr = read(out, "series/precipitation/US-RI.json")
    assert len(pr["windows"]["rows"]) == 120 and pr["years"] == list(range(2001, 2025))
    assert pr["partial_year"] == {"year": 2025, "months_valid": 9}
    assert pr["provenance"]["grid"] == "0.1° × 0.1°" and pr["provenance"]["n_cells"] > 4
    dc = read(out, "series/air_temperature/US-DC.json")
    assert "small_region" in dc["windows"]["rows"][0][contract.WINDOW_COLUMNS.index("flags")]


def test_precipitation_annual_is_a_sum(built):
    out, _ = built
    s = read(out, "series/precipitation/US-DC.json")
    assert s["unit"] == "mm"
    assert 900 < s["values"][0] < 1400  # ~3 mm/día × 365 días
    assert any("horas del mes" in t for t in s["provenance"]["transformations"])


def test_map_keys_match_windows_and_values(built):
    out, _ = built
    for code, n_keys in (("air_temperature", 703), ("precipitation", 120)):
        mp = read(out, f"map/{code}.json")
        assert len(mp["windows"]) == n_keys and mp["regions"] == REGIONS
        for i, r in enumerate(REGIONS):
            s = read(out, f"series/{code}/{r}.json")
            years, values = np.array(s["years"]), np.array(s["values"])
            for row in s["windows"]["rows"][::37]:
                d = dict(zip(contract.WINDOW_COLUMNS, row))
                got = mp["windows"][f"{d['start']}-{d['end']}"][i]
                if code == "air_temperature":
                    assert got == d["slope_decade"]  # exactamente el mismo número (contrato)
                else:
                    assert got == dict(zip(contract.WINDOW_COLUMNS_EXT, row))["slope_decade_pct"]
                    mean = values[(years >= d["start"]) & (years <= d["end"])].mean()
                    assert got == pytest.approx(d["slope_decade"] / mean * 100, abs=2e-3)
    assert read(out, "map/air_temperature.json")["unit"] == "°C/década"
    assert read(out, "map/precipitation.json")["unit"] == "%/década"


def test_percent_columns(built):
    """slope_decade_pct, ci_low_pct, ci_high_pct: % de la media de la ventana en precipitación; null en temperatura."""
    out, _ = built
    t2m = read(out, "series/air_temperature/US-RI.json")
    assert t2m["windows"]["columns"] == contract.WINDOW_COLUMNS_EXT
    assert all(r[-3:] == [None, None, None] for r in t2m["windows"]["rows"])
    assert all(r[-4] is not None for r in t2m["windows"]["rows"] if r[3] is not None)
    pr = read(out, "series/precipitation/US-RI.json")
    years, values = np.array(pr["years"]), np.array(pr["values"])
    mp = read(out, "map/precipitation.json")
    i = mp["regions"].index("US-RI")
    for row in pr["windows"]["rows"][::29]:
        d = dict(zip(contract.WINDOW_COLUMNS_EXT, row))
        mean = values[(years >= d["start"]) & (years <= d["end"])].mean()
        assert d["slope_decade_pct"] == pytest.approx(d["slope_decade"] / mean * 100, abs=2e-3)
        assert d["ci_low_pct"] == pytest.approx(d["ci_low"] / mean * 100, abs=2e-3)
        assert d["ci_high_pct"] == pytest.approx(d["ci_high"] / mean * 100, abs=2e-3)
        assert d["ci_low_pct"] <= d["slope_decade_pct"] <= d["ci_high_pct"]
        assert mp["windows"][f"{d['start']}-{d['end']}"][i] == pytest.approx(d["slope_decade_pct"], abs=1e-4)
    assert any("ci_high_pct" in t for t in pr["provenance"]["transformations"])


def test_known_linear_series_line_mid_and_pct():
    """y = a + b·t sin ruido: line_mid = a + b·c y pct = pendiente / media × 100."""
    a, b = 100.0, 2.5
    years = np.arange(1981, 2026)
    values = a + b * years
    ws = build.analyze_window(1990, 2009, years, values, False, relative_change=True)
    d = dict(zip(contract.WINDOW_COLUMNS_EXT, ws.row))
    c = (1990 + 2009) / 2
    assert d["slope_decade"] == pytest.approx(b * 10)
    assert d["line_mid"] == pytest.approx(a + b * c)
    mean = values[(years >= 1990) & (years <= 2009)].mean()
    assert d["slope_decade_pct"] == pytest.approx(b * 10 / mean * 100, abs=1e-4)
    assert d["ci_low_pct"] <= d["slope_decade_pct"] <= d["ci_high_pct"]
    t2m = dict(zip(contract.WINDOW_COLUMNS_EXT,
                   build.analyze_window(1990, 2009, years, values, False, relative_change=False).row))
    assert t2m["line_mid"] == pytest.approx(a + b * c)
    assert [t2m[k] for k in contract.PCT_COLUMNS] == [None, None, None]


def test_line_mid_excludes_missing_years():
    """Los años excluidos no cuentan: la recta se ajusta solo con los años completos de la ventana."""
    years = np.array([y for y in range(1981, 2001) if y != 1990])
    values = 10.0 + 0.1 * years
    d = dict(zip(contract.WINDOW_COLUMNS_EXT, build.analyze_window(1981, 2000, years, values, False).row))
    assert d["n"] == 19 and d["line_mid"] == pytest.approx(10.0 + 0.1 * 1990.5)


def test_insufficient_window_is_all_null():
    years = np.arange(2000, 2009)  # 9 años < 10
    d = dict(zip(contract.WINDOW_COLUMNS_EXT,
                 build.analyze_window(1999, 2008, years, 1.0 + years * 0.1, False, relative_change=True).row))
    assert d["status"] == "insufficient"
    assert all(d[k] is None for k in ["slope_decade", "ci_low", "ci_high", "p", "line_mid", *contract.PCT_COLUMNS])


def test_percent_is_null_when_mean_not_positive():
    assert build.pct_of_mean(1.0, (0.5, 1.5), 0.0) == [None, None, None]
    assert build.pct_of_mean(1.0, (0.5, 1.5), -2.0) == [None, None, None]
    assert build.pct_of_mean(1.0, (0.5, 1.5), 50.0) == [2.0, 1.0, 3.0]


def test_catalog(built):
    out, _ = built
    cat = read(out, "catalog.json")
    assert [r["id"] for r in cat["regions"]] == REGIONS
    assert cat["period"] == {"first_year": 1980, "last_complete_year": 2025, "min_window_years": 10}
    assert cat["regions"][0]["small_region"] is True and cat["regions"][1]["small_region"] is False
    v = {x["id"]: x for x in cat["variables"]}
    assert (v["air_temperature"]["first_year"], v["air_temperature"]["last_complete_year"]) == (1980, 2025)
    assert (v["precipitation"]["first_year"], v["precipitation"]["last_complete_year"]) == (2001, 2024)
    assert v["precipitation"]["relative_change"] is True and v["precipitation"]["kind"] == "observation"
    assert v["precipitation"]["unit_annual"] == "mm" and v["air_temperature"]["relative_change"] is False
    assert contract.validate_catalog(cat) == []


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
        run(out, ["air_temperature"], manifest_dir=tmp_path / "m")
    assert [p.name for p in out.iterdir()] == ["previo.json"]  # lo anterior queda intacto
    assert not list(tmp_path.glob(".trends-tmp-*"))


def test_read_failure_writes_nothing_and_lists_regions(tmp_path):
    out = tmp_path / "trends"
    with pytest.raises(ReadFailed) as exc:
        run(out, ["air_temperature"], source=FakeSource(fail=True), manifest_dir=tmp_path / "m")
    assert exc.value.affected_regions == ["US-RI"]
    assert not out.exists()
    assert (tmp_path / "m" / "2026-11-14.json").exists()  # el manifiesto se escribe aunque falle


def test_retrieved_at_is_per_region(tmp_path):
    src = FakeSource(times={"US-RI": "2026-11-14T23:59:59Z"})
    files = run(tmp_path / "trends", ["air_temperature"], source=src, manifest_dir=tmp_path / "m")
    assert files["series/air_temperature/US-RI.json"]["provenance"]["retrieved_at_utc"] == "2026-11-14T23:59:59Z"
    assert files["series/air_temperature/US-DC.json"]["provenance"]["retrieved_at_utc"] == "2026-11-14T17:00:00Z"


def test_complete_period_uses_only_full_years():
    months = [(y, m) for y in range(2000, 2026) for m in range(1, 13) if (2000, 6) <= (y, m) <= (2025, 9)]
    assert build.complete_period(months, 2000, 2025) == (2001, 2024)
    assert build.complete_period(months, 2000, 2010) == (2001, 2010)


def test_regional_monthly_weighted_mean_and_all_cells_rule():
    info = SourceInfo("s", "p", "sn", "v", None, "a", "T2M", "C", "g")
    grid = GridData(np.array([30.0, 30.0]), np.array([-115.0, -114.375]), [(2000, 1), (2000, 2)],
                    np.array([[10.0, 10.0], [20.0, np.nan]]), info)
    cw = CellWeights(np.array([30.0, 30.0]), np.array([-115.0, -114.375]), np.array([1.0, 0.5]), np.array([3.0, 1.0]))
    out = build.regional_monthly(grid, cw)
    assert out[0] == pytest.approx((3 * 10 + 1 * 20) / 4)
    assert np.isnan(out[1])


def test_power_is_never_chosen_automatically():
    """Constitución II: la fuente por omisión es GES DISC; POWER solo con --source power."""
    import inspect

    assert inspect.signature(build.main).parameters  # main existe
    src = Path(build.__file__).read_text(encoding="utf-8")
    assert 'default="gesdisc"' in src
    gs = build.default_sources("gesdisc")
    assert {type(s).__name__ for s in gs.values()} == {"GesDiscSource"}
    assert {type(s).__name__ for s in build.default_sources("power").values()} == {"PowerSource"}


def test_build_does_not_import_synthetic_data():
    tree = ast.parse(Path(build.__file__).read_text(encoding="utf-8"))
    mods = [n.module or "" for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)]
    mods += [a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names]
    assert not any("synthetic" in m for m in mods)
