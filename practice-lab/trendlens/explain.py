"""Explicaciones en español generadas con PLANTILLAS DETERMINISTAS (Módulo E).

Solo usan cifras calculadas por el motor. No hay IA generativa ni texto inventado: si un número
no existe en el resultado, la frase correspondiente no se emite.
"""

from __future__ import annotations

import math

import numpy as np

from .stats.compare import ComparisonResult
from .stats.engine import TrendResult, evidence_label

VERDICT_ES = {
    "increasing": "creciente",
    "decreasing": "decreciente",
    "inconclusive": "no concluyente",
    "insufficient": "datos insuficientes",
}

CAUSAL_DISCLAIMER = (
    "Esto no implica automáticamente que el calentamiento global, la urbanización, el uso de suelo o "
    "cualquier otra causa concreta sea responsable del cambio: el análisis describe un patrón estadístico, "
    "no identifica mecanismos."
)


def decimals_for(x: float) -> int:
    ax = abs(x)
    if not math.isfinite(ax):
        return 2
    if ax >= 100:
        return 0
    if ax >= 10:
        return 1
    if ax >= 0.1:
        return 2
    return 3


def fnum(x: float, signed: bool = True, ref: float | None = None) -> str:
    """Formato numérico con decimales según la magnitud (o según `ref` para alinear un IC)."""
    if x is None or not math.isfinite(x):
        return "—"
    d = decimals_for(ref if ref is not None else x)
    s = f"{x:+.{d}f}" if signed else f"{x:.{d}f}"
    return s.replace("-", "−")


def fp(p: float) -> str:
    if p is None or not math.isfinite(p):
        return "no evaluable"
    if p < 0.001:
        return "p < 0.001"
    return f"p = {p:.3f}"


def location_phrase(res: TrendResult) -> str:
    loc = res.location
    if res.is_synthetic:
        return f"el **{loc.name}** (ficticio)"
    if res.provenance.origin == "nasa_power":
        return (f"el punto de cuadrícula de NASA POWER más cercano a **{loc.name}** "
                f"({loc.lat:.2f}°, {loc.lon:.2f}°)")
    coords = f" ({loc.lat:.2f}°, {loc.lon:.2f}°)" if math.isfinite(loc.lat) and math.isfinite(loc.lon) else ""
    return f"**{loc.name}**{coords} (datos cargados desde CSV; fuente declarada: {res.provenance.source})"


def per_decade(res: TrendResult) -> str:
    return f"{res.unit} por década"


