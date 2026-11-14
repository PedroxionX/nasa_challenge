"""Diagnósticos auxiliares: autocorrelación, tamaño efectivo, cambio abrupto y detectabilidad."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def acf(x: np.ndarray, nlags: int) -> np.ndarray:
    """Autocorrelación muestral (estimador sesgado, denominador n), lags 0..nlags."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    y = x - x.mean()
    denom = np.dot(y, y)
    if n == 0 or denom == 0:
        return np.r_[1.0, np.zeros(nlags)]
    full = np.correlate(y, y, mode="full")[n - 1:] / denom
    out = np.zeros(nlags + 1)
    out[: min(nlags + 1, n)] = full[: min(nlags + 1, n)]
    return out


def lag1_autocorrelation(x: np.ndarray) -> float:
    x = np.asarray(x, dtype=float)
    if len(x) < 3:
        return float("nan")
    return float(acf(x, 1)[1])


def effective_sample_size(n: int, r1: float) -> float:
    """n_eff = n(1 − r1)/(1 + r1) (Santer et al., 2000). Con r1 ≤ 0 no se 'premia' al usuario: n_eff = n."""
    if not np.isfinite(r1) or r1 <= 0:
        return float(n)
    return float(n * (1.0 - r1) / (1.0 + r1))


@dataclass
class StepCheck:
    change_year: int  # primer año del nuevo régimen
    shift: float  # media después − media antes
    delta_bic: float  # BIC(recta) − BIC(escalón); > 0 favorece el escalón
    favors_step: bool


STEP_BIC_THRESHOLD = 6.0  # "evidencia fuerte" en la escala de Kass y Raftery (1995)


def step_vs_linear(t: np.ndarray, y: np.ndarray, min_segment: int = 5) -> StepCheck | None:
    """¿Describe mejor los datos un escalón (dos medias) que una recta?

    Se compara por BIC una recta (a, b, σ: k=3) con el mejor escalón (μ1, μ2, año, σ: k=4).
    Nota: la prueba de Pettitt NO sirve para esto, porque también resulta significativa ante una
    tendencia gradual; por eso usamos una comparación de modelos.
    """
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    n = len(y)
    if n < 2 * min_segment or np.ptp(y) == 0:
        return None
    b, a = np.polyfit(t, y, 1)
    rss_lin = float(np.sum((y - (a + b * t)) ** 2))
    best_k, best_rss = None, np.inf
    for k in range(min_segment, n - min_segment + 1):
        rss = float(np.sum((y[:k] - y[:k].mean()) ** 2) + np.sum((y[k:] - y[k:].mean()) ** 2))
        if rss < best_rss:
            best_k, best_rss = k, rss
    if best_k is None or rss_lin <= 0 or best_rss <= 0:
        return None
    bic_lin = n * np.log(rss_lin / n) + 3 * np.log(n)
    bic_step = n * np.log(best_rss / n) + 4 * np.log(n)
    d = float(bic_lin - bic_step)
    return StepCheck(int(t[best_k]), float(y[best_k:].mean() - y[:best_k].mean()), d, d > STEP_BIC_THRESHOLD)


def detectability_years(residual_sd: float, trend_per_year: float, phi: float) -> float:
    """Años necesarios para detectar una tendencia con ~90 % de probabilidad (α = 0.05, bilateral).

    Adaptación a datos ANUALES de Weatherhead et al. (1998): con n puntos anuales,
    Var(β̂) ≈ 12σ²/n³ · (1+φ)/(1−φ); se exige |β|/σ_β ≥ 3.3 ⇒
    n* = [3.3·√12·σ/|β| · √((1+φ)/(1−φ))]^(2/3).
    φ se limita a [0, 0.95] (conservador). Supone tendencia lineal y ruido AR(1).
    """
    if not np.isfinite(residual_sd) or not np.isfinite(trend_per_year) or trend_per_year == 0:
        return float("inf")
    if residual_sd == 0:
        return 0.0
    phi = float(np.clip(phi if np.isfinite(phi) else 0.0, 0.0, 0.95))
    factor = np.sqrt((1 + phi) / (1 - phi))
    return float((3.3 * np.sqrt(12.0) * residual_sd / abs(trend_per_year) * factor) ** (2.0 / 3.0))
