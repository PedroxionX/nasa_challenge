"""Visualizaciones interactivas con Plotly (Módulo B). Sin lógica estadística: solo dibuja resultados.

Paleta validada con el validador de la skill dataviz contra el fondo #0E151E (gráficos transparentes)
(azul / naranja / violeta: todas las comprobaciones CVD, de luminosidad y de contraste en PASS).
La identidad A/B nunca depende solo del color: leyenda + etiquetas directas + nombre en el tooltip.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go

from .processing import anomalies
from .stats.compare import ComparisonResult
from .stats.engine import TrendResult
from .stats.ols import confidence_band

SURFACE = "#0E151E"  # fondo de la página: los gráficos no se dibujan sobre una tarjeta propia
INK = "#E3E9EF"
INK_2 = "#AEB9C4"
MUTED = "#8794A1"
GRID = "#1A2430"
AXIS = "#2B3746"
SYNTH = "#E2B04A"
SERIES = {"A": "#3987e5", "B": "#d95926", "diff": "#9085e9"}
WATERMARK = "DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN"
FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"


def _rgba(hex_color: str, a: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{a})"


def _base(fig: go.Figure, title: str, y_title: str, synthetic: bool, height: int = 420, x_title: str = "Año") -> go.Figure:
    fig.update_layout(
        title=dict(text=title, font=dict(size=13, color=INK_2), x=0, xanchor="left"),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=height,
        font=dict(family=FONT, color=INK_2, size=12),
        margin=dict(l=56, r=16, t=62 if synthetic else 44, b=44),
        hovermode="x unified",
        hoverlabel=dict(bgcolor="#0B1420", bordercolor=AXIS, font=dict(color=INK, family=FONT)),
        legend=dict(orientation="h", yref="container", yanchor="bottom", y=0.0, xanchor="left", x=0,
                    font=dict(color=MUTED, size=11), bgcolor="rgba(0,0,0,0)"),
    )
    # La leyenda va debajo del gráfico: nunca choca con el título, ni en pantallas estrechas
    n_legend = sum(1 for t in fig.data if t.showlegend is not False)
    if n_legend >= 2:
        fig.update_layout(margin=dict(b=78))
    fig.update_xaxes(title=dict(text=x_title, font=dict(color=MUTED)), gridcolor=GRID, linecolor=AXIS,
                     zerolinecolor=AXIS, tickfont=dict(color=MUTED), showline=True)
    fig.update_yaxes(title=dict(text=y_title, font=dict(color=MUTED)), gridcolor=GRID, linecolor=AXIS,
                     zerolinecolor=AXIS, tickfont=dict(color=MUTED), showline=True)
    if synthetic:  # una etiqueta legible dentro de la imagen: sobrevive a capturas y recortes
        fig.add_annotation(text=WATERMARK, xref="paper", yref="paper", x=0, y=1.0, yshift=30,
                           xanchor="left", showarrow=False, font=dict(size=11, color=SYNTH, family=FONT))
    return fig


def annual_trend_figure(res: TrendResult, slot: str = "A", show_anomaly: bool = False,
                        reference: tuple[int, int] | None = None) -> tuple[go.Figure, str]:
    """Serie anual + recta de Sen + banda de confianza de MCO + años excluidos. Devuelve (figura, nota)."""
    color = SERIES[slot]
    unit = res.unit
    years, vals = res.core.years, res.core.values.copy()
    note = ""
    offset = 0.0
    y_title = f"{res.variable.short_es} [{unit}]"
    if show_anomaly and reference is not None:
        an, info = anomalies(res.annual, reference)
        if info.available:
            offset = info.reference_mean
            vals = vals - offset
            y_title = f"Anomalía respecto a {reference[0]}–{reference[1]} [{unit}]"
            note = (f"Media de referencia {reference[0]}–{reference[1]}: {info.reference_mean:.3g} {unit} "
                    f"({info.n_reference_years} años). Restar una constante no cambia la pendiente.")
            if info.reason:
                note += " " + info.reason
        else:
            note = f"Anomalías no disponibles: {info.reason} Se muestran los valores absolutos."

    fig = go.Figure()
    if res.n >= 3 and res.core.ols is not None and not res.core.ols.constant_series:
        grid = np.linspace(years.min(), years.max(), 120)
        lo, hi = confidence_band(res.core.ols, grid)
        fig.add_trace(go.Scatter(x=np.r_[grid, grid[::-1]], y=np.r_[hi, lo[::-1]] - offset, fill="toself",
                                 fillcolor=_rgba(color, 0.14), line=dict(width=0), hoverinfo="skip",
                                 name="IC 95 % (MCO)"))
    fig.add_trace(go.Scatter(
        x=years, y=vals, mode="lines+markers", name="Observado",
        line=dict(color=color, width=1.2), marker=dict(size=8, color=color, line=dict(color=SURFACE, width=2)),
        hovertemplate="%{x}: %{y:.3g} " + unit + "<extra></extra>",
    ))
    if res.n >= 2 and np.isfinite(res.core.sen_slope):
        fit = res.core.sen_intercept + res.core.sen_slope * years - offset
        fig.add_trace(go.Scatter(x=years, y=fit, mode="lines", name="Tendencia (Sen)",
                                 line=dict(color=INK, width=2),
                                 hovertemplate="Sen: %{y:.3g} " + unit + "<extra></extra>"))
    if res.processing.incomplete_years:
        ex = sorted(res.processing.incomplete_years)
        ybase = np.nanmin(vals) if len(vals) else 0
        fig.add_trace(go.Scatter(
            x=ex, y=[ybase] * len(ex), mode="markers", name="Año excluido",
            marker=dict(symbol="x-thin", size=10, color=MUTED, line=dict(width=2, color=MUTED)),
            customdata=[res.processing.incomplete_years[y] for y in ex],
            hovertemplate="%{x}: %{customdata}/12 meses válidos — excluido<extra></extra>",
        ))
    if show_anomaly and offset:
        fig.add_hline(y=0, line=dict(color=AXIS, width=1))
    title = f"{res.location.name} · media anual de años completos" if res.variable.aggregation == "mean" \
        else f"{res.location.name} · total anual de años completos"
    return _base(fig, title, y_title, res.is_synthetic), note


def monthly_figure(res: TrendResult, slot: str = "A") -> go.Figure:
    m = res.monthly
    color = SERIES[slot]
    unit = res.variable.monthly_unit
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=m["timestamp"], y=m["value_monthly"], mode="lines", name="Valor mensual",
                             line=dict(color=color, width=1), connectgaps=False,
                             hovertemplate="%{x|%Y-%m}: %{y:.3g} " + unit + "<extra></extra>"))
    miss = m[m["value_monthly"].isna()]
    if len(miss):
        ybase = float(np.nanmin(m["value_monthly"])) if m["value_monthly"].notna().any() else 0.0
        fig.add_trace(go.Scatter(x=miss["timestamp"], y=[ybase] * len(miss), mode="markers",
                                 name=f"Mes faltante ({len(miss)})",
                                 marker=dict(symbol="line-ns-open", size=12, color=MUTED, line=dict(width=2)),
                                 customdata=miss["quality_flag"],
                                 hovertemplate="%{x|%Y-%m}: faltante (%{customdata})<extra></extra>"))
    conv = "" if res.variable.aggregation == "mean" else f" (convertido de {res.variable.native_unit})"
    return _base(fig, f"{res.location.name} · valores mensuales{conv}", f"{res.variable.short_es} [{unit}]",
                 res.is_synthetic, height=320, x_title="Fecha")


def comparison_figure(ra: TrendResult, rb: TrendResult, cmp: ComparisonResult, use_anomalies: bool,
                      reference: tuple[int, int]) -> tuple[go.Figure, str]:
    fig = go.Figure()
    notes = []
    unit = ra.unit
    for slot, r, core in (("A", ra, cmp.core_a), ("B", rb, cmp.core_b)):
        years, vals = r.core.years, r.core.values
        offset = 0.0
        if use_anomalies:
            _, info = anomalies(r.annual, reference)
            if info.available:
                offset = info.reference_mean
            else:
                notes.append(f"{slot}: anomalías no disponibles ({info.reason})")
        color = SERIES[slot]
        fig.add_trace(go.Scatter(x=years, y=vals - offset, mode="lines+markers", name=f"{slot} · {r.location.name}",
                                 line=dict(color=color, width=1.2),
                                 marker=dict(size=8, color=color, line=dict(color=SURFACE, width=2)),
                                 hovertemplate=f"{slot}: " + "%{y:.3g} " + unit + "<extra></extra>"))
        if core is not None and np.isfinite(core.sen_slope):
            fit = core.sen_intercept + core.sen_slope * core.years - offset
            fig.add_trace(go.Scatter(x=core.years, y=fit, mode="lines", name=f"Sen {slot}",
                                     line=dict(color=color, width=2.5), showlegend=False,
                                     hovertemplate=f"Sen {slot}: " + "%{y:.3g}<extra></extra>"))
            fig.add_annotation(x=core.years[-1], y=fit[-1], text=f" {slot}", showarrow=False, xanchor="left",
                               font=dict(color=INK, size=13))
    y_title = (f"Anomalía respecto a {reference[0]}–{reference[1]} [{unit}]" if use_anomalies
               else f"{ra.variable.short_es} [{unit}]")
    if use_anomalies:
        fig.add_hline(y=0, line=dict(color=AXIS, width=1))
    title = "Series anuales y tendencias de Sen en los años comunes"
    return _base(fig, title, y_title, ra.is_synthetic, height=400), " ".join(notes)


def forest_figure(cmp: ComparisonResult, ra: TrendResult, rb: TrendResult) -> go.Figure:
    """Pendiente de Sen por década con IC 95 % para A, B y la diferencia A − B."""
    rows = [("A − B", cmp.diff, SERIES["diff"]), (f"B · {rb.location.name}", cmp.core_b, SERIES["B"]),
            (f"A · {ra.location.name}", cmp.core_a, SERIES["A"])]
    fig = go.Figure()
    unit = f"{ra.unit}/década"
    for label, core, color in rows:
        s, (lo, hi) = core.sen_slope * 10, (core.sen_ci[0] * 10, core.sen_ci[1] * 10)
        fig.add_trace(go.Scatter(
            x=[s], y=[label], mode="markers", name=label, showlegend=False,
            marker=dict(size=11, color=color, line=dict(color=SURFACE, width=2)),
            error_x=dict(type="data", symmetric=False, array=[hi - s], arrayminus=[s - lo], color=color,
                         thickness=2, width=5),
            hovertemplate=f"{label}<br>{s:+.3g} {unit} (IC 95 %: {lo:+.3g} a {hi:+.3g})"
                          f"<br>p = {core.primary.p_value:.3g}<extra></extra>",
        ))
    fig.add_vline(x=0, line=dict(color=MUTED, width=1))
    fig = _base(fig, "Pendiente por década con intervalo de confianza del 95 %", "", ra.is_synthetic,
                height=250, x_title=f"Pendiente [{unit}]")
    fig.update_layout(hovermode="closest", margin=dict(l=10))
    fig.update_yaxes(automargin=True, showgrid=False, tickfont=dict(color=INK_2))
    return fig


def difference_figure(cmp: ComparisonResult, unit: str, synthetic: bool) -> go.Figure:
    d = cmp.diff
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=d.years, y=d.values, mode="lines+markers", name="A − B",
                             line=dict(color=SERIES["diff"], width=1.2),
                             marker=dict(size=8, color=SERIES["diff"], line=dict(color=SURFACE, width=2)),
                             hovertemplate="%{x}: %{y:.3g} " + unit + "<extra></extra>"))
    fig.add_trace(go.Scatter(x=d.years, y=d.sen_intercept + d.sen_slope * d.years, mode="lines",
                             name="Sen de A − B", line=dict(color=INK, width=2)))
    return _base(fig, "Serie de diferencias A − B (base de la prueba formal)", f"A − B [{unit}]", synthetic, height=320)


def sensitivity_figure(table: pd.DataFrame, res: TrendResult, slot: str = "A") -> go.Figure:
    color = SERIES[slot]
    unit = f"{res.unit}/década"
    fig = go.Figure()
    if len(table):
        x = table["start_year"].to_numpy()
        fig.add_trace(go.Scatter(x=np.r_[x, x[::-1]], y=np.r_[table["ci_high"], table["ci_low"][::-1]], fill="toself",
                                 fillcolor=_rgba(color, 0.16), line=dict(width=0), hoverinfo="skip", name="IC 95 %"))
        fig.add_trace(go.Scatter(x=x, y=table["slope_decade"], mode="lines+markers", name="Pendiente de Sen",
                                 line=dict(color=color, width=2), marker=dict(size=8, color=color),
                                 customdata=np.c_[table["n"], table["p_value"]],
                                 hovertemplate="Inicio %{x} (n=%{customdata[0]}): %{y:+.3g} " + unit
                                               + ", p=%{customdata[1]:.3g}<extra></extra>"))
        fig.add_hline(y=0, line=dict(color=INK_2, width=1))
    return _base(fig, f"Sensibilidad: pendiente según el año inicial (final fijo en {int(res.core.years.max()) if res.n else '—'})",
                 f"Pendiente [{unit}]", res.is_synthetic, height=320, x_title="Año inicial del análisis")


def map_figure(points: list[tuple[str, float, float, str]]) -> go.Figure:
    """Mapa de contexto de los puntos solicitados (no es un mapa de tendencias)."""
    fig = go.Figure()
    for slot, lat, lon, name in points:
        fig.add_trace(go.Scattergeo(lat=[lat], lon=[lon], mode="markers+text", text=[f" {slot} · {name}"],
                                    textposition="middle right", textfont=dict(color=INK, size=12),
                                    marker=dict(size=12, color=SERIES[slot], line=dict(color=SURFACE, width=2)),
                                    name=f"{slot} · {name}",
                                    hovertemplate=f"{slot} · {name}<br>{lat:.2f}°, {lon:.2f}°<extra></extra>"))
    fig.update_geos(projection_type="natural earth", showcountries=True, countrycolor=AXIS, showcoastlines=True,
                    coastlinecolor=AXIS, showland=True, landcolor="#16263A", showocean=True, oceancolor=SURFACE,
                    bgcolor=SURFACE, showframe=False)
    fig.update_layout(height=300, margin=dict(l=0, r=0, t=10, b=0), paper_bgcolor=SURFACE, showlegend=False,
                      font=dict(family=FONT, color=INK_2))
    return fig


def rejection_figure(df: pd.DataFrame) -> go.Figure:
    alpha = float(df["alpha"].iloc[0])
    fig = go.Figure(go.Bar(x=df["tasa_rechazo"] * 100, y=df["prueba"], orientation="h",
                           marker=dict(color=SERIES["A"], cornerradius=4),
                           text=[f"{v:.1%}" for v in df["tasa_rechazo"]], textposition="outside",
                           textfont=dict(color=INK), hovertemplate="%{y}: %{x:.1f} %<extra></extra>"))
    fig.add_vline(x=alpha * 100, line=dict(color="#fab219", width=1.5),
                  annotation_text=f"α = {alpha:.0%} (ideal)", annotation_font_color=INK_2)
    fig = _base(fig, f"Tasa de rechazo con pendiente verdadera = 0 (φ = {df['phi'].iloc[0]}, n = {df['n_anios'].iloc[0]} años, "
                     f"{df['simulaciones'].iloc[0]} simulaciones)", "", False, height=320,
                x_title="% de simulaciones con p < α (falsos positivos)")
    fig.update_layout(hovermode="closest", bargap=0.35)
    fig.update_yaxes(automargin=True, showgrid=False)
    return fig
