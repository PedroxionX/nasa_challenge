"""Regresión lineal por mínimos cuadrados ordinarios (MCO) sobre el tiempo REAL (años).

Supuestos (documentados en SCIENTIFIC_METHOD.md): relación lineal, residuos independientes,
varianza constante y aproximadamente normales. La independencia casi nunca se cumple en clima,
por eso también se reporta el ajuste por autocorrelación de Santer et al. (2000):
n_eff = n(1−r1)/(1+r1),  SE_adj = SE·√((n−2)/(n_eff−2)),  gl = n_eff − 2.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats

from .diagnostics import effective_sample_size, lag1_autocorrelation


@dataclass
class OLSResult:
    n: int
    slope: float
    intercept: float
    stderr: float
    df: float
    ci_low: float
    ci_high: float
    p_value: float
    r_squared: float
    residual_sd: float
    r1_residuals: float
    n_eff: float
    adj_valid: bool
    adj_stderr: float
    adj_df: float
    adj_ci_low: float
    adj_ci_high: float
    adj_p_value: float
    constant_series: bool
    alpha: float
    x_mean: float
    sxx: float


def ols_trend(t: np.ndarray, y: np.ndarray, alpha: float = 0.05) -> OLSResult:
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    if t.shape != y.shape:
        raise ValueError("t e y deben tener la misma longitud")
    if np.isnan(t).any() or np.isnan(y).any():
        raise ValueError("ols_trend no acepta NaN: filtra los faltantes antes (de forma explícita).")
    n = len(y)
    if n < 3:
        raise ValueError("Se necesitan al menos 3 observaciones para MCO con incertidumbre.")
    if np.ptp(t) == 0:
        raise ValueError("Todos los tiempos son iguales.")

    nan = float("nan")
    x_mean = float(t.mean())
    sxx = float(np.sum((t - x_mean) ** 2))
    df = n - 2

    if np.ptp(y) == 0:  # serie constante: pendiente exactamente 0, sin varianza residual
        return OLSResult(n, 0.0, float(y[0]), 0.0, df, 0.0, 0.0, nan, nan, 0.0, nan, float(n), False,
                         nan, nan, nan, nan, nan, True, alpha, x_mean, sxx)

    lr = stats.linregress(t, y)
    resid = y - (lr.intercept + lr.slope * t)
    residual_sd = float(np.sqrt(np.sum(resid**2) / df))
    t_crit = stats.t.ppf(1 - alpha / 2, df)
    ci = (lr.slope - t_crit * lr.stderr, lr.slope + t_crit * lr.stderr)

    r1 = lag1_autocorrelation(resid)
    n_eff = effective_sample_size(n, r1)
    adj_valid = n_eff > 3  # necesitamos gl efectivos > 1
    if adj_valid:
        adj_df = n_eff - 2
        adj_se = float(lr.stderr * np.sqrt((n - 2) / adj_df))
        tc = stats.t.ppf(1 - alpha / 2, adj_df)
        adj_ci = (lr.slope - tc * adj_se, lr.slope + tc * adj_se)
        adj_p = float(2 * stats.t.sf(abs(lr.slope / adj_se), adj_df)) if adj_se > 0 else nan
    else:
        adj_df, adj_se, adj_ci, adj_p = nan, nan, (nan, nan), nan

    return OLSResult(
        n=n, slope=float(lr.slope), intercept=float(lr.intercept), stderr=float(lr.stderr), df=df,
        ci_low=float(ci[0]), ci_high=float(ci[1]), p_value=float(lr.pvalue), r_squared=float(lr.rvalue**2),
        residual_sd=residual_sd, r1_residuals=r1, n_eff=n_eff, adj_valid=adj_valid,
        adj_stderr=adj_se, adj_df=adj_df, adj_ci_low=float(adj_ci[0]), adj_ci_high=float(adj_ci[1]),
        adj_p_value=adj_p, constant_series=False, alpha=alpha, x_mean=x_mean, sxx=sxx,
    )


def confidence_band(res: OLSResult, t_grid: np.ndarray, use_adjusted: bool = True) -> tuple[np.ndarray, np.ndarray]:
    """Banda de confianza (1−α) de la RECTA media de MCO (no es un intervalo de predicción)."""
    t_grid = np.asarray(t_grid, dtype=float)
    fit = res.intercept + res.slope * t_grid
    if res.constant_series or not np.isfinite(res.residual_sd):
        return fit, fit
    s = res.residual_sd
    df = res.df
    if use_adjusted and res.adj_valid and res.n_eff < res.n:
        s = s * np.sqrt((res.n - 2) / res.adj_df)
        df = res.adj_df
    tc = stats.t.ppf(1 - res.alpha / 2, df)
    half = tc * s * np.sqrt(1.0 / res.n + (t_grid - res.x_mean) ** 2 / res.sxx)
    return fit - half, fit + half
