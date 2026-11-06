"""Opposite Trends Explorer: comparación honesta de las tendencias de dos ubicaciones.

Que dos pendientes tengan signo opuesto NO demuestra que sean distintas. La prueba formal se hace
sobre la SERIE DE DIFERENCIAS D_t = A_t − B_t en los años comunes:
* MCO: la pendiente de D es exactamente β_A − β_B, y su error estándar ya incorpora la correlación
  entre ambos sitios (que suele ser positiva si están cerca: comparten clima regional).
* Mann-Kendall (+ Hamed-Rao) y Sen sobre D: ¿divergen (o convergen) las dos series de forma monótona?
También se reporta, como referencia, la prueba z que supone sitios independientes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy import stats

from ..config import MIN_YEARS_FOR_TEST
from .engine import TrendCore, TrendResult, trend_core


@dataclass
class ComparabilityCheck:
    label: str
    ok: bool
    detail: str


@dataclass
class ComparisonResult:
    checks: list[ComparabilityCheck]
    comparable: bool
    common_years: list[int]
    only_a: list[int]
    only_b: list[int]
    core_a: TrendCore | None
    core_b: TrendCore | None
    diff: TrendCore | None
    independent_z: float
    independent_p: float
    residual_corr: float
    pattern: str
    pattern_title: str
    differ_significantly: bool | None
    rel_a_pct: float | None = None
    rel_b_pct: float | None = None
    notes: list[str] = field(default_factory=list)

    @property
    def n_common(self) -> int:
        return len(self.common_years)


PATTERNS = {
    "no_comparable": "No comparable",
    "insuficiente": "Datos insuficientes para comparar",
    "opuestas_con_evidencia": "Signos opuestos, ambas tendencias con evidencia estadística",
    "opuestas_descriptivo": "Signos opuestos solo en lo descriptivo",
    "mismo_signo_con_evidencia": "Mismo signo, ambas tendencias con evidencia estadística",
    "mismo_signo_descriptivo": "Mismo signo solo en lo descriptivo",
    "sin_cambio_estimado": "Al menos una pendiente estimada es exactamente cero",
}


def _sign(x: float) -> int:
    if not np.isfinite(x) or x == 0:
        return 0
    return 1 if x > 0 else -1


def merra2_cell(lat: float, lon: float) -> tuple[int, int] | None:
    """Índice de la celda MERRA-2 más cercana (½° lat × ⅝° lon). None si no hay coordenadas."""
    if not (np.isfinite(lat) and np.isfinite(lon)):
        return None
    return int(round((lat + 90) / 0.5)), int(round((lon + 180) / 0.625))


def compare_results(ra: TrendResult, rb: TrendResult) -> ComparisonResult:
    alpha = ra.core.alpha
    checks = [
        ComparabilityCheck("Misma variable", ra.variable.code == rb.variable.code,
                           f"{ra.variable.code} vs {rb.variable.code}"),
        ComparabilityCheck("Mismas unidades", ra.unit == rb.unit, f"{ra.unit} vs {rb.unit}"),
        ComparabilityCheck("Mismo tipo de datos (sintético/real)", ra.is_synthetic == rb.is_synthetic,
                           "ambos sintéticos" if ra.is_synthetic and rb.is_synthetic else
                           "ambos reales" if not ra.is_synthetic and not rb.is_synthetic else "mezcla no permitida"),
        ComparabilityCheck("Mismo producto/fuente", ra.provenance.source == rb.provenance.source,
                           f"{ra.provenance.source} vs {rb.provenance.source}"),
    ]
    ya, yb = set(ra.core.years.astype(int)), set(rb.core.years.astype(int))
    common = sorted(ya & yb)
    only_a, only_b = sorted(ya - yb), sorted(yb - ya)
    checks.append(ComparabilityCheck(
        "Mismo período (años completos comunes)", not only_a and not only_b,
        f"{len(common)} años comunes" + (f"; solo en A: {only_a}" if only_a else "") + (f"; solo en B: {only_b}" if only_b else ""),
    ))
    checks.append(ComparabilityCheck(f"Al menos {MIN_YEARS_FOR_TEST} años comunes", len(common) >= MIN_YEARS_FOR_TEST,
                                     f"{len(common)} años"))
    notes: list[str] = []
    ca, cb = merra2_cell(ra.location.lat, ra.location.lon), merra2_cell(rb.location.lat, rb.location.lon)
    if ca is not None and ca == cb:
        checks.append(ComparabilityCheck("Celdas de cuadrícula distintas", False,
                                         "Ambos puntos caen en la misma celda MERRA-2: los datos serían idénticos."))
    comparable = all(c.ok for c in checks[:4]) and (ca is None or ca != cb)
    nan = float("nan")
    if not comparable:
        return ComparisonResult(checks, False, common, only_a, only_b, None, None, None, nan, nan, nan,
                                "no_comparable", PATTERNS["no_comparable"], None, notes=notes)
    if len(common) < MIN_YEARS_FOR_TEST:
        return ComparisonResult(checks, True, common, only_a, only_b, None, None, None, nan, nan, nan,
                                "insuficiente", PATTERNS["insuficiente"], None, notes=notes)

    def subset(r: TrendResult) -> np.ndarray:
        m = dict(zip(r.core.years.astype(int), r.core.values))
        return np.array([m[y] for y in common], dtype=float)

    yrs = np.array(common, dtype=float)
    va, vb = subset(ra), subset(rb)
    core_a, core_b = trend_core(yrs, va, alpha), trend_core(yrs, vb, alpha)
    diff = trend_core(yrs, va - vb, alpha)

    # Referencia: prueba z suponiendo independencia entre sitios (usa SE ajustado por autocorrelación si existe)
    def se(c: TrendCore) -> float:
        o = c.ols
        return o.adj_stderr if (o.adj_valid and o.n_eff < o.n) else o.stderr

    z_ind, p_ind = nan, nan
    if core_a.ols and core_b.ols and not (core_a.ols.constant_series and core_b.ols.constant_series):
        denom = np.hypot(se(core_a), se(core_b))
        if denom > 0:
            z_ind = (core_a.ols.slope - core_b.ols.slope) / denom
            p_ind = float(2 * stats.norm.sf(abs(z_ind)))
    resid_corr = nan
    if core_a.ols and core_b.ols and not (core_a.ols.constant_series or core_b.ols.constant_series):
        ea = va - (core_a.ols.intercept + core_a.ols.slope * yrs)
        eb = vb - (core_b.ols.intercept + core_b.ols.slope * yrs)
        resid_corr = float(np.corrcoef(ea, eb)[0, 1])

    sa, sb = _sign(core_a.sen_slope), _sign(core_b.sen_slope)
    ev_a = core_a.verdict in ("increasing", "decreasing")
    ev_b = core_b.verdict in ("increasing", "decreasing")
    if sa == 0 or sb == 0:
        pattern = "sin_cambio_estimado"
    elif sa != sb:
        pattern = "opuestas_con_evidencia" if (ev_a and ev_b) else "opuestas_descriptivo"
    else:
        pattern = "mismo_signo_con_evidencia" if (ev_a and ev_b) else "mismo_signo_descriptivo"

    differ = bool(diff.primary.valid and np.isfinite(diff.primary.p_value) and diff.primary.p_value < alpha)
    if np.isfinite(resid_corr) and resid_corr > 0.3:
        notes.append(f"Las variaciones interanuales de A y B están correlacionadas (r = {resid_corr:.2f}); "
                     "por eso la prueba sobre la diferencia es más adecuada que suponer independencia.")
    if only_a or only_b:
        notes.append("La comparación usa solo los años completos comunes; las pendientes pueden diferir "
                     "ligeramente de las del análisis individual.")

    def rel(r: TrendResult, c: TrendCore) -> float | None:
        if r.variable.aggregation != "sum_from_rate":
            return None
        m = float(np.mean(c.values))
        return c.sen_slope * 10 / m * 100 if m > 0 else None

    return ComparisonResult(checks, True, common, only_a, only_b, core_a, core_b, diff, float(z_ind), float(p_ind),
                            resid_corr, pattern, PATTERNS[pattern], differ, rel(ra, core_a), rel(rb, core_b), notes)
