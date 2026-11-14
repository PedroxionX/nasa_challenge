"""Análisis de extremo a extremo con datos sintéticos y casos límite."""

import numpy as np
import pytest

from helpers import annual_to_monthly, monthly_bundle
from trendlens.config import VARIABLES
from trendlens.data.synthetic import SCENARIOS, generate_monthly
from trendlens.stats.engine import analyze_bundle, start_year_sensitivity


@pytest.mark.parametrize("code", ["T2M", "PRECTOTCORR"])
def test_increasing_series_gives_positive_slope(code):
    r = analyze_bundle(generate_monthly(SCENARIOS["creciente"], VARIABLES[code]), 1981, 2025)
    assert r.slope_per_decade > 0
    assert r.verdict == "increasing"


@pytest.mark.parametrize("code", ["T2M", "PRECTOTCORR"])
def test_decreasing_series_gives_negative_slope(code):
    r = analyze_bundle(generate_monthly(SCENARIOS["decreciente"], VARIABLES[code]), 1981, 2025)
    assert r.slope_per_decade < 0
    assert r.verdict == "decreasing"


def test_exact_linear_annual_series_recovers_slope():
    r = analyze_bundle(annual_to_monthly(15 + 0.03 * np.arange(45), seasonal_amp=6.0), 1981, 2025)
    assert r.core.sen_slope == pytest.approx(0.03, abs=1e-3)
    assert r.core.ols.slope == pytest.approx(0.03, abs=1e-3)


def test_constant_series_does_not_crash():
    r = analyze_bundle(monthly_bundle(np.full(12 * 20, 12.5), start="2000-01-01"), 2000, 2019)
    assert r.slope_per_decade == 0
    assert r.verdict == "inconclusive"
    assert any(w.code == "constant" for w in r.warnings)


def test_result_includes_provenance_and_period():
    r = analyze_bundle(generate_monthly(SCENARIOS["creciente"], VARIABLES["T2M"]), 1990, 2020)
    assert r.period == (1990, 2020)
    assert r.analyzed_span == (1990, 2020)
    assert r.provenance.is_synthetic and r.provenance.seed == SCENARIOS["creciente"].seed
    assert r.provenance.retrieved_at_utc
    assert r.processing.n_months_expected == 31 * 12


def test_missing_data_handled_explicitly():
    r = analyze_bundle(generate_monthly(SCENARIOS["faltantes"], VARIABLES["T2M"]), 1981, 2025)
    excluded = set(r.processing.incomplete_years)
    assert excluded, "el escenario debe tener años incompletos"
    assert excluded.isdisjoint(set(r.core.years.astype(int)))
    assert r.n == 45 - len(excluded)
    codes = {w.code for w in r.warnings}
    assert {"incomplete_years", "annual_gaps"} <= codes


def test_insufficient_years_gives_no_verdict():
    r = analyze_bundle(generate_monthly(SCENARIOS["creciente"], VARIABLES["T2M"]), 2018, 2025)
    assert r.n == 8 and r.verdict == "insufficient"
    assert any(w.level == "critical" for w in r.warnings)


@pytest.mark.parametrize("code", ["T2M", "PRECTOTCORR"])
def test_pure_seasonal_series_is_not_a_trend(code):
    """Ciclo estacional perfecto sin tendencia ni ruido: no debe aparecer una tendencia."""
    months = np.tile(np.arange(1, 13), 40)
    base = 20 if code == "T2M" else 3.0
    amp = 10 if code == "T2M" else 2.0
    vals = np.round(base + amp * np.cos(2 * np.pi * (months - 7) / 12), 2)
    r = analyze_bundle(monthly_bundle(vals, start="1981-01-01", code=code), 1981, 2020)
    assert abs(r.slope_per_decade) < 1e-6
    assert r.verdict == "inconclusive"
    assert r.seasonal is not None and r.seasonal.p_value > 0.05


def test_partial_years_would_bias_naive_monthly_regression_but_not_pipeline():
    """Empezar en julio y terminar en junio sesga una regresión mensual ingenua; el pipeline lo evita."""
    ts_months = np.arange(7, 7 + 12 * 30) % 12 + 1  # jul 1981 … jun 2011
    vals = 20 + 10 * np.cos(2 * np.pi * (ts_months - 1) / 12)  # pico en enero
    b = monthly_bundle(np.round(vals, 3), start="1981-07-01")
    r = analyze_bundle(b, 1981, 2011)
    assert {1981, 2011} <= set(r.processing.incomplete_years)
    assert abs(r.slope_per_decade) < 1e-6
    # contraste: MCO ingenuo con índice mensual sobre valores crudos SÍ da pendiente ≠ 0 al recortar
    naive = np.polyfit(np.arange(len(vals) - 3), vals[:-3], 1)[0]
    assert abs(naive) > 1e-4


def test_autocorrelated_and_step_scenarios_raise_warnings():
    ra = analyze_bundle(generate_monthly(SCENARIOS["autocorrelada"], VARIABLES["T2M"]), 1981, 2025)
    assert any(w.code == "autocorrelation" for w in ra.warnings)
    assert ra.core.primary.p_value > ra.core.mk.p_value  # la corrección es más conservadora
    rs = analyze_bundle(generate_monthly(SCENARIOS["escalon"], VARIABLES["T2M"]), 1981, 2025)
    assert any(w.code == "change_point" for w in rs.warnings)


def test_sensitivity_table():
    r = analyze_bundle(generate_monthly(SCENARIOS["creciente"], VARIABLES["T2M"]), 1981, 2025)
    s = start_year_sensitivity(r)
    assert s["start_year"].min() == 1981 and (2025 - s["start_year"].max() + 1) >= 15
    assert (s["ci_low"] <= s["slope_decade"]).all() and (s["slope_decade"] <= s["ci_high"]).all()


def test_synthetic_generation_is_deterministic_and_flagged():
    for key, sc in SCENARIOS.items():
        a = generate_monthly(sc, VARIABLES["T2M"]).data
        b = generate_monthly(sc, VARIABLES["T2M"]).data
        assert a["value"].equals(b["value"]), key
        assert a["is_synthetic"].all()
    b = generate_monthly(SCENARIOS["creciente"], VARIABLES["T2M"])
    assert np.isnan(b.location.lat)  # un sitio sintético nunca tiene coordenadas reales
    assert any("SINTÉTICOS" in n for n in b.provenance.notes)
    required = {"creciente", "decreciente", "sin_tendencia", "estacional", "faltantes", "opuesta_pos",
                "opuesta_neg", "autocorrelada"}
    assert required <= set(SCENARIOS)
