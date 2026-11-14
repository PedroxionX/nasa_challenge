"""Validador del contrato (FR-D05, T004): lo que debe rechazar."""

import copy
import math

import pytest

import contract

ROW = [1981, 2025, 45, 0.46, 0.307, 0.59, 0.000016, 0.000003, 0.08, 0.423, 0.000001, "increasing", []]


def series_doc(rows=None):
    return {
        "schema_version": 1, "region": "MX-BCN", "variable": "T2M", "unit": "°C",
        "years": [1981, 1982], "values": [20.1, 20.3], "excluded_years": [], "partial_year": None,
        "provenance": {f: "x" for f in contract.PROVENANCE_FIELDS} | {"transformations": [], "is_synthetic": False,
                                                                       "n_cells": 3},
        "diagnostics": {"step_year": None, "autocorr_significant": False},
        "windows": {"columns": list(contract.WINDOW_COLUMNS), "rows": rows if rows is not None else [list(ROW)]},
    }


def with_row(**changes):
    row = dict(zip(contract.WINDOW_COLUMNS, ROW)) | changes
    return series_doc([[row[c] for c in contract.WINDOW_COLUMNS]])


def test_valid_document_passes():
    assert contract.validate_series(series_doc()) == []


def test_rejects_unknown_status():
    assert any("status" in p for p in contract.validate_series(with_row(status="maybe")))


def test_rejects_ci_low_above_slope():
    assert any("ci_low" in p for p in contract.validate_series(with_row(ci_low=0.5, slope_decade=0.4)))


def test_rejects_slope_above_ci_high():
    assert any("ci_high" in p for p in contract.validate_series(with_row(slope_decade=0.7)))


def test_rejects_window_shorter_than_ten_years():
    assert any("menos de 10" in p for p in contract.validate_series(with_row(start=2020, end=2025)))


def test_rejects_n_below_ten_unless_insufficient():
    assert any("insufficient" in p for p in contract.validate_series(with_row(n=8)))
    ok = with_row(n=8, status="insufficient", slope_decade=None, ci_low=None, ci_high=None, p=None)
    assert contract.validate_series(ok) == []


def test_rejects_nan_instead_of_null():
    assert any("NaN" in p for p in contract.validate_series(with_row(r1=math.nan)))


def test_rejects_missing_provenance():
    doc = series_doc()
    del doc["provenance"]
    assert any("provenance" in p for p in contract.validate_series(doc))
    doc = series_doc()
    del doc["provenance"]["is_synthetic"]
    assert any("is_synthetic" in p for p in contract.validate_series(doc))


def test_rejects_years_to_detect_field():
    doc = series_doc()
    doc["diagnostics"]["detectability_years"] = 14.2
    assert any("prohibido" in p for p in contract.validate_series(doc))


def test_rejects_direction_contradicting_slope():
    assert any("increasing" in p for p in contract.validate_series(with_row(slope_decade=-0.1, ci_low=-0.2)))


def test_rejects_p_out_of_range_and_bad_flags():
    assert any("p debe" in p for p in contract.validate_series(with_row(p=1.5)))
    assert any("flags" in p for p in contract.validate_series(with_row(flags=["raro"])))


def test_requires_exactly_all_windows():
    rows = [[s, e, e - s + 1, None, None, None, None, None, None, None, None, "insufficient", []]
            for s, e in contract.window_keys(2000, 2012)]
    assert len(rows) == 10  # 4 + 3 + 2 + 1
    assert contract.validate_series(series_doc(rows), 2000, 2012) == []
    assert any("exactamente" in p for p in contract.validate_series(series_doc(rows[:-1]), 2000, 2012))


def test_window_count_for_mvp_period():
    assert len(contract.window_keys(1981, 2025)) == 666


def test_map_requires_one_value_per_region_and_matching_keys():
    good = {"schema_version": 1, "variable": "T2M", "unit": "°C/década", "regions": ["MX-BCN"],
            "windows": {"1981-2025": [0.4]}, "classes": {"breaks": [0], "labels": ["a", "b"]}}
    assert contract.validate_map(good, {"MX-BCN": series_doc()}) == []
    bad = copy.deepcopy(good)
    bad["windows"]["1981-2025"] = [0.4, 0.1]
    assert contract.validate_map(bad)
    other = copy.deepcopy(good)
    other["windows"] = {"1990-2025": [0.4]}
    assert any("no coinciden" in p for p in contract.validate_map(other, {"MX-BCN": series_doc()}))


def pct_doc(pct, line_mid=20.5):
    doc = series_doc([list(ROW) + [line_mid] + list(pct)])
    doc["windows"]["columns"] = list(contract.WINDOW_COLUMNS_EXT)
    return doc


def test_percent_columns_are_optional_and_checked():
    assert contract.validate_series(pct_doc([10.2, 6.8, 12.9])) == []
    assert contract.validate_series(pct_doc([None, None, None])) == []
    assert any("ci_low_pct" in p for p in contract.validate_series(pct_doc([5.0, 6.8, 12.9])))
    assert any("todas" in p for p in contract.validate_series(pct_doc([10.2, None, 12.9])))
    assert any("número o null" in p for p in contract.validate_series(pct_doc(["10%", 6.8, 12.9])))
    assert any("NaN" in p for p in contract.validate_series(pct_doc([math.nan, 6.8, 12.9])))


def test_line_mid_null_exactly_when_slope_null():
    assert any("line_mid" in p for p in contract.validate_series(pct_doc([None, None, None], line_mid=None)))
    doc = pct_doc([None, None, None], line_mid=20.5)
    row = doc["windows"]["rows"][0]
    row[3:6] = [None, None, None]
    row[11] = "inconclusive"
    assert any("line_mid" in p for p in contract.validate_series(doc))


def test_pct_sign_must_match_slope():
    assert any("signo" in p for p in contract.validate_series(pct_doc([-1.0, -2.0, 1.0])))


def test_unknown_extra_columns_are_rejected():
    doc = series_doc([list(ROW) + [1]])
    doc["windows"]["columns"] = list(contract.WINDOW_COLUMNS) + ["otra"]
    assert any("columnas" in p for p in contract.validate_series(doc))


def test_assert_valid_raises():
    with pytest.raises(contract.ContractError):
        contract.assert_valid("x", ["problema"])
