"""Opposite Trends Explorer y explicaciones: nada se afirma sin sustento estadístico."""

import re

import numpy as np
import pytest

from helpers import annual_to_monthly, monthly_bundle
from trendlens.config import PRESETS_BY_ID, VARIABLES, Location
from trendlens.data.nasa_power import parse_power_monthly
from trendlens.data.synthetic import SCENARIOS, generate_monthly
from trendlens.explain import explain_comparison, explain_trend
from trendlens.stats.compare import compare_results
from trendlens.stats.engine import analyze_bundle


def _syn(key, slot, code="T2M", y0=1981, y1=2025):
    return analyze_bundle(generate_monthly(SCENARIOS[key], VARIABLES[code], slot), y0, y1)


@pytest.mark.parametrize("code", ["T2M", "PRECTOTCORR"])
def test_opposite_pair_detected_with_formal_difference_test(code):
    c = compare_results(_syn("opuesta_pos", "A", code), _syn("opuesta_neg", "B", code))
    assert c.pattern == "opuestas_con_evidencia"
    assert c.differ_significantly is True
    assert c.diff.primary.p_value < 0.05


def test_opposite_signs_without_evidence_is_only_descriptive():
    ra, rb = _syn("sin_tendencia", "A"), _syn("estacional", "B")
    assert np.sign(ra.slope_per_decade) != np.sign(rb.slope_per_decade)
    c = compare_results(ra, rb)
    assert c.pattern == "opuestas_descriptivo"
    text = " ".join(explain_comparison(c, ra, rb))
    assert "solo descriptiva" in text
    if not c.differ_significantly:
        assert "no hay evidencia suficiente de que las pendientes difieran" in text


def test_never_claims_difference_without_support():
    """Para muchos pares sin tendencia: 'difieren' ⇔ p(diferencia) < α; 'con evidencia' ⇔ ambas significativas."""
    rng = np.random.default_rng(123)
    for _ in range(25):
        a = annual_to_monthly(15 + rng.normal(0, 0.4, 40))
        b = annual_to_monthly(15 + rng.normal(0, 0.4, 40))
        b = monthly_bundle(b.data["value"].to_numpy(), start="1981-01-01",
                           loc=Location("b", "Sitio B", -10.0, -20.0))
        ra, rb = analyze_bundle(a, 1981, 2020), analyze_bundle(b, 1981, 2020)
        c = compare_results(ra, rb)
        assert c.differ_significantly == (c.diff.primary.p_value < 0.05)
        if c.pattern.endswith("con_evidencia"):
            assert c.core_a.verdict != "inconclusive" and c.core_b.verdict != "inconclusive"
        text = " ".join(explain_comparison(c, ra, rb))
        if not c.differ_significantly:
            assert "difieren de forma estadísticamente significativa" not in text


def test_difference_ols_slope_is_exact_difference():
    c = compare_results(_syn("creciente", "A"), _syn("decreciente", "B"))
    assert c.diff.ols.slope == pytest.approx(c.core_a.ols.slope - c.core_b.ols.slope, rel=1e-10)


def test_not_comparable_cases(load_fixture):
    ra_t = _syn("creciente", "A", "T2M")
    rb_p = _syn("creciente", "B", "PRECTOTCORR")
    assert compare_results(ra_t, rb_p).pattern == "no_comparable"
    real = parse_power_monthly(load_fixture("power_mexicali_1981_2025.json"), VARIABLES["T2M"],
                               PRESETS_BY_ID["mexicali"], request_url="x", retrieved_at_utc="t")
    rr = analyze_bundle(real, 1981, 2025)
    assert compare_results(ra_t, rr).pattern == "no_comparable"  # sintético vs real
    near = Location("near", "Muy cerca", PRESETS_BY_ID["mexicali"].lat + 0.05, PRESETS_BY_ID["mexicali"].lon + 0.05)
    real2 = parse_power_monthly(load_fixture("power_mexicali_1981_2025.json"), VARIABLES["T2M"], near,
                                request_url="x", retrieved_at_utc="t")
    c = compare_results(rr, analyze_bundle(real2, 1981, 2025))
    assert c.pattern == "no_comparable"
    assert any("misma celda" in ch.detail for ch in c.checks)


def test_period_mismatch_uses_common_years_and_insufficient_overlap():
    ra = _syn("creciente", "A", y0=1981, y1=2000)
    rb = _syn("decreciente", "B", y0=1995, y1=2025)
    c = compare_results(ra, rb)
    assert c.pattern == "insuficiente" and c.n_common == 6
    assert not next(ch for ch in c.checks if ch.label.startswith("Mismo período")).ok


def test_real_data_comparison_runs(load_fixture):
    rs = []
    for name, loc in (("power_mexicali_1981_2025.json", "mexicali"), ("power_ushuaia_1981_2025.json", "ushuaia")):
        b = parse_power_monthly(load_fixture(name), VARIABLES["PRECTOTCORR"], PRESETS_BY_ID[loc],
                                request_url="x", retrieved_at_utc="t")
        rs.append(analyze_bundle(b, 1981, 2025))
    c = compare_results(*rs)
    assert c.comparable and c.n_common == 45
    assert c.rel_a_pct is not None  # precipitación: se reporta la tendencia relativa


# ---------- Explicaciones ---------------------------------------------------------------------
def _numbers(text):
    return [float(x.replace("−", "-")) for x in re.findall(r"[+−-]?\d+\.\d+", text)]


def test_explanation_uses_only_computed_numbers():
    r = _syn("creciente", "A")
    e = explain_trend(r)
    nums = _numbers(e["resumen"])
    assert round(r.slope_per_decade, 2) in [round(n, 2) for n in nums]
    lo, hi = r.ci_per_decade
    assert round(lo, 2) in [round(n, 2) for n in nums] and round(hi, 2) in [round(n, 2) for n in nums]
    assert f"{r.n} años completos" in e["resumen"]
    assert "1981" in e["resumen"] and "2025" in e["resumen"]


def test_inconclusive_explanation_does_not_claim_absence():
    r = _syn("sin_tendencia", "A")
    assert r.verdict == "inconclusive"
    e = explain_trend(r)
    assert "no demuestra que no haya cambio" in e["interpretacion"]
    assert "no hay tendencia" not in e["interpretacion"].lower()
    assert "años de datos" in e["interpretacion"]  # detectabilidad


def test_explanations_are_non_causal_and_flag_synthetic():
    r = _syn("creciente", "A")
    e = explain_trend(r)
    assert any("no implica automáticamente" in s for s in e["no_concluir"])
    assert any("sintéticos" in s for s in e["no_concluir"])
    assert "conocemos la verdad" in e["verdad_sintetica"]


def test_real_explanation_mentions_grid_point(load_fixture):
    b = parse_power_monthly(load_fixture("power_mexicali_1981_2025.json"), VARIABLES["T2M"],
                            PRESETS_BY_ID["mexicali"], request_url="x", retrieved_at_utc="t")
    e = explain_trend(analyze_bundle(b, 1981, 2025))
    assert "punto de cuadrícula" in e["resumen"]
    assert any("celda" in s for s in e["no_concluir"])
    assert e["verdad_sintetica"] == ""
