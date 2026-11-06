"""Prueba de Mann-Kendall (MK), corrección de Hamed y Rao (1998), Seasonal MK y pendiente de Sen.

Implementación propia (validada contra `pymannkendall` en tests/test_mann_kendall.py) para poder:
* usar el tiempo REAL en las pendientes (pymannkendall usa índices 1..n, lo cual distorsiona la
  pendiente si faltan años intermedios);
* exponer todos los términos intermedios (S, Var(S), Z, factor de corrección) en la interfaz.

Definiciones (Mann 1945; Kendall 1975):
    S = Σ_{i<j} sgn(x_j − x_i)
    Var(S) = [n(n−1)(2n+5) − Σ_p t_p(t_p−1)(2t_p+5)] / 18        (corrección por empates)
    Z = (S−1)/√Var(S) si S>0;  0 si S=0;  (S+1)/√Var(S) si S<0    (corrección por continuidad)
    p = 2·(1 − Φ(|Z|))
Supuesto clave: observaciones INDEPENDIENTES. Para n < 10 la aproximación normal es pobre.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats


@dataclass
class MKResult:
    test_name: str
    n: int
    s: float
    var_s: float
    z: float
    p_value: float
    tau: float
    alpha: float
    valid: bool
    correction_factor: float = 1.0  # n/n* de Hamed-Rao (1 = sin corrección)
    significant_lags: list[int] = field(default_factory=list)
    note: str = ""

    @property
    def direction(self) -> str:
        """'increasing' | 'decreasing' | 'no_trend' según el signo de Z y α."""
        if not self.valid or not np.isfinite(self.p_value) or self.p_value >= self.alpha:
            return "no_trend"
        return "increasing" if self.z > 0 else "decreasing"


def mk_score(x: np.ndarray) -> float:
    x = np.asarray(x, dtype=float)
    n = len(x)
    if n < 2:
        return 0.0
    diff = x[None, :] - x[:, None]
    iu = np.triu_indices(n, k=1)
    return float(np.sign(diff[iu]).sum())


def variance_s(x: np.ndarray) -> float:
    x = np.asarray(x, dtype=float)
    n = len(x)
    _, counts = np.unique(x, return_counts=True)
    ties = counts[counts > 1]
    return float((n * (n - 1) * (2 * n + 5) - np.sum(ties * (ties - 1) * (2 * ties + 5))) / 18.0)


def z_score(s: float, var_s: float) -> float:
    if var_s <= 0:
        return 0.0
    if s > 0:
        return (s - 1) / np.sqrt(var_s)
    if s < 0:
        return (s + 1) / np.sqrt(var_s)
    return 0.0


def _p_two_sided(z: float) -> float:
    return float(2 * stats.norm.sf(abs(z)))


def mann_kendall(x: np.ndarray, alpha: float = 0.05) -> MKResult:
    x = np.asarray(x, dtype=float)
    if np.isnan(x).any():
        raise ValueError("mann_kendall no acepta NaN: excluye los faltantes de forma explícita antes.")
    n = len(x)
    if n < 3:
        return MKResult("Mann-Kendall", n, 0.0, 0.0, 0.0, float("nan"), float("nan"), alpha, False,
                        note="Se necesitan al menos 3 observaciones.")
    s = mk_score(x)
    var_s = variance_s(x)
    if var_s <= 0:  # serie constante
        return MKResult("Mann-Kendall", n, s, var_s, 0.0, 1.0, 0.0, alpha, True,
                        note="Serie constante: S = 0 y no hay variabilidad que evaluar.")
    z = z_score(s, var_s)
    note = "n < 10: la aproximación normal de MK es poco fiable." if n < 10 else ""
    return MKResult("Mann-Kendall", n, s, var_s, z, _p_two_sided(z), s / (0.5 * n * (n - 1)), alpha, True, note=note)


def sen_slope_pairs(t: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Todas las pendientes por pares (y_j − y_i)/(t_j − t_i), i<j, ordenadas."""
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    iu = np.triu_indices(len(y), k=1)
    dt = (t[None, :] - t[:, None])[iu]
    dy = (y[None, :] - y[:, None])[iu]
    ok = dt != 0
    return np.sort(dy[ok] / dt[ok])


