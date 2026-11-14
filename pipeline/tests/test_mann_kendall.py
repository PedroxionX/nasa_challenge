"""Validación cruzada de nuestra implementación contra `pymannkendall` (referencia independiente)
y calibración Monte Carlo de las tasas de falsos positivos."""

import numpy as np
import pandas as pd
import pymannkendall as pmk
import pytest

from trendlens.stats.experiments import rejection_rates
from trendlens.stats.mann_kendall import hamed_rao, mann_kendall, seasonal_mann_kendall, sen_slope_pairs


def _series(seed, n=45, ties=False):
    rng = np.random.default_rng(seed)
    x = 0.02 * np.arange(n) + rng.normal(size=n)
    return np.round(x, 1) if ties else x


@pytest.mark.parametrize("seed,ties", [(0, False), (1, False), (2, True), (3, True), (4, False)])
def test_original_mk_matches_pymannkendall(seed, ties):
    x = _series(seed, ties=ties)
    ours, ref = mann_kendall(x), pmk.original_test(x)
    assert ours.s == pytest.approx(ref.s)
    assert ours.var_s == pytest.approx(ref.var_s, rel=1e-12)
    assert ours.z == pytest.approx(ref.z, rel=1e-12)
    assert ours.p_value == pytest.approx(ref.p, rel=1e-10)
    assert ours.tau == pytest.approx(ref.Tau, rel=1e-12)
    # serie regular (sin huecos): pendiente por índice = pendiente por año
    assert np.median(sen_slope_pairs(np.arange(len(x)), x)) == pytest.approx(ref.slope, rel=1e-12)


@pytest.mark.parametrize("seed", [10, 11, 12, 13])
def test_hamed_rao_matches_pymannkendall(seed):
    rng = np.random.default_rng(seed)
    e = np.zeros(45)
    for i in range(1, 45):
        e[i] = 0.6 * e[i - 1] + rng.normal()
    x = 0.01 * np.arange(45) + e
    ours = hamed_rao(x, alpha=0.05, max_lag=3)
    ref = pmk.hamed_rao_modification_test(x, alpha=0.05, lag=3)
    assert ours.var_s == pytest.approx(ref.var_s, rel=1e-9)
    assert ours.z == pytest.approx(ref.z, rel=1e-9)
    assert ours.p_value == pytest.approx(ref.p, rel=1e-8)


@pytest.mark.parametrize("seed", [20, 21])
def test_seasonal_mk_matches_pymannkendall(seed):
    rng = np.random.default_rng(seed)
    years, months = 30, 12
    x = (np.cos(2 * np.pi * np.arange(years * months) / 12) * 5
         + 0.002 * np.arange(years * months) + rng.normal(size=years * months))
    mat = pd.DataFrame(x.reshape(years, months), index=range(1990, 1990 + years), columns=range(1, 13))
    ours = seasonal_mann_kendall(mat)
    ref = pmk.seasonal_test(x, period=12)
    assert ours.s == pytest.approx(ref.s)
    assert ours.var_s == pytest.approx(ref.var_s, rel=1e-12)
    assert ours.z == pytest.approx(ref.z, rel=1e-12)
    assert ours.p_value == pytest.approx(ref.p, rel=1e-10)
    assert ours.slope_per_year == pytest.approx(ref.slope, rel=1e-10)


def test_pymannkendall_slope_ignores_gaps_but_ours_does_not():
    """Lección documentada: con años faltantes, una pendiente por índice está sesgada."""
    years = np.array([1990, 1991, 1992, 1993, 2005, 2006, 2007, 2008], dtype=float)
    y = 0.1 * years
    assert pmk.original_test(y).slope == pytest.approx(np.median(sen_slope_pairs(np.arange(8.0), y)))
    assert np.median(sen_slope_pairs(years, y)) == pytest.approx(0.1)


def test_false_positive_rate_is_calibrated_under_independence():
    """Sin tendencia y sin autocorrelación, cada prueba debe rechazar ≈ α (5 %)."""
    df = rejection_rates(phi=0.0, n_years=45, n_sims=400).set_index("prueba")["tasa_rechazo"]
    for name, rate in df.items():
        assert 0.015 <= rate <= 0.10, (name, rate)


def test_autocorrelation_inflates_naive_tests_and_correction_helps():
    df = rejection_rates(phi=0.6, n_years=45, n_sims=300).set_index("prueba")["tasa_rechazo"]
    assert df["Mann-Kendall original"] > 0.15  # el problema existe
    assert df["Mann-Kendall corrección AR(1) (principal)"] < df["Mann-Kendall original"] / 2
    assert df["MCO ajustado (Santer)"] < df["MCO (supone independencia)"] / 2
