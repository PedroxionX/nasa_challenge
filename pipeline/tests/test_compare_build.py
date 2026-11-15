"""compare_build.py (007): cifras contra un cálculo independiente, estados, contrato y variables inventadas.

Todo corre sin red ni credenciales, con una carpeta publicada de mentira hecha de variables que no existen
en el catálogo real: así se comprueba que la comparación no depende de ninguna variable concreta (SC-K01).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pymannkendall as pmk
import pytest
from scipy import stats

import compare_build as cb

ALPHA = 0.05
MIN_YEARS = 10
FIRST, LAST = 2000, 2024
# Variables inventadas a propósito: una con cambio absoluto y otra con cambio relativo.
ABSOLUTE, RELATIVE = "invented_level", "invented_amount"
REGIONS = ["AA-ONE", "AA-TWO", "BB-ONE", "BB-TWO", "CC-ONE"]


def _series_doc(region: str, variable: str, unit: str, years, values, **prov) -> dict:
    provenance = {"source": "Fuente inventada", "short_name": "INVENTED", "version": "1", "is_synthetic": True}
    provenance.update(prov)
    return {"schema_version": 1, "region": region, "variable": variable, "unit": unit,
            "years": [int(y) for y in years], "values": [float(v) for v in values], "provenance": provenance}


def _write(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc), encoding="utf-8")


def _values(rng: np.random.Generator, years: np.ndarray, level: float, slope: float, noise: float) -> np.ndarray:
    """Tendencia lineal más ruido con algo de memoria de un año a otro."""
    e = rng.normal(0, noise, len(years))
    for i in range(1, len(e)):
        e[i] += 0.4 * e[i - 1]
    return level + slope * (years - years[0]) + e


@pytest.fixture
def published(tmp_path: Path) -> Path:
    """Carpeta publicada mínima: catálogo y series de dos variables inventadas para cinco regiones."""
    rng = np.random.default_rng(7)
    years = np.arange(FIRST, LAST + 1)
    catalog = {
        "schema_version": 1, "alpha": ALPHA,
        "period": {"first_year": FIRST, "last_complete_year": LAST, "min_window_years": MIN_YEARS},
        "variables": [
            {"id": ABSOLUTE, "label": "Nivel inventado", "definition": "…", "unit_annual": "u",
             "relative_change": False, "first_year": FIRST, "last_complete_year": LAST},
            {"id": RELATIVE, "label": "Cantidad inventada", "definition": "…", "unit_annual": "q",
             "relative_change": True, "first_year": FIRST + 2, "last_complete_year": LAST - 1},
        ],
        "regions": [{"id": r, "name": r, "country": "MX", "n_cells": 5, "small_region": False} for r in REGIONS],
    }
    _write(tmp_path / "catalog.json", catalog)
    slopes = {"AA-ONE": 0.30, "AA-TWO": 0.28, "BB-ONE": -0.25, "BB-TWO": 0.0, "CC-ONE": 0.05}
    for i, region in enumerate(REGIONS):
        _write(tmp_path / "series" / ABSOLUTE / f"{region}.json",
               _series_doc(region, ABSOLUTE, "u", years, _values(rng, years, 10 + i, slopes[region], 0.4)))
        # Niveles muy distintos a propósito: la base relativa debe hacerlos comparables.
        level = 50.0 * 4 ** i
        _write(tmp_path / "series" / RELATIVE / f"{region}.json",
               _series_doc(region, RELATIVE, "q", years, _values(rng, years, level, slopes[region] * level / 20, level / 30)))
    return tmp_path


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _row(data: Path, variable: str, first: str, second: str, start: int) -> list:
    doc = _read(data / "compare" / variable / f"{first}.json")
    return doc["partners"][second][doc["starts"].index(start)]


def _independent(years: np.ndarray, diff: np.ndarray) -> tuple[float, float]:
    """Pendiente por década y p con piezas ajenas a nuestro motor: scipy para Sen, pymannkendall para S y Var(S).

    La corrección AR(1) se rehace aquí a mano: r1 de la serie sin tendencia y Var* = Var · (1 + r1)/(1 − r1) si r1 > 0.
    """
    slope = stats.theilslopes(diff, years)[0]
    ref = pmk.original_test(diff)
    resid = diff - slope * years
    y = resid - resid.mean()
    r1 = float(np.dot(y[:-1], y[1:]) / np.dot(y, y))
    var = ref.var_s * ((1 + r1) / (1 - r1) if 0 < r1 < 1 else 1.0)
    z = 0.0 if ref.s == 0 else (ref.s - np.sign(ref.s)) / np.sqrt(var)
    return slope * 10, float(2 * stats.norm.sf(abs(z)))


# ---------- Cifras ----------

@pytest.mark.parametrize("variable", [ABSOLUTE, RELATIVE])
def test_rows_match_an_independent_calculation(published: Path, variable: str):
    index = cb.build(published, log=lambda *_: None)
    info = index["variables"][variable]
    series = cb.load_variable_series(published, variable)
    relative = info["basis"] == "relative"
    checked = 0
    for first, second in [("AA-ONE", "BB-ONE"), ("AA-TWO", "CC-ONE"), ("BB-ONE", "BB-TWO")]:
        for start in (info["starts"][0], info["starts"][len(info["starts"]) // 2], info["starts"][-1]):
            n, diff_decade, low, high, p, status = _row(published, variable, first, second, start)
            years, diff = cb.difference_series(series[first], series[second], start, info["end"], relative)
            assert n == len(years) == info["end"] - start + 1
            slope, p_ref = _independent(years, diff)
            # Tolerancia: el archivo guarda 4 cifras significativas.
            assert diff_decade == pytest.approx(slope, rel=1e-3)
            assert p == pytest.approx(p_ref, rel=1e-3, abs=1e-12)
            assert low <= diff_decade <= high
            assert status == ("differ" if p_ref < ALPHA and slope != 0 else "inconclusive")
            checked += 1
    assert checked == 9


def test_difference_series_is_what_the_contract_says(published: Path):
    """Sin cambio relativo: A − B, y la pendiente por mínimos cuadrados de D es la resta de las dos pendientes.
    Con cambio relativo: cada serie en % de su media; la pendiente de D es la resta de las pendientes relativas."""
    def ols(y, x):
        return np.polyfit(x, y, 1)[0]

    a, b = (cb.load_variable_series(published, ABSOLUTE)[r] for r in ("AA-ONE", "BB-ONE"))
    years, diff = cb.difference_series(a, b, FIRST, LAST, relative=False)
    va, vb = (np.array([s.values[int(y)] for y in years]) for s in (a, b))
    np.testing.assert_allclose(diff, va - vb)
    assert ols(diff, years) == pytest.approx(ols(va, years) - ols(vb, years))

    a, b = (cb.load_variable_series(published, RELATIVE)[r] for r in ("AA-ONE", "CC-ONE"))
    years, diff = cb.difference_series(a, b, FIRST + 2, LAST - 1, relative=True)
    va, vb = (np.array([s.values[int(y)] for y in years]) for s in (a, b))
    np.testing.assert_allclose(diff, 100 * (va / va.mean() - vb / vb.mean()))
    assert ols(diff, years) == pytest.approx(100 * (ols(va, years) / va.mean() - ols(vb, years) / vb.mean()))


def test_relative_basis_does_not_let_the_larger_region_dominate(published: Path):
    """AA-ONE y AA-TWO tienen casi el mismo cambio relativo y niveles 4 veces distintos: en puntos porcentuales
    la diferencia es pequeña; restando las series tal cual, la región grande dominaría."""
    cb.build(published, [RELATIVE], log=lambda *_: None)
    _, diff_decade, *_ = _row(published, RELATIVE, "AA-ONE", "AA-TWO", FIRST + 2)
    series = cb.load_variable_series(published, RELATIVE)
    years, raw = cb.difference_series(series["AA-ONE"], series["AA-TWO"], FIRST + 2, LAST - 1, relative=False)
    raw_slope = stats.theilslopes(raw, years)[0] * 10
    assert abs(diff_decade) < 5          # puntos porcentuales por década
    assert abs(raw_slope) > 10           # unidades por década: solo refleja que una región es mayor


def test_clear_divergence_is_differ_and_similar_trends_are_inconclusive(published: Path):
    cb.build(published, [ABSOLUTE], log=lambda *_: None)
    assert _row(published, ABSOLUTE, "AA-ONE", "BB-ONE", FIRST)[-1] == "differ"       # +0.30 frente a −0.25
    assert _row(published, ABSOLUTE, "AA-ONE", "AA-TWO", FIRST)[-1] == "inconclusive"  # +0.30 frente a +0.28


# ---------- Estados ----------

def _pair(values_a, values_b, b_unit="u", b_product=("s", "p", "1"), b_synthetic=False):
    years = range(FIRST, FIRST + len(values_a))
    a = cb.RegionSeries("AA-ONE", "u", ("s", "p", "1"), False, dict(zip(years, map(float, values_a))))
    b = cb.RegionSeries("BB-ONE", b_unit, b_product, b_synthetic, dict(zip(years, map(float, values_b))))
    return a, b


def test_insufficient_when_few_common_years():
    a, b = _pair(np.arange(25.0), np.arange(25.0) ** 1.1)
    del_years = [y for y in list(b.values) if y % 2]  # B pierde los años impares
    for y in del_years:
        del b.values[y]
    row = cb.window_row(a, b, FIRST + 8, FIRST + 24, False, ALPHA, MIN_YEARS)
    assert row == [9, None, None, None, None, "insufficient"]


def test_invalid_when_the_difference_is_constant():
    x = np.random.default_rng(1).normal(size=20)
    a, b = _pair(x + 5, x)
    assert cb.window_row(a, b, FIRST, FIRST + 19, False, ALPHA, MIN_YEARS) == [20, None, None, None, None, "invalid"]


def test_invalid_when_a_relative_series_has_no_positive_mean():
    rng = np.random.default_rng(2)
    a, b = _pair(rng.normal(-3, 1, 20), rng.normal(8, 1, 20))
    assert cb.window_row(a, b, FIRST, FIRST + 19, True, ALPHA, MIN_YEARS)[-1] == "invalid"
    assert cb.window_row(a, b, FIRST, FIRST + 19, False, ALPHA, MIN_YEARS)[-1] in ("differ", "inconclusive")


@pytest.mark.parametrize("change, reason", [
    ({"b_unit": "otra"}, "different_unit"),
    ({"b_product": ("s", "p", "2")}, "different_product"),
    ({"b_synthetic": True}, "mixed_synthetic"),
    ({}, "identical_series"),
])
def test_not_comparable_reasons(change: dict, reason: str):
    x = np.random.default_rng(3).normal(size=15)
    a, b = _pair(x, x if not change else x + np.arange(15), **change)
    assert cb.not_comparable_reason(a, b) == reason


def test_comparable_pair_has_no_reason():
    rng = np.random.default_rng(4)
    assert cb.not_comparable_reason(*_pair(rng.normal(size=15), rng.normal(size=15))) is None


def test_not_comparable_pairs_are_published_with_their_reason(published: Path):
    doc = _read(published / "series" / ABSOLUTE / "CC-ONE.json")
    doc["provenance"]["version"] = "2"
    _write(published / "series" / ABSOLUTE / "CC-ONE.json", doc)
    cb.build(published, [ABSOLUTE], log=lambda *_: None)
    first = _read(published / "compare" / ABSOLUTE / "AA-ONE.json")
    assert first["not_comparable"] == {"CC-ONE": "different_product"}
    assert "CC-ONE" not in first["partners"]


# ---------- Contrato ----------

def test_each_pair_is_stored_once_in_the_file_of_the_first_region(published: Path):
    index = cb.build(published, log=lambda *_: None)
    for variable, info in index["variables"].items():
        folder = published / "compare" / variable
        assert sorted(p.stem for p in folder.glob("*.json")) == REGIONS[:-1]  # la última región no tiene archivo
        pairs = []
        for region in REGIONS[:-1]:
            doc = _read(folder / f"{region}.json")
            assert doc["starts"] == info["starts"] and doc["end"] == info["end"] and doc["unit"] == info["unit"]
            assert all(other > region for other in doc["partners"])
            pairs += [(region, other) for other in doc["partners"]]
        assert len(pairs) == len(set(pairs)) == info["n_pairs"] == 10


def test_index_describes_windows_basis_and_unit_from_the_catalog(published: Path):
    index = cb.build(published, log=lambda *_: None)
    assert list(index["variables"]) == [ABSOLUTE, RELATIVE]
    absolute, relative = index["variables"][ABSOLUTE], index["variables"][RELATIVE]
    assert (absolute["basis"], absolute["unit"]) == ("absolute", "u/década")
    assert (relative["basis"], relative["unit"]) == ("relative", "puntos porcentuales/década")
    assert absolute["end"] == LAST and absolute["starts"] == list(range(FIRST, LAST - MIN_YEARS + 2))
    assert relative["end"] == LAST - 1 and relative["starts"][0] == FIRST + 2  # el periodo propio de la variable
    assert index["alpha"] == ALPHA and index["method"]["series"] == "difference-common-years"


def test_validation_catches_a_broken_file(published: Path):
    catalog = _read(published / "catalog.json")
    series = cb.load_variable_series(published, ABSOLUTE)
    plan = cb.plan_for(catalog, catalog["variables"][0], series)
    docs = cb.build_variable(plan, series, published, jobs=1)
    assert cb.validate_variable(plan, docs, sorted(series)) == []
    docs["AA-ONE"]["partners"]["BB-ONE"][0][-1] = "bigger"
    docs["AA-TWO"]["partners"].pop("CC-ONE")
    problems = cb.validate_variable(plan, docs, sorted(series))
    assert any("estado desconocido" in p for p in problems) and any("pares" in p for p in problems)


def test_no_field_about_years_to_significance_is_published(published: Path):
    cb.build(published, log=lambda *_: None)
    for path in (published / "compare").rglob("*.json"):
        assert "detect" not in path.read_text(encoding="utf-8").lower()


def test_parallel_build_equals_serial(published: Path):
    catalog = _read(published / "catalog.json")
    series = cb.load_variable_series(published, RELATIVE)
    plan = cb.plan_for(catalog, catalog["variables"][1], series)
    assert cb.build_variable(plan, series, published, jobs=2) == cb.build_variable(plan, series, published, jobs=1)


# ---------- Cualquier variable ----------

def test_only_requested_variables_are_rebuilt(published: Path):
    cb.build(published, log=lambda *_: None)
    untouched = published / "compare" / ABSOLUTE / "AA-ONE.json"
    before = untouched.read_bytes()
    marker = published / "compare" / ABSOLUTE / "marker.txt"
    marker.write_text("sigue aquí")
    index = cb.build(published, [RELATIVE], log=lambda *_: None)
    assert untouched.read_bytes() == before and marker.exists()
    assert set(index["variables"]) == {ABSOLUTE, RELATIVE}


def test_unknown_variable_is_an_error_that_lists_the_catalog(published: Path):
    with pytest.raises(ValueError, match=ABSOLUTE):
        cb.build(published, ["no_existe"], log=lambda *_: None)


def test_a_new_catalog_variable_needs_no_code(published: Path):
    """Se añade una tercera variable al catálogo publicado y basta volver a ejecutar (SC-K01)."""
    cb.build(published, log=lambda *_: None)
    catalog = _read(published / "catalog.json")
    new = "another_invented_thing"
    catalog["variables"].append({"id": new, "label": "Otra", "definition": "…", "unit_annual": "z",
                                 "relative_change": True, "first_year": FIRST, "last_complete_year": LAST})
    _write(published / "catalog.json", catalog)
    rng = np.random.default_rng(11)
    years = np.arange(FIRST, LAST + 1)
    for region in REGIONS[:3]:  # solo tres regiones tienen serie
        _write(published / "series" / new / f"{region}.json",
               _series_doc(region, new, "z", years, _values(rng, years, 80, 0.5, 3)))
    assert cb.check(published) == ([], [new])
    index = cb.build(published, [new], log=lambda *_: None)
    assert index["variables"][new]["n_pairs"] == 3
    assert cb.check(published) == ([], [])


def test_check_detects_series_that_changed_after_the_build(published: Path, capsys):
    cb.build(published, log=lambda *_: None)
    assert cb.main(["--data", str(published), "--check"]) == 0
    path = published / "series" / RELATIVE / "BB-TWO.json"
    doc = _read(path)
    doc["values"][3] += 1
    _write(path, doc)
    assert cb.check(published) == ([RELATIVE], [])
    assert cb.main(["--data", str(published), "--check"]) == 1
    assert RELATIVE in capsys.readouterr().out


def test_the_code_names_no_variable_unit_or_product():
    """FR-K11: nada del catálogo real aparece en el código; todo se lee de los archivos."""
    source = Path(cb.__file__).read_text(encoding="utf-8")
    catalog_path = cb.DEFAULT_DATA_DIR / "catalog.json"
    if not catalog_path.exists():
        pytest.skip("no hay catálogo publicado en este árbol")
    for variable in _read(catalog_path)["variables"]:
        for word in (variable["id"], variable.get("product_short_name"), variable["label"]):
            if word:
                assert word not in source, f"compare_build.py nombra «{word}»"