def sen_slope_ci(slopes_sorted: np.ndarray, var_s: float, alpha: float = 0.05) -> tuple[float, float]:
    """IC de la pendiente de Sen (Sen 1968), con el mismo redondeo que scipy.stats.theilslopes.

    Al pasar la Var(S) corregida por Hamed-Rao se obtiene un IC coherente con la autocorrelación.
    """
    nt = len(slopes_sorted)
    if nt == 0 or var_s <= 0:
        return float("nan"), float("nan")
    z = stats.norm.ppf(alpha / 2.0)  # negativo
    sigma = np.sqrt(var_s)
    ru = min(int(np.round((nt - z * sigma) / 2.0)), nt - 1)
    rl = max(int(np.round((nt + z * sigma) / 2.0)) - 1, 0)
    return float(slopes_sorted[rl]), float(slopes_sorted[ru])


def hamed_rao(x: np.ndarray, t: np.ndarray | None = None, alpha: float = 0.05, max_lag: int | None = 3) -> MKResult:
    """MK modificado de Hamed y Rao (1998) para autocorrelación.

    1. Se elimina la tendencia con la pendiente de Sen (sobre el tiempo real `t`).
    2. Se calcula la autocorrelación de los RANGOS de la serie sin tendencia.
    3. Solo cuentan los lags significativos (|r_k| > z_{1−α/2}/√n) hasta `max_lag`
       (3 por defecto, como proponen Hamed y Rao; None = todos los lags).
    4. Var*(S) = Var(S)·n/n*, con n/n* = 1 + 2/(n(n−1)(n−2)) Σ (n−k)(n−k−1)(n−k−2) r_k.
    """
    x = np.asarray(x, dtype=float)
    n = len(x)
    t = np.arange(1, n + 1, dtype=float) if t is None else np.asarray(t, dtype=float)
    base = mann_kendall(x, alpha)
    if not base.valid or base.var_s <= 0 or n < 4:
        base.test_name = "Mann-Kendall modificado (Hamed-Rao)"
        return base
    slope = float(np.median(sen_slope_pairs(t, x)))
    detrended = x - slope * t
    ranks = stats.rankdata(detrended)
    from .diagnostics import acf  # import local para evitar ciclos

    lag = n - 1 if max_lag is None else min(max_lag, n - 1)
    r = acf(ranks, n - 1)
    bound = stats.norm.ppf(1 - alpha / 2) / np.sqrt(n)
    acc = 0.0
    sig = []
    for k in range(1, lag + 1):
        if abs(r[k]) > bound:
            acc += (n - k) * (n - k - 1) * (n - k - 2) * r[k]
            sig.append(k)
    factor = 1.0 + 2.0 / (n * (n - 1) * (n - 2)) * acc
    if factor <= 0:
        return MKResult("Mann-Kendall modificado (Hamed-Rao)", n, base.s, base.var_s, base.z, base.p_value,
                        base.tau, alpha, False, factor, sig,
                        note="Factor de corrección no positivo: la corrección no es aplicable.")
    var_star = base.var_s * factor
    z = z_score(base.s, var_star)
    return MKResult("Mann-Kendall modificado (Hamed-Rao)", n, base.s, var_star, z, _p_two_sided(z), base.tau,
                    alpha, True, factor, sig, note=base.note)


