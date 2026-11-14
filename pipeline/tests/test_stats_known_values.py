"""Motor estadístico contra valores conocidos (calculables a mano) y contra SciPy."""

import numpy as np
import pytest
from scipy import stats

from trendlens.stats.diagnostics import detectability_years, effective_sample_size, step_vs_linear
from trendlens.stats.mann_kendall import mann_kendall, mk_ar1_corrected, sen_slope_ci, sen_slope_pairs, variance_s
from trendlens.stats.ols import confidence_band, ols_trend


# ---------- MCO -------------------------------------------------------------------------
def test_ols_exact_line():
    t = np.arange(1990, 2000, dtype=float)
    r = ols_trend(t, 2 * t + 1)
    assert r.slope == pytest.approx(2.0)
    assert r.intercept == pytest.approx(1.0)
    assert r.r_squared == pytest.approx(1.0)


def test_ols_matches_closed_form_and_t_interval():
    t = np.array([1, 2, 3, 4, 5, 6], dtype=float)
    y = np.array([2.1, 3.9, 6.2, 7.8, 10.1, 12.2])
    r = ols_trend(t, y)
    sxx = np.sum((t - t.mean()) ** 2)  # 17.5
    b = np.sum((t - t.mean()) * (y - y.mean())) / sxx
    resid = y - (y.mean() - b * t.mean() + b * t)
    se = np.sqrt(np.sum(resid**2) / 4 / sxx)
    assert r.slope == pytest.approx(b, rel=1e-12)
    assert r.stderr == pytest.approx(se, rel=1e-10)
    tc = stats.t.ppf(0.975, 4)
    assert r.ci_low == pytest.approx(b - tc * se)
    assert r.ci_high == pytest.approx(b + tc * se)


def test_ols_constant_series_does_not_crash():
    t = np.arange(2000, 2020, dtype=float)
    r = ols_trend(t, np.full(20, 15.0))
    assert r.constant_series and r.slope == 0.0
    assert np.isnan(r.p_value)  # no se inventa un valor p


def test_ols_rejects_nan_explicitly():
    with pytest.raises(ValueError):
        ols_trend(np.arange(5.0), np.array([1, 2, np.nan, 4, 5.0]))


def test_santer_adjustment_widens_interval_with_positive_autocorrelation():
    rng = np.random.default_rng(3)
    t = np.arange(40, dtype=float)
    e = np.zeros(40)
    for i in range(1, 40):
        e[i] = 0.8 * e[i - 1] + rng.normal()
    r = ols_trend(t, 0.02 * t + e)
    assert r.r1_residuals > 0
    assert r.n_eff < r.n
    assert r.adj_stderr > r.stderr
    assert r.adj_p_value > r.p_value


def test_effective_sample_size_formula():
    assert effective_sample_size(45, 0.5) == pytest.approx(45 * 0.5 / 1.5)
    assert effective_sample_size(45, -0.3) == 45  # no se infla n con r1 negativo


def test_confidence_band_contains_fit():
    t = np.arange(30, dtype=float)
    y = 0.1 * t + np.random.default_rng(1).normal(size=30)
    r = ols_trend(t, y)
    lo, hi = confidence_band(r, t)
    fit = r.intercept + r.slope * t
    assert np.all(lo < fit) and np.all(fit < hi)
    # la banda es más estrecha en el centro
    w = hi - lo
    assert w[15] < w[0] and w[15] < w[-1]


# ---------- Mann-Kendall: valores a mano --------------------------------------------------
def test_mk_hand_computed_increasing():
    r = mann_kendall(np.array([1, 2, 3, 4, 5.0]))
    assert r.s == 10
    assert r.var_s == pytest.approx(5 * 4 * 15 / 18)  # 16.667
    assert r.z == pytest.approx(9 / np.sqrt(50 / 3))  # 2.2045
    assert r.p_value == pytest.approx(0.027486, abs=1e-5)
    assert r.tau == pytest.approx(1.0)
    assert "n < 10" in r.note


def test_mk_hand_computed_with_ties():
    x = np.array([1, 1, 2, 2, 3.0])
    r = mann_kendall(x)
    # pares (i<j): sgn > 0 en 8 pares, 0 en 2 pares (empates) ⇒ S = 8
    assert r.s == 8
    # Var = [5·4·15 − 2·(2·1·9)]/18 = (300 − 36)/18
    assert variance_s(x) == pytest.approx(264 / 18)
    assert r.z == pytest.approx(7 / np.sqrt(264 / 18))


def test_mk_decreasing_and_constant():
    assert mann_kendall(np.arange(20.0)[::-1]).direction == "decreasing"
    c = mann_kendall(np.full(15, 3.3))
    assert c.s == 0 and c.p_value == 1.0 and c.direction == "no_trend"


def test_mk_rejects_nan():
    with pytest.raises(ValueError):
        mann_kendall(np.array([1, np.nan, 3.0]))


def test_ar1_correction_reduces_to_original_without_autocorrelation():
    x = np.array([3, 1, 4, 1.5, 5, 9, 2, 6, 5.5, 3.5, 5.8, 9.7, 7.9])
    o, c = mann_kendall(x), mk_ar1_corrected(x)
    if c.correction_factor == 1.0:
        assert c.p_value == pytest.approx(o.p_value)
    else:
        assert c.p_value >= o.p_value  # nunca más optimista que el original


# ---------- Theil-Sen ---------------------------------------------------------------------
@pytest.mark.parametrize("seed", [0, 1, 2, 3])
def test_sen_slope_and_ci_match_scipy(seed):
    rng = np.random.default_rng(seed)
    t = np.arange(1981, 2026, dtype=float)
    y = 0.03 * t + rng.normal(size=len(t))
    slopes = sen_slope_pairs(t, y)
    ref = stats.theilslopes(y, t, alpha=0.95)
    assert np.median(slopes) == pytest.approx(ref.slope, rel=1e-12)
    lo, hi = sen_slope_ci(slopes, mann_kendall(y).var_s, alpha=0.05)
    assert lo == pytest.approx(ref.low_slope, rel=1e-12)
    assert hi == pytest.approx(ref.high_slope, rel=1e-12)


def test_sen_uses_real_time_not_indices():
    """Con un hueco de años, la pendiente debe calcularse con los años reales."""
    t = np.array([2000, 2001, 2002, 2010, 2011, 2012], dtype=float)
    y = 0.5 * t
    assert np.median(sen_slope_pairs(t, y)) == pytest.approx(0.5)
    idx = np.arange(len(t), dtype=float)
    assert np.median(sen_slope_pairs(idx, y)) != pytest.approx(0.5)  # el error que evitamos


# ---------- Diagnósticos ------------------------------------------------------------------
def test_detectability_formula_and_edge_cases():
    n = detectability_years(residual_sd=0.4, trend_per_year=0.02, phi=0.0)
    assert n == pytest.approx((3.3 * np.sqrt(12) * 0.4 / 0.02) ** (2 / 3))
    assert detectability_years(0.4, 0.02, 0.5) > n  # la autocorrelación exige más años
    assert detectability_years(0.4, 0.0, 0.0) == float("inf")


def test_step_check_distinguishes_step_from_ramp():
    t = np.arange(1981, 2026, dtype=float)
    rng = np.random.default_rng(5)
    noise = rng.normal(0, 0.2, len(t))
    step = step_vs_linear(t, np.where(t >= 2003, 1.0, 0.0) + noise)
    ramp = step_vs_linear(t, 0.03 * (t - t.mean()) + noise)
    assert step.favors_step and step.change_year in (2002, 2003, 2004)
    assert not ramp.favors_step