def explain_trend(res: TrendResult) -> dict[str, list[str] | str]:
    """Devuelve {'resumen', 'interpretacion', 'incertidumbre', 'no_concluir', 'verdad_sintetica'}."""
    var = res.variable
    out: dict[str, list[str] | str] = {}
    span = res.analyzed_span
    if span is None or res.n < 3:
        out["resumen"] = (f"No hay suficientes años completos para {var.name_es.lower()} en {location_phrase(res)} "
                          f"durante {res.period[0]}–{res.period[1]}. No se calcula ninguna tendencia.")
        out["interpretacion"] = ""
        out["incertidumbre"] = ""
        out["no_concluir"] = ["Ninguna conclusión sobre tendencia es posible con estos datos."]
        out["verdad_sintetica"] = ""
        return out

    slope = res.slope_per_decade
    lo, hi = res.ci_per_decade
    total = res.total_change
    out["resumen"] = (
        f"Para **{var.name_es.lower()}** en {location_phrase(res)}, con **{res.n} años completos** entre "
        f"{span[0]} y {span[1]}, la pendiente de Theil-Sen es **{fnum(slope)} {per_decade(res)}** "
        f"(IC 95 %: {fnum(lo, ref=slope)} a {fnum(hi, ref=slope)}). A lo largo del período eso equivale a un "
        f"cambio neto de ≈ {fnum(total)} {res.unit}."
    )
    rel = res.relative_per_decade_pct
    if rel is not None:
        out["resumen"] += f" En términos relativos: {fnum(rel)} % por década respecto a la media del período."

    alpha = res.core.alpha
    p = res.p_value
    test = res.core.primary.test_name
    if res.verdict in ("increasing", "decreasing"):
        out["interpretacion"] = (
            f"La prueba de {test} da {fp(p)} (< α = {alpha:g}): hay {evidence_label(p, alpha)} de una tendencia "
            f"**{VERDICT_ES[res.verdict]}** monótona en esta serie. La significancia indica que es poco probable "
            "obtener un patrón así solo por azar; no indica que el cambio sea grande o importante."
        )
    elif res.verdict == "inconclusive":
        msg = (f"La prueba de {test} da {fp(p)} (≥ α = {alpha:g}): **los datos no permiten afirmar una tendencia**. "
               "Esto no demuestra que no haya cambio.")
        if math.isfinite(res.detectability_years) and res.detectability_years > 0:
            msg += (f" Con la variabilidad observada, una tendencia de {fnum(slope)} {per_decade(res)} necesitaría "
                    f"≈ {res.detectability_years:.0f} años de datos para detectarse con ~90 % de probabilidad "
                    "(Weatherhead et al., 1998).")
        out["interpretacion"] = msg
    else:
        out["interpretacion"] = (f"Con solo {res.n} años completos no se emite un veredicto: la prueba de "
                                 "Mann-Kendall no es fiable con tan pocos datos.")

    unc = []
    if math.isfinite(lo) and math.isfinite(hi):
        if lo <= 0 <= hi:
            unc.append("El intervalo de confianza **incluye el cero**: ni siquiera el signo de la tendencia está claro.")
        else:
            unc.append("El intervalo de confianza **no incluye el cero**: el signo de la pendiente es consistente con los datos.")
    if res.core.primary.significant_lags:
        unc.append(f"Hay autocorrelación significativa ({res.core.primary.note}): los años vecinos se parecen, así que "
                   "hay menos información independiente de la que sugiere el número de años; el valor p ya lo considera.")
    elif res.core.autocorrelation_corrected:
        unc.append(f"Se aplicó una corrección leve por autocorrelación ({res.core.primary.note}).")
    o = res.core.ols
    if o is not None and not o.constant_series:
        ols_lo, ols_hi = (o.adj_ci_low, o.adj_ci_high) if o.adj_valid else (o.ci_low, o.ci_high)
        unc.append(f"Como referencia, la regresión lineal (MCO) da {fnum(o.slope * 10)} {per_decade(res)} "
                   f"(IC 95 % ajustado: {fnum(ols_lo * 10, ref=o.slope * 10)} a {fnum(ols_hi * 10, ref=o.slope * 10)}).")
    out["incertidumbre"] = " ".join(unc)

    nc = [CAUSAL_DISCLAIMER, "Que la tendencia vaya a continuar: esto no es un pronóstico."]
    if res.is_synthetic:
        nc.insert(0, "Nada sobre el mundo real: son **datos sintéticos** generados para practicar.")
    elif res.provenance.origin == "nasa_power":
        nc.append("Que el resultado represente a toda la ciudad, el estado o el país: es una celda de "
                  "~50–60 km de un reanálisis, no una estación ni un promedio regional.")
    if res.provenance.origin == "csv":
        spatial = res.provenance.extra.get("spatial_resolution") or "no declarada"
        nc.append(f"Que represente un área distinta de la que cubren los datos (resolución declarada: {spatial}).")
        nc.append("Que la procedencia sea la declarada: el laboratorio no puede verificar un archivo subido.")
    if res.step is not None and res.step.favors_step:
        nc.append(f"Que el cambio sea gradual: un salto alrededor de {res.step.change_year} explica mejor los datos.")
    if res.processing.incomplete_years:
        nc.append(f"Nada sobre los {len(res.processing.incomplete_years)} años excluidos por estar incompletos.")
    out["no_concluir"] = nc

    truth = res.true_trend_per_decade
    if truth is not None:
        inside = math.isfinite(lo) and lo <= truth <= hi
        if truth == 0:
            correct = res.verdict in ("inconclusive",)
            kind = "correcto (no se declaró tendencia)" if correct else "un **falso positivo**"
        else:
            expected = "increasing" if truth > 0 else "decreasing"
            if res.verdict == expected:
                kind = "correcto"
            elif res.verdict == "inconclusive":
                kind = "un **falso negativo** (falta de potencia estadística)"
            else:
                kind = "**incorrecto** (signo opuesto)"
        out["verdad_sintetica"] = (
            f"En este escenario conocemos la verdad: la pendiente real es {fnum(truth)} {per_decade(res)}. "
            f"El IC 95 % {'**contiene**' if inside else '**no contiene**'} el valor real y el veredicto es {kind}."
        )
    else:
        out["verdad_sintetica"] = ""
    return out


