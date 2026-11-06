"""Orquestación del análisis de UNA serie: procesamiento → estadística → advertencias → veredicto.

Decisiones metodológicas (ver SCIENTIFIC_METHOD.md):
* Se analiza la serie ANUAL de años completos (elimina el ciclo estacional sin suponer un modelo).
* Prueba principal: Mann-Kendall con corrección de varianza por tamaño efectivo AR(1) (si r1 > 0).
  Elegida con un experimento Monte Carlo propio (stats/experiments.py); Hamed-Rao (1998) y MK
  original se reportan como referencia.
* Magnitud: pendiente de Theil-Sen (robusta) con IC 95 % coherente con la Var(S) usada.
* MCO se reporta como referencia, con y sin ajuste por autocorrelación (Santer et al. 2000).
* Veredicto de tres estados: creciente / decreciente / no concluyente (+ "datos insuficientes").
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..config import ALPHA_DEFAULT, MIN_YEARS_FOR_TEST, RECOMMENDED_MIN_YEARS, SENSITIVITY_MIN_WINDOW, Location, VariableSpec
from ..processing import ProcessingReport, clean_monthly, seasonal_matrix, to_annual
from ..schema import Provenance, SeriesBundle
from .diagnostics import StepCheck, detectability_years, step_vs_linear
from .mann_kendall import (MKResult, SeasonalMKResult, hamed_rao, mann_kendall, mk_ar1_corrected, seasonal_mann_kendall,
                           sen_slope_ci, sen_slope_pairs)
from .ols import OLSResult, ols_trend


@dataclass
class TrendWarning:
    level: str  # "info" | "warning" | "critical"
    code: str
    message: str


@dataclass
class TrendCore:
    """Estadísticos de tendencia de una serie (años, valores) ya limpia."""

    n: int
    years: np.ndarray
    values: np.ndarray
    alpha: float
    mk: MKResult  # MK original (supone independencia)
    mk_hr: MKResult  # Hamed-Rao (referencia)
    primary: MKResult  # MK con corrección AR(1): base del veredicto
    sen_slope: float
    sen_intercept: float
    sen_ci: tuple[float, float]  # coherente con la prueba principal
    sen_ci_independent: tuple[float, float]  # suponiendo independencia
    ols: OLSResult | None

    @property
    def autocorrelation_corrected(self) -> bool:
        return self.primary.correction_factor > 1.0

    @property
    def verdict(self) -> str:
        if self.n < MIN_YEARS_FOR_TEST:
            return "insufficient"
        d = self.primary.direction
        return {"increasing": "increasing", "decreasing": "decreasing"}.get(d, "inconclusive")


def trend_core(years: np.ndarray, values: np.ndarray, alpha: float = ALPHA_DEFAULT) -> TrendCore:
    years = np.asarray(years, dtype=float)
    values = np.asarray(values, dtype=float)
    ok = ~np.isnan(values)
    years, values = years[ok], values[ok]
    n = len(values)
    mk = mann_kendall(values, alpha)
    hr = hamed_rao(values, years, alpha, max_lag=3) if n >= 4 else mk
    primary = mk_ar1_corrected(values, years, alpha) if n >= 4 else mk
    if n >= 2:
        slopes = sen_slope_pairs(years, values)
        sen = float(np.median(slopes))
        sen_int = float(np.median(values) - sen * np.median(years))
        ci_ind = sen_slope_ci(slopes, mk.var_s, alpha)
        ci = sen_slope_ci(slopes, primary.var_s, alpha)
    else:
        sen, sen_int, ci_ind, ci = float("nan"), float("nan"), (np.nan, np.nan), (np.nan, np.nan)
    ols = ols_trend(years, values, alpha) if n >= 3 else None
    return TrendCore(n, years, values, alpha, mk, hr, primary, sen, sen_int, ci, ci_ind, ols)


@dataclass
class TrendResult:
    variable: VariableSpec
    location: Location
    provenance: Provenance
    processing: ProcessingReport
    period: tuple[int, int]
    core: TrendCore
    annual: pd.DataFrame
    monthly: pd.DataFrame
    seasonal: SeasonalMKResult | None
    step: StepCheck | None
    detectability_years: float
    warnings: list[TrendWarning] = field(default_factory=list)

    # --- atajos legibles -------------------------------------------------------------
    @property
    def is_synthetic(self) -> bool:
        return self.provenance.is_synthetic

    @property
    def n(self) -> int:
        return self.core.n

    @property
    def unit(self) -> str:
        return self.variable.annual_unit

    @property
    def verdict(self) -> str:
        return self.core.verdict

    @property
    def slope_per_decade(self) -> float:
        return self.core.sen_slope * 10

    @property
    def ci_per_decade(self) -> tuple[float, float]:
        return self.core.sen_ci[0] * 10, self.core.sen_ci[1] * 10

    @property
    def p_value(self) -> float:
        return self.core.primary.p_value

    @property
    def analyzed_span(self) -> tuple[int, int] | None:
        if self.n == 0:
            return None
        return int(self.core.years.min()), int(self.core.years.max())

    @property
    def total_change(self) -> float:
        span = self.analyzed_span
        if span is None:
            return float("nan")
        return self.core.sen_slope * (span[1] - span[0])

    @property
    def mean_value(self) -> float:
        return float(np.mean(self.core.values)) if self.n else float("nan")

    @property
    def relative_per_decade_pct(self) -> float | None:
        """Solo para variables de razón (precipitación). En °C un porcentaje no tiene sentido físico."""
        if self.variable.aggregation != "sum_from_rate" or not self.mean_value > 0:
            return None
        return self.slope_per_decade / self.mean_value * 100

    @property
    def true_trend_per_decade(self) -> float | None:
        return self.provenance.extra.get("true_trend_per_decade") if self.is_synthetic else None


def evidence_label(p: float, alpha: float) -> str:
    if not np.isfinite(p):
        return "no evaluable"
    if p < 0.01:
        return "evidencia fuerte"
    if p < alpha:
        return "evidencia moderada"
    if p < 0.10:
        return "evidencia débil (sugerente, no concluyente)"
    return "sin evidencia suficiente"


def analyze_bundle(bundle: SeriesBundle, start_year: int, end_year: int, alpha: float = ALPHA_DEFAULT) -> TrendResult:
    var = bundle.variable
    monthly, rep = clean_monthly(bundle, start_year, end_year)
    annual = to_annual(monthly, var)
    core = trend_core(annual["year"].to_numpy(), annual["value"].to_numpy(), alpha)

    seasonal = None
    mat = seasonal_matrix(monthly)
    if mat.notna().sum().min() >= 3:
        seasonal = seasonal_mann_kendall(mat, alpha)

    step = step_vs_linear(core.years, core.values) if core.n >= MIN_YEARS_FOR_TEST else None
    phi = core.ols.r1_residuals if core.ols is not None else float("nan")
    resid_sd = core.ols.residual_sd if core.ols is not None else float("nan")
    detect = detectability_years(resid_sd, core.sen_slope, phi)

    res = TrendResult(var, bundle.location, bundle.provenance, rep, (start_year, end_year), core, annual, monthly,
                      seasonal, step, detect)
    res.warnings = build_warnings(res)
    return res


def build_warnings(res: TrendResult) -> list[TrendWarning]:
    w: list[TrendWarning] = []
    core, rep = res.core, res.processing
    if res.is_synthetic:
        w.append(TrendWarning("info", "synthetic", "DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN. No describen ningún lugar real."))
    else:
        w.append(TrendWarning(
            "info", "grid_point",
            "El valor corresponde a la celda de la cuadrícula del producto (MERRA-2: ½° × ⅝°, ~50–60 km) que "
            "contiene el punto, no a un promedio del municipio, estado o país, ni a una estación local.",
        ))
        sources = res.provenance.extra.get("sources", [])
        if len(sources) > 1:
            w.append(TrendWarning("warning", "mixed_products",
                                  f"La API declara varias fuentes en la respuesta: {', '.join(sources)}. "
                                  "Verifica que no se mezclen productos distintos en el período analizado."))
    if core.n < MIN_YEARS_FOR_TEST:
        w.append(TrendWarning("critical", "insufficient",
                              f"Solo {core.n} años completos (mínimo {MIN_YEARS_FOR_TEST}). No se emite veredicto."))
    elif core.n < RECOMMENDED_MIN_YEARS:
        w.append(TrendWarning("warning", "short_period",
                              f"Período corto: {core.n} años (< {RECOMMENDED_MIN_YEARS}). La variabilidad natural "
                              "decenal puede dominar la pendiente."))
    if rep.incomplete_years:
        yrs = ", ".join(str(y) for y in sorted(rep.incomplete_years))
        w.append(TrendWarning("warning", "incomplete_years",
                              f"Años excluidos por estar incompletos: {yrs}. No se rellenaron ni interpolaron."))
    elif rep.missing_months:
        w.append(TrendWarning("info", "missing_months", f"{len(rep.missing_months)} meses faltantes."))
    if core.n >= 3 and np.any(np.diff(core.years) > 1):
        w.append(TrendWarning("info", "annual_gaps",
                              "La serie anual tiene huecos; las pendientes usan los años reales (no índices)."))
    if core.primary.significant_lags:
        w.append(TrendWarning(
            "warning", "autocorrelation",
            f"Autocorrelación de lag 1 significativa ({core.primary.note}). El valor p usa la corrección AR(1): "
            f"p = {core.primary.p_value:.3g}; suponiendo independencia sería p = {core.mk.p_value:.3g}. Con persistencia "
            "fuerte y series cortas ninguna corrección es perfecta (ver experimento de falsos positivos).",
        ))
    elif core.autocorrelation_corrected:
        w.append(TrendWarning("info", "autocorr_mild",
                              f"Autocorrelación positiva leve ({core.primary.note}); ya incluida en el valor p."))
    if res.step is not None and res.step.favors_step:
        w.append(TrendWarning(
            "warning", "change_point",
            f"Un escalón en {res.step.change_year} (salto ≈ {res.step.shift:+.3g} {res.unit}) describe los datos "
            f"mejor que una recta (ΔBIC = {res.step.delta_bic:.1f}). La pendiente resume el cambio neto, pero "
            "puede no ser una tendencia gradual; revisa también cambios de instrumento o de producto.",
        ))
    if core.ols is not None and core.ols.constant_series:
        w.append(TrendWarning("info", "constant", "La serie es constante: pendiente 0 sin incertidumbre evaluable."))
    if core.ols is not None and core.n >= MIN_YEARS_FOR_TEST and np.isfinite(core.ols.p_value):
        p_ols = core.ols.adj_p_value if core.ols.adj_valid else core.ols.p_value
        if (p_ols < core.alpha) != (core.primary.p_value < core.alpha):
            w.append(TrendWarning("info", "methods_disagree",
                                  f"MCO (p = {p_ols:.3g}) y Mann-Kendall (p = {core.primary.p_value:.3g}) no coinciden "
                                  "en la significancia: el resultado depende del método; interpretar con cautela."))
    if res.seasonal is not None and res.seasonal.note:
        w.append(TrendWarning("info", "seasonal_ties", res.seasonal.note))
    return w


def start_year_sensitivity(res: TrendResult, min_window: int = SENSITIVITY_MIN_WINDOW) -> pd.DataFrame:
    """Pendiente de Sen (por década) e IC al variar el año inicial con el año final fijo."""
    years, vals = res.core.years, res.core.values
    rows = []
    if len(years) == 0:
        return pd.DataFrame(columns=["start_year", "n", "slope_decade", "ci_low", "ci_high", "p_value"])
    last = years.max()
    for y0 in years:
        if last - y0 + 1 < min_window:
            break
        m = years >= y0
        c = trend_core(years[m], vals[m], res.core.alpha)
        rows.append({"start_year": int(y0), "n": c.n, "slope_decade": c.sen_slope * 10,
                     "ci_low": c.sen_ci[0] * 10, "ci_high": c.sen_ci[1] * 10, "p_value": c.primary.p_value})
    return pd.DataFrame(rows)
