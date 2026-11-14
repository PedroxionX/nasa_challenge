"""Procesamiento: orden, duplicados, faltantes, unidades, años completos y anomalías."""

import numpy as np
import pandas as pd
import pytest

from helpers import monthly_bundle
from trendlens.config import PRESETS_BY_ID, VARIABLES
from trendlens.data.nasa_power import parse_power_monthly
from trendlens.processing import DataQualityError, anomalies, choose_reference_period, clean_monthly, to_annual
from trendlens.schema import SchemaError


def test_precip_rate_to_totals_uses_real_days_including_leap_years():
    b = monthly_bundle(np.ones(24), start="2020-01-01", code="PRECTOTCORR")  # 1 mm/día constante
    m, rep = clean_monthly(b)
    feb = m[m["month"] == 2].set_index("year")["value_monthly"]
    assert feb[2020] == 29 and feb[2021] == 28  # 2020 bisiesto
    a = to_annual(m, VARIABLES["PRECTOTCORR"]).set_index("year")["value"]
    assert a[2020] == 366 and a[2021] == 365
    assert "días" in rep.conversion_note


def test_temperature_annual_mean_is_day_weighted():
    vals = np.zeros(12)
    vals[1] = 28.0  # febrero = 28 °C, resto 0, año no bisiesto
    a = to_annual(clean_monthly(monthly_bundle(vals, start="2021-01-01"))[0], VARIABLES["T2M"])
    assert a["value"].iloc[0] == pytest.approx(28 * 28 / 365)  # no 28/12
    assert a["value"].iloc[0] != pytest.approx(28 / 12)


def test_unsorted_input_is_sorted():
    ts = pd.date_range("2000-01-01", periods=24, freq="MS")[::-1]
    b = monthly_bundle(np.arange(24.0), timestamps=ts)
    m, _ = clean_monthly(b)
    assert m["timestamp"].is_monotonic_increasing
    assert m["value_native"].iloc[0] == 23.0


def test_identical_duplicates_dropped_conflicting_raise():
    ts = list(pd.date_range("2000-01-01", periods=12, freq="MS"))
    b = monthly_bundle(list(range(12)) + [5.0], timestamps=ts + [ts[5]])
    m, rep = clean_monthly(b)
    assert rep.n_exact_duplicates_dropped == 1 and len(m) == 12
    with pytest.raises(DataQualityError):
        clean_monthly(monthly_bundle(list(range(12)) + [99.0], timestamps=ts + [ts[5]]))


def test_fill_values_become_missing_and_years_excluded():
    vals = np.full(36, 20.0)
    vals[14] = -999.0  # 2001-03
    vals[30] = np.nan  # 2002-07
    m, rep = clean_monthly(monthly_bundle(vals, start="2000-01-01"))
    assert rep.n_fill_values_converted == 1
    assert rep.missing_months == ["2001-03", "2002-07"]
    assert rep.incomplete_years == {2001: 11, 2002: 11}
    a = to_annual(m, VARIABLES["T2M"])
    assert a["year"].tolist() == [2000]  # nada se rellena ni se interpola


def test_missing_calendar_months_are_made_explicit():
    ts = [t for t in pd.date_range("2000-01-01", periods=24, freq="MS") if t.month != 6]
    m, rep = clean_monthly(monthly_bundle(np.ones(len(ts)), timestamps=ts))
    assert len(m) == 24 and rep.missing_months == ["2000-06", "2001-06"]


def test_unit_mismatch_is_rejected():
    with pytest.raises(DataQualityError):
        clean_monthly(monthly_bundle(np.ones(12) * 290, unit="K"))


def test_out_of_range_values_flagged():
    vals = np.full(12, 10.0)
    vals[3] = 500.0
    m, rep = clean_monthly(monthly_bundle(vals))
    assert rep.n_out_of_range == 1 and np.isnan(m["value_native"].iloc[3])


def test_period_filter_and_empty_period():
    b = monthly_bundle(np.ones(48), start="2000-01-01")
    m, _ = clean_monthly(b, 2001, 2002)
    assert m["year"].min() == 2001 and m["year"].max() == 2002
    with pytest.raises(DataQualityError):
        clean_monthly(b, 2010, 2012)


def test_schema_rejects_mixed_synthetic_and_real():
    b = monthly_bundle(np.ones(12))
    df = b.data.copy()
    df.loc[3, "is_synthetic"] = False
    from trendlens.schema import validate_normalized
    with pytest.raises(SchemaError):
        validate_normalized(df)


def test_anomalies_do_not_change_slope_and_need_reference_years():
    annual = pd.DataFrame({"year": np.arange(1981, 2026), "value": 0.03 * np.arange(45) + 15})
    an, info = anomalies(annual, (1991, 2020))
    assert info.available and info.n_reference_years == 30
    assert np.polyfit(annual["year"], an, 1)[0] == pytest.approx(np.polyfit(annual["year"], annual["value"], 1)[0])
    short = annual[annual["year"] >= 2015]
    an2, info2 = anomalies(short, (1991, 2020))
    assert an2 is None and not info2.available and "mínimo" in info2.reason
    assert choose_reference_period(list(range(2000, 2026))) == (2000, 2025)


def test_our_annual_aggregation_matches_power_annual_values(load_fixture):
    """Verificación contra la fuente: el 'mes 13' de POWER coincide con nuestro promedio ponderado por días."""
    payload = load_fixture("power_mexicali_1981_2025.json")
    for code in ("T2M", "PRECTOTCORR"):
        b = parse_power_monthly(payload, VARIABLES[code], PRESETS_BY_ID["mexicali"], request_url="fixture",
                                retrieved_at_utc="2026-11-06T00:00:00+00:00")
        m, _ = clean_monthly(b, 1981, 2025)
        a = to_annual(m, VARIABLES[code])
        src = b.provenance.source_annual_values
        for y, v, d in zip(a["year"], a["value"], a["days"]):
            ours = v if code == "T2M" else v / d  # POWER publica la tasa media anual en mm/día
            assert ours == pytest.approx(src[y], abs=0.006), (code, y)  # redondeo de POWER a 2 decimales


def test_prectotcorr_sum_label_inconsistency_is_documented(load_fixture):
    """PRECTOTCORR_SUM declara 'mm/day' pero contiene acumulados mensuales: no confiar en la etiqueta."""
    p = load_fixture("power_sum_check_2020.json")
    assert p["parameters"]["PRECTOTCORR_SUM"]["units"] == "mm/day"
    rate, total = p["properties"]["parameter"]["PRECTOTCORR"], p["properties"]["parameter"]["PRECTOTCORR_SUM"]
    for key, r in rate.items():
        if key.endswith("13"):
            continue
        days = pd.Timestamp(f"{key[:4]}-{key[4:]}-01").days_in_month
        assert total[key] == pytest.approx(r * days, abs=0.005 * days + 0.01)