PATTERN_EXPLANATION = {
    "opuestas_con_evidencia": "Las dos tendencias tienen signos opuestos y cada una, por separado, es estadísticamente distinguible de cero.",
    "opuestas_descriptivo": "Las pendientes estimadas tienen signos opuestos, pero al menos una no es estadísticamente distinguible de cero: "
                            "la oposición es **solo descriptiva**.",
    "mismo_signo_con_evidencia": "Ambas tendencias van en el mismo sentido y cada una tiene evidencia estadística.",
    "mismo_signo_descriptivo": "Las pendientes estimadas van en el mismo sentido, pero al menos una no es concluyente.",
    "sin_cambio_estimado": "Al menos una pendiente estimada es exactamente cero: no hay signo que comparar.",
    "insuficiente": "No hay suficientes años completos en común para comparar con una prueba estadística.",
    "no_comparable": "Las series no son comparables (variable, unidades, tipo de datos, fuente o celda de cuadrícula).",
}


def explain_comparison(cmp: ComparisonResult, ra: TrendResult, rb: TrendResult) -> list[str]:
    out = [PATTERN_EXPLANATION[cmp.pattern]]
    if cmp.pattern in ("no_comparable", "insuficiente"):
        bad = [f"{c.label} ({c.detail})" for c in cmp.checks if not c.ok]
        if bad:
            out.append("Comprobaciones fallidas: " + "; ".join(bad) + ".")
        return out
    unit = f"{ra.unit} por década"
    ca, cb, d = cmp.core_a, cmp.core_b, cmp.diff
    y0, y1 = cmp.common_years[0], cmp.common_years[-1]
    out.append(
        f"En los **{cmp.n_common} años comunes** ({y0}–{y1}): **A** = {fnum(ca.sen_slope * 10)} {unit} "
        f"({VERDICT_ES[ca.verdict]}, {fp(ca.primary.p_value)}); **B** = {fnum(cb.sen_slope * 10)} {unit} "
        f"({VERDICT_ES[cb.verdict]}, {fp(cb.primary.p_value)})."
    )
    ols_diff = d.ols.slope * 10 if d.ols is not None else float("nan")
    verdict = ("**las pendientes difieren de forma estadísticamente significativa**" if cmp.differ_significantly
               else "**no hay evidencia suficiente de que las pendientes difieran**")
    out.append(
        f"Prueba formal sobre la serie de diferencias A − B: pendiente de Sen {fnum(d.sen_slope * 10)} {unit} "
        f"(IC 95 %: {fnum(d.sen_ci[0] * 10, ref=d.sen_slope * 10)} a {fnum(d.sen_ci[1] * 10, ref=d.sen_slope * 10)}), "
        f"{d.primary.test_name} {fp(d.primary.p_value)} ⇒ {verdict}. "
        f"(En MCO, la pendiente de A − B es exactamente β_A − β_B = {fnum(ols_diff)} {unit}.)"
    )
    if cmp.pattern == "opuestas_descriptivo":
        out.append("Que los signos sean opuestos no basta para afirmar que los lugares cambian en sentidos contrarios.")
    if cmp.rel_a_pct is not None and cmp.rel_b_pct is not None:
        out.append(f"En términos relativos (útil para precipitación, donde los climas difieren mucho): "
                   f"A {fnum(cmp.rel_a_pct)} % y B {fnum(cmp.rel_b_pct)} % por década respecto a su propia media.")
    out.extend(cmp.notes)
    out.append("Que dos lugares cambien en sentidos distintos no significa que uno cause el cambio del otro, ni que "
               "compartan un mecanismo. Una correlación no es una relación causal.")
    if ra.is_synthetic:
        out.append("DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN.")
    return out


def headline(res: TrendResult) -> str:
    """Frase corta para tarjetas: 'Creciente · +0.27 °C/década'."""
    if res.n < 3 or not np.isfinite(res.slope_per_decade):
        return "Sin datos suficientes"
    return f"{VERDICT_ES[res.verdict].capitalize()} · {fnum(res.slope_per_decade)} {res.unit}/década"