def mk_ar1_corrected(x: np.ndarray, t: np.ndarray | None = None, alpha: float = 0.05) -> MKResult:
    """MK con corrección de varianza por tamaño efectivo de muestra AR(1) — PRUEBA PRINCIPAL del laboratorio.

    1. Se elimina la tendencia con la pendiente de Sen (tiempo real `t`).
    2. r1 = autocorrelación de lag 1 de la serie sin tendencia.
    3. Si r1 > 0: Var*(S) = Var(S)·(1 + r1)/(1 − r1)  (equivale a n_eff = n(1 − r1)/(1 + r1)).
       Si r1 ≤ 0 no se corrige (no se reduce la varianza: criterio conservador).
    Es la misma lógica que el ajuste de Santer et al. (2000) para MCO y un caso AR(1) del enfoque de
    tamaño efectivo de Yue y Wang (2004). Se eligió frente a Hamed-Rao con el experimento Monte Carlo
    reproducible de `stats/experiments.py` (mejor calibración de falsos positivos con n = 30–45).
    """
    x = np.asarray(x, dtype=float)
    n = len(x)
    t = np.arange(1, n + 1, dtype=float) if t is None else np.asarray(t, dtype=float)
    name = "Mann-Kendall con corrección AR(1)"
    base = mann_kendall(x, alpha)
    if not base.valid or base.var_s <= 0 or n < 4:
        base.test_name = name
        return base
    from .diagnostics import acf  # import local para evitar ciclos

    slope = float(np.median(sen_slope_pairs(t, x)))
    r1 = float(acf(x - slope * t, 1)[1])
    factor = (1.0 + r1) / (1.0 - r1) if 0 < r1 < 1 else 1.0
    var_star = base.var_s * factor
    z = z_score(base.s, var_star)
    sig = [1] if r1 > stats.norm.ppf(1 - alpha / 2) / np.sqrt(n) else []
    return MKResult(name, n, base.s, var_star, z, _p_two_sided(z), base.tau, alpha, True, factor, sig,
                    note=f"r1 = {r1:.2f}; n efectivo ≈ {n / factor:.1f}" + (f". {base.note}" if base.note else ""))


@dataclass
class SeasonalMKResult:
    s: float
    var_s: float
    z: float
    p_value: float
    tau: float
    slope_per_year: float  # pendiente de Sen estacional (mediana de pendientes dentro de cada mes)
    n_seasons: int
    n_years: int
    per_season_s: dict[int, float]
    zero_fraction: float  # fracción de valores = 0 (precipitación en zonas áridas ⇒ muchos empates)
    alpha: float
    valid: bool
    note: str = ""


def seasonal_mann_kendall(matrix: pd.DataFrame, alpha: float = 0.05) -> SeasonalMKResult:
    """Seasonal Mann-Kendall (Hirsch, Slack y Smith 1982) sobre una tabla año × mes.

    Compara cada mes solo consigo mismo (enero con enero, …), así el ciclo estacional no se
    confunde con tendencia. Supone independencia ENTRE estaciones (limitación documentada).
    Los NaN se omiten por estación (no se eliminan años completos).
    """
    years = matrix.index.to_numpy(dtype=float)
    s_tot, var_tot, denom = 0.0, 0.0, 0.0
    per = {}
    slopes = []
    n_seasons = 0
    for m in matrix.columns:
        col = matrix[m].to_numpy(dtype=float)
        ok = ~np.isnan(col)
        xs, ts = col[ok], years[ok]
        if len(xs) < 3:
            continue
        n_seasons += 1
        s_m = mk_score(xs)
        per[int(m)] = s_m
        s_tot += s_m
        var_tot += variance_s(xs)
        denom += len(xs) * (len(xs) - 1) / 2
        slopes.append(sen_slope_pairs(ts, xs))
    vals = matrix.to_numpy(dtype=float)
    zero_frac = float(np.mean(vals[~np.isnan(vals)] == 0)) if np.isfinite(vals).any() else 0.0
    if n_seasons == 0 or var_tot <= 0:
        return SeasonalMKResult(s_tot, var_tot, 0.0, float("nan"), float("nan"), float("nan"), n_seasons,
                                len(years), per, zero_frac, alpha, False, "Datos insuficientes por estación.")
    z = z_score(s_tot, var_tot)
    slope = float(np.median(np.concatenate(slopes))) if slopes else float("nan")
    note = ""
    if zero_frac > 0.3:
        note = f"{zero_frac:.0%} de los meses valen 0: muchos empates; la prueba pierde potencia."
    return SeasonalMKResult(s_tot, var_tot, z, _p_two_sided(z), s_tot / denom, slope, n_seasons, len(years),
                            per, zero_frac, alpha, True, note)
