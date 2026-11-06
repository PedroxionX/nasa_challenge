"""Las cuatro pantallas: Laboratorio → Análisis → Comparación → Métodos y fuentes.

Modo Operate (Impeccable): cada pantalla responde UNA pregunta arriba, con su cifra principal;
el detalle (métodos, diagnósticos, procedencia) queda detrás de desplegables.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import streamlit as st

from .. import viz
from ..config import POWER_GRID_DESCRIPTION
from ..data.synthetic import SCENARIOS, scenario_seed
from ..explain import VERDICT_ES, explain_comparison, explain_trend, fnum, fp, headline
from ..export import annual_table, results_table, to_csv_bytes
from ..stats.engine import TrendResult, evidence_label, start_year_sensitivity
from ..stats.experiments import rejection_rates
from .state import AnalysisContext, get_ctx
from .theme import banner, esc, kv, site_tag

PAGES: dict[str, object] = {}


# ---------------------------------------------------------------------------------------------
# Piezas comunes
# ---------------------------------------------------------------------------------------------
def _short_label(spec) -> str:
    if spec.kind == "synthetic":
        return SCENARIOS[spec.scenario].name_es
    return spec.location().name


def page_header(title: str, ctx: AnalysisContext, lead: str | None = None) -> None:
    cfg = ctx.cfg
    st.markdown(f'<div class="tl-title">{esc(title)}</div>', unsafe_allow_html=True)
    context = (f"{cfg.variable.short_es} · A: {_short_label(cfg.site_a)} · B: {_short_label(cfg.site_b)} · "
               f"{cfg.start}–{cfg.end}")
    st.markdown(f'<div class="tl-context">{esc(context)}</div>', unsafe_allow_html=True)
    if lead:
        st.markdown(f'<div class="tl-lead">{esc(lead)}</div>', unsafe_allow_html=True)
    if cfg.mode == "csv":
        src = cfg.site_a.csv.source_name if cfg.site_a.csv else ""
        banner("csv_synthetic" if cfg.data_is_synthetic else "csv", src)
    else:
        banner("synthetic" if cfg.synthetic else "power")


def show_errors(ctx: AnalysisContext) -> bool:
    """Muestra lo que falta y los errores de datos. Devuelve True si se puede continuar."""
    pending = list(dict.fromkeys(ctx.pending.values()))  # sin repetir el mismo aviso para A y B
    missing = [s for s, m in ctx.pending.items() if m == "upload"]
    if missing:
        who = "de los sitios A y B" if len(missing) == 2 else f"del sitio {missing[0]}"
        st.info(f"Sube el archivo CSV {who} en el panel lateral.", icon=":material/upload_file:")
        st.caption("Una fila por mes con fecha y valor. ¿Sin archivo a mano? En «Formato del archivo» hay un CSV de "
                   "ejemplo para probar.")
    for msg in pending:
        if msg != "upload":
            st.info(msg, icon=":material/upload_file:")
    for slot, msg in ctx.errors.items():
        st.error(f"**Sitio {slot}:** {msg}", icon=":material/cloud_off:")
        det = ctx.error_details.get(slot)
        if det:
            with st.expander(f"Detalle técnico del error (sitio {slot})"):
                st.code(det)
    if ctx.errors:
        st.caption("No se sustituyó nada por datos sintéticos. Reintenta, elige otra ubicación o cambia de fuente "
                   "en el panel lateral.")
    return not ctx.errors and not ctx.pending


def alerts(res: TrendResult) -> None:
    """Solo lo que cambia la lectura del resultado. Las notas informativas van en el detalle."""
    for w in res.warnings:
        if w.level == "critical":
            st.error(w.message, icon=":material/block:")
        elif w.level == "warning":
            st.warning(w.message, icon=":material/warning:")


def action_row(link: str | None, exports: list[tuple[str, bytes, str]]) -> None:
    """Siguiente paso (uno solo) y exportación, alineados en una fila."""
    row = st.container(horizontal=True, vertical_alignment="center", gap="medium")
    if exports:
        with row.popover("Exportar CSV", icon=":material/download:"):
            for label, data, fname in exports:
                st.download_button(label, data, file_name=fname, mime="text/csv", key=f"dl_{fname}")
    if link and link in PAGES:
        page, label, icon = PAGES[link]
        row.page_link(page, label=label, icon=icon)


def site_picker(ctx: AnalysisContext, key: str) -> str:
    names = {s: ctx.results[s].location.name for s in ("A", "B")}
    return st.segmented_control("Sitio", ["A", "B"], default="A", required=True, key=key,
                                format_func=lambda s: f"{s} · {names[s]}", label_visibility="collapsed")


# ---------------------------------------------------------------------------------------------
# Pantalla 1 — Laboratorio
# ---------------------------------------------------------------------------------------------
def _source_label(r: TrendResult) -> str:
    p = r.provenance
    if p.origin == "synthetic":
        return f"Sintético · semilla {p.seed}"
    if p.origin == "csv":
        return f"CSV · {p.extra.get('filename') or 'archivo'}"
    return "NASA POWER · " + ("caché local" if p.from_cache else "descarga directa")


def lab() -> None:
    ctx = get_ctx()
    cfg = ctx.cfg
    var = cfg.variable
    page_header("Laboratorio", ctx, lead=cfg.question())
    if not show_errors(ctx):
        return

    st.subheader("Datos")
    rows = []
    for slot in ("A", "B"):
        r = ctx.results[slot]
        rep = r.processing
        rows.append({"Sitio": f"{slot} · {r.location.name}", "Fuente": _source_label(r),
                     "Meses válidos": f"{rep.n_months_valid} de {rep.n_months_expected}",
                     "Años completos": len(rep.complete_years),
                     "Años excluidos": ", ".join(map(str, sorted(rep.incomplete_years))) or "ninguno"})
    st.dataframe(pd.DataFrame(rows), hide_index=True)
    agg = ("promedio anual ponderado por días" if var.aggregation == "mean"
           else "total anual (tasa × días de cada mes, bisiestos incluidos)")
    st.caption(f"{var.name_es}: llega en {var.native_unit} y se analiza como {agg}, en {var.annual_unit}. "
               "Un año solo cuenta si tiene sus 12 meses; nada se rellena ni se interpola.")

    st.subheader("Serie mensual")
    slot = site_picker(ctx, "lab_site")
    st.plotly_chart(viz.monthly_figure(ctx.results[slot], slot), key=f"monthly_{slot}")

    with st.expander("Procedencia y procesamiento"):
        for s in ("A", "B"):
            _provenance_block(ctx.results[s], s)
    with st.expander("Ubicaciones"):
        _locations_block(cfg)
    action_row("analysis", [])


def _provenance_block(r: TrendResult, slot: str) -> None:
    p, rep = r.provenance, r.processing
    st.markdown(site_tag(slot, r.location.name), unsafe_allow_html=True)
    rows = [("Fuente", p.source), ("Producto", p.product),
            ("Consultado (UTC)", p.retrieved_at_utc + (" · desde caché local" if p.from_cache else ""))]
    if p.api_version:
        rows.append(("Versión de la API", p.api_version))
    if p.grid_cell:
        elev = p.grid_cell.get("elevation_m")
        rows.append(("Punto solicitado", f"{p.grid_cell['lat']}, {p.grid_cell['lon']}"
                     + (f" · elevación reportada {elev} m" if elev is not None else "")))
    if p.seed is not None:
        rows.append(("Semilla", str(p.seed)))
    if p.origin == "csv":
        ex = p.extra
        rows += [("Archivo", ex.get("filename") or "—"),
                 ("Columnas", f"{ex.get('date_column')} → {ex.get('value_column')} ({ex.get('n_rows')} filas)"),
                 ("Unidad declarada", ex.get("declared_unit") or "—"),
                 ("Resolución espacial declarada", ex.get("spatial_resolution") or "—")]
    rows.append(("Conversión", rep.conversion_note))
    st.markdown(kv(rows), unsafe_allow_html=True)
    for n in rep.notes:
        st.caption(n)
    if p.request_url:
        st.code(p.request_url, language=None)


def _locations_block(cfg) -> None:
    if cfg.synthetic:
        st.markdown("Los sitios sintéticos no tienen coordenadas, para que nunca se confundan con lugares reales.")
        for spec in (cfg.site_a, cfg.site_b):
            sc = SCENARIOS[spec.scenario]
            st.markdown(site_tag(spec.slot, sc.name_es), unsafe_allow_html=True)
            st.caption(sc.description_es)
        return
    pts = []
    for spec in (cfg.site_a, cfg.site_b):
        loc = spec.location()
        if math.isfinite(loc.lat) and math.isfinite(loc.lon):
            pts.append((spec.slot, loc.lat, loc.lon, loc.name))
    if not pts:
        st.caption("Los archivos CSV no declaran coordenadas.")
        return
    st.plotly_chart(viz.map_figure(pts), config={"displayModeBar": False}, key="map")
    note = (f"Cada punto se resuelve a una celda de {POWER_GRID_DESCRIPTION}." if cfg.mode == "power"
            else "Coordenadas declaradas por quien subió los archivos.")
    st.caption("Mapa de contexto, no de tendencias. " + note)


# ---------------------------------------------------------------------------------------------
# Pantalla 2 — Análisis
# ---------------------------------------------------------------------------------------------
def _summary_table(ctx: AnalysisContext) -> pd.DataFrame:
    rows = []
    for slot in ("A", "B"):
        r = ctx.results[slot]
        lo, hi = r.ci_per_decade
        rows.append({"Sitio": f"{slot} · {r.location.name}", "Tendencia": VERDICT_ES[r.verdict].capitalize(),
                     f"Pendiente ({r.unit}/década)": fnum(r.slope_per_decade),
                     "IC 95 %": f"{fnum(lo, ref=r.slope_per_decade)} a {fnum(hi, ref=r.slope_per_decade)}",
                     "Valor p": fp(r.p_value).replace("p = ", "").replace("p < ", "< "), "Años": r.n})
    return pd.DataFrame(rows)


def _facts(r: TrendResult) -> str:
    lo, hi = r.ci_per_decade
    span = r.analyzed_span
    parts = [f"IC 95 %: {fnum(lo, ref=r.slope_per_decade)} a {fnum(hi, ref=r.slope_per_decade)}"]
    if span:
        parts.append(f"cambio neto ≈ {fnum(r.total_change)} {r.unit} ({span[0]}–{span[1]})")
    parts.append(f"{fp(r.p_value)} · {evidence_label(r.p_value, r.core.alpha)}")
    parts.append(f"{r.n} años completos")
    return " · ".join(parts)


def _site_detail(r: TrendResult, slot: str, cfg) -> None:
    st.markdown(f'<div class="tl-verdict">{esc(headline(r))}</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="tl-facts">{esc(_facts(r))}</div>', unsafe_allow_html=True)
    alerts(r)

    show_anom = st.toggle("Mostrar como anomalías", key=f"anom_{slot}",
                          help=f"Diferencia respecto a la media de {cfg.reference[0]}–{cfg.reference[1]}.")
    fig, note = viz.annual_trend_figure(r, slot, show_anom, cfg.reference)
    st.plotly_chart(fig, key=f"annual_{slot}")
    if note:
        st.caption(note)

    ex = explain_trend(r)
    st.markdown(ex["interpretacion"])
    if ex["verdad_sintetica"]:
        st.markdown(ex["verdad_sintetica"])
    st.markdown("**Qué no permite concluir**")
    st.markdown("\n".join(f"- {s}" for s in ex["no_concluir"]))

    with st.expander("Métodos y diagnósticos"):
        st.markdown(ex["resumen"])
        if ex["incertidumbre"]:
            st.markdown(ex["incertidumbre"])
        for w in r.warnings:
            if w.level == "info" and w.code != "synthetic":
                st.caption(w.message)
        st.dataframe(_stats_table(r), hide_index=True)
        st.caption("La prueba principal sostiene el veredicto; las demás se muestran por transparencia. "
                   "Que discrepen es información, no un error.")
    with st.expander("Sensibilidad al año inicial"):
        tab = start_year_sensitivity(r)
        st.plotly_chart(viz.sensitivity_figure(tab, r, slot), key=f"sens_{slot}")
        if len(tab):
            signs = set(np.sign(tab["slope_decade"].round(12)))
            st.caption("El signo de la pendiente no cambia con el año inicial." if len(signs) == 1 else
                       "El signo de la pendiente cambia según el año inicial: la conclusión depende del período.")
    with st.expander("Serie mensual"):
        st.plotly_chart(viz.monthly_figure(r, slot), key=f"monthly_detail_{slot}")


def _stats_table(r: TrendResult) -> pd.DataFrame:
    c, o = r.core, r.core.ols
    u = f"{r.unit}/déc."
    rows = [
        ("Theil-Sen (pendiente)", f"{fnum(c.sen_slope * 10)} {u}",
         f"IC 95 % corregido: {fnum(c.sen_ci[0] * 10)} a {fnum(c.sen_ci[1] * 10)}; "
         f"suponiendo independencia: {fnum(c.sen_ci_independent[0] * 10)} a {fnum(c.sen_ci_independent[1] * 10)}"),
        (f"{c.primary.test_name} (principal)", fp(c.primary.p_value),
         f"S = {c.primary.s:.0f}, Var*(S) = {c.primary.var_s:.1f}, Z = {c.primary.z:.2f}, "
         f"factor = {c.primary.correction_factor:.2f}; {c.primary.note}"),
        ("Mann-Kendall original", fp(c.mk.p_value),
         f"S = {c.mk.s:.0f}, Var(S) = {c.mk.var_s:.1f}, Z = {c.mk.z:.2f}, τ = {c.mk.tau:.3f}. Supone independencia."),
        ("Mann-Kendall Hamed-Rao (3 lags)", fp(c.mk_hr.p_value),
         f"lags significativos: {c.mk_hr.significant_lags or 'ninguno'}, factor n/n* = {c.mk_hr.correction_factor:.2f}"),
    ]
    if o is not None and not o.constant_series:
        rows += [
            ("MCO (supone independencia)", fp(o.p_value),
             f"{fnum(o.slope * 10)} {u}, IC {fnum(o.ci_low * 10)} a {fnum(o.ci_high * 10)}, R² = {o.r_squared:.3f}"),
            ("MCO ajustado (Santer et al. 2000)", fp(o.adj_p_value) if o.adj_valid else "no aplicable",
             f"r1 residuos = {o.r1_residuals:.2f}, n efectivo = {o.n_eff:.1f}"
             + (f", IC {fnum(o.adj_ci_low * 10)} a {fnum(o.adj_ci_high * 10)}" if o.adj_valid else "")),
        ]
    if r.seasonal is not None:
        s = r.seasonal
        rows.append(("Seasonal Mann-Kendall (mensual)", fp(s.p_value) if s.valid else "no evaluable",
                     f"pendiente estacional de Sen = {fnum(s.slope_per_year * 10)} {r.variable.monthly_unit}/déc. "
                     f"por mes; {s.n_seasons} meses × {s.n_years} años. Supone independencia entre meses."))
    if r.step is not None:
        rows.append(("Escalón vs. recta (BIC)", f"ΔBIC = {r.step.delta_bic:+.1f}",
                     f"mejor escalón en {r.step.change_year}, salto {fnum(r.step.shift)} {r.unit}; "
                     + ("favorece el escalón" if r.step.favors_step else "no favorece el escalón (umbral 6)")))
    if math.isfinite(r.detectability_years):
        rows.append(("Detectabilidad (Weatherhead 1998)", f"≈ {r.detectability_years:.0f} años",
                     "años necesarios para detectar esta pendiente con ~90 % de probabilidad"))
    return pd.DataFrame(rows, columns=["Método", "Resultado", "Detalle"])


def analysis() -> None:
    ctx = get_ctx()
    page_header("Análisis", ctx)
    if not show_errors(ctx):
        return
    st.dataframe(_summary_table(ctx), hide_index=True)
    st.write("")
    slot = site_picker(ctx, "analysis_site")
    _site_detail(ctx.results[slot], slot, ctx.cfg)
    action_row("compare", [
        ("Resultados de A, B y A − B", to_csv_bytes(results_table(ctx.results, ctx.comparison)),
         "trendlens_resultados.csv"),
        ("Series anuales", to_csv_bytes(annual_table(ctx.results)), "trendlens_series_anuales.csv"),
    ])


# ---------------------------------------------------------------------------------------------
# Pantalla 3 — Comparación (Opposite Trends Explorer)
# ---------------------------------------------------------------------------------------------
def compare() -> None:
    ctx = get_ctx()
    page_header("Opposite Trends Explorer", ctx)
    if not show_errors(ctx):
        return
    ra, rb, cmp = ctx.results["A"], ctx.results["B"], ctx.comparison

    st.markdown(f'<div class="tl-pattern">{esc(cmp.pattern_title)}</div>', unsafe_allow_html=True)
    if cmp.differ_significantly is not None:
        p = fp(cmp.diff.primary.p_value)
        sub = (f"Las pendientes difieren de forma estadísticamente significativa (prueba sobre A − B, {p})."
               if cmp.differ_significantly else
               f"No hay evidencia suficiente de que las pendientes difieran (prueba sobre A − B, {p}).")
        st.markdown(f'<div class="tl-sub">{esc(sub)}</div>', unsafe_allow_html=True)

    failed = [c for c in cmp.checks if not c.ok]
    if failed:
        st.warning("No comparables: " + "; ".join(f"{c.label.lower()} ({c.detail})" for c in failed) + ".",
                   icon=":material/warning:")
    if cmp.core_a is None:
        for p in explain_comparison(cmp, ra, rb)[1:]:
            st.markdown(p)
        return

    st.plotly_chart(viz.forest_figure(cmp, ra, rb), key="forest", config={"displayModeBar": False})
    use_anom = st.toggle("Comparar como anomalías", value=True, key="cmp_anom",
                         help="Pone ambos lugares en la misma escala aunque sus climas sean muy distintos.")
    fig, note = viz.comparison_figure(ra, rb, cmp, use_anom, ctx.cfg.reference)
    st.plotly_chart(fig, key="cmp_series")
    if note:
        st.caption(note)

    paragraphs = [p for p in explain_comparison(cmp, ra, rb)[1:] if not p.startswith("DATOS SINTÉTICOS")]
    disclaimer = [p for p in paragraphs if p.startswith("Que dos lugares")]
    for p in paragraphs:
        if p not in disclaimer:
            st.markdown(p)
    for p in disclaimer:
        st.caption(p)

    with st.expander("Comprobaciones de comparabilidad"):
        for ch in cmp.checks:
            icon = ":material/check:" if ch.ok else ":material/close:"
            st.markdown(f"{icon} **{ch.label}** — {ch.detail}")
    with st.expander("Detalle técnico de la comparación"):
        st.plotly_chart(viz.difference_figure(cmp, ra.unit, ra.is_synthetic), key="diff_series")
        d = cmp.diff
        rows = [
            ("Años comunes", f"{cmp.n_common} ({cmp.common_years[0]}–{cmp.common_years[-1]})"),
            ("Sen de A − B", f"{fnum(d.sen_slope * 10)} {ra.unit}/déc. (IC {fnum(d.sen_ci[0] * 10)} a {fnum(d.sen_ci[1] * 10)})"),
            (f"{d.primary.test_name} sobre A − B", fp(d.primary.p_value)),
            ("MCO de A − B (= β_A − β_B)", f"{fnum(d.ols.slope * 10)} {ra.unit}/déc., p ajustado "
             + (fp(d.ols.adj_p_value) if d.ols.adj_valid else fp(d.ols.p_value))),
            ("Referencia: prueba z suponiendo sitios independientes", fp(cmp.independent_p)),
            ("Correlación de las variaciones interanuales (residuos)", f"r = {cmp.residual_corr:.2f}"
             if np.isfinite(cmp.residual_corr) else "—"),
        ]
        st.dataframe(pd.DataFrame(rows, columns=["Cantidad", "Valor"]), hide_index=True)
        st.caption("La prueba z que supone independencia es solo un contraste: si los lugares están correlacionados, "
                   "su valor p no es fiable.")
    action_row(None, [("Comparación A, B y A − B", to_csv_bytes(results_table(ctx.results, cmp)),
                       "trendlens_comparacion.csv")])


# ---------------------------------------------------------------------------------------------
# Pantalla 4 — Métodos y fuentes (modo Read: pestañas en lugar de un muro de texto)
# ---------------------------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def _rejection(phi: float, n: int, sims: int) -> pd.DataFrame:
    return rejection_rates(phi, n_years=n, n_sims=sims)


GLOSSARY = {
    "Tendencia": "Cambio sistemático y sostenido de una variable a lo largo del tiempo. Aquí: monótona (Mann-Kendall) y lineal (pendientes).",
    "Pendiente de Theil-Sen": "Mediana de las pendientes entre todos los pares de años. Poco sensible a valores extremos.",
    "Prueba de Mann-Kendall": "¿Los valores tienden a ser mayores (o menores) en años posteriores? Cuenta pares concordantes y discordantes. No supone normalidad.",
    "Valor p": "Probabilidad de obtener un patrón al menos tan marcado si NO hubiera tendencia (y se cumplieran los supuestos). No es la probabilidad de que la tendencia sea real.",
    "Intervalo de confianza 95 %": "Rango de pendientes compatibles con los datos. Si incluye el cero, ni el signo es seguro.",
    "Significancia vs. magnitud": "Una tendencia pequeña puede ser muy significativa (series largas y poco ruidosas) y una grande puede no serlo (series cortas o ruidosas).",
    "Autocorrelación": "Los años vecinos se parecen (p. ej. por ENSO o PDO). Reduce la información independiente: n efectivo < n.",
    "Anomalía": "Diferencia respecto a la media de un período de referencia (1991–2020). Permite comparar climas distintos; no cambia la pendiente.",
    "Punto de cuadrícula": f"NASA POWER entrega el valor de una celda del reanálisis ({POWER_GRID_DESCRIPTION}), no de una estación ni de un municipio.",
    "Reanálisis (MERRA-2)": "Reconstrucción del estado de la atmósfera que combina un modelo con observaciones asimiladas. No es una medición directa en el punto.",
    "Detectabilidad": "Años de datos necesarios para detectar, con ~90 % de probabilidad, una tendencia de cierta magnitud dada la variabilidad (Weatherhead et al., 1998).",
}

METHOD_TABLE = """
| Paso | Qué hace el laboratorio | Por qué |
|---|---|---|
| Datos | Serie mensual por punto (NASA POWER, MERRA-2, ½° × ⅝°), escenario sintético con semilla o CSV declarado | Una fuente por análisis, con procedencia |
| Procesamiento | Ordena, elimina duplicados idénticos (los contradictorios son error), convierte −999 a faltante, valida unidades y rango físico | Ningún dato dudoso entra en silencio |
| Unidades | Precipitación: mm/día × días reales del mes → mm/mes → mm/año | Una tasa no se suma; un acumulado sí |
| Agregación | Año = 12 meses válidos. Temperatura: promedio ponderado por días. Años incompletos: excluidos | Elimina el ciclo estacional sin modelarlo |
| Magnitud | Pendiente de Theil-Sen sobre años reales + MCO de referencia | Robusta a atípicos; unidades físicas por década |
| Evidencia | Mann-Kendall con corrección AR(1) del tamaño efectivo de muestra | Sin corrección hay demasiados falsos positivos |
| Diagnósticos | Hamed-Rao, Seasonal MK, ajuste de Santer, escalón vs. recta, sensibilidad, detectabilidad | Comprobar si la conclusión es robusta |
| Comparación | Prueba sobre la serie de diferencias A − B en los años comunes | Signos opuestos ≠ tendencias distintas |
| Interpretación | Plantillas deterministas con las cifras calculadas | Nada de texto sin respaldo numérico |
"""


def methods() -> None:
    ctx = get_ctx()
    page_header("Métodos y fuentes", ctx)
    t_prov, t_method, t_mc, t_gloss, t_scen, t_lim = st.tabs(
        ["Procedencia", "Método", "Falsos positivos", "Glosario", "Escenarios sintéticos", "Limitaciones"])

    with t_prov:
        show_errors(ctx)
        if ctx.results:
            rows = []
            for slot, r in ctx.results.items():
                p = r.provenance
                origin = {"synthetic": "Sintético", "nasa_power": "NASA POWER", "csv": "CSV"}.get(p.origin, p.origin)
                rows.append({"Sitio": slot, "Ubicación": r.location.name, "Origen": origin,
                             "¿Sintético?": "sí" if p.is_synthetic else "no", "Fuente": p.source,
                             "Producto": p.product, "Consultado (UTC)": p.retrieved_at_utc,
                             "Caché": "sí" if p.from_cache else "no", "API": p.api_version or "—",
                             "Semilla": p.seed if p.seed is not None else "—",
                             "Archivo": p.extra.get("filename") or "—", "URL": p.request_url or "—"})
            st.dataframe(pd.DataFrame(rows), hide_index=True)
        st.caption("Material de práctica previo a NASA Space Apps 2026 (14–15 nov). No es la solución competitiva.")

    with t_method:
        st.markdown(METHOD_TABLE)

    with t_mc:
        st.markdown("Series simuladas **sin tendencia** con ruido AR(1). Una prueba bien calibrada declara tendencia "
                    "en ≈ α (5 %) de los casos. Este experimento decidió la prueba principal.")
        e1, e2, e3 = st.columns(3)
        phi = e1.select_slider("Autocorrelación φ", [0.0, 0.25, 0.5, 0.75, 0.9], value=0.5, key="mc_phi")
        n = e2.select_slider("Años por serie", [20, 30, 45, 60], value=45, key="mc_n")
        sims = e3.select_slider("Simulaciones", [200, 500, 1000], value=200, key="mc_sims")
        with st.spinner("Simulando…"):
            df = _rejection(float(phi), int(n), int(sims))
        st.plotly_chart(viz.rejection_figure(df), key="mc_fig", config={"displayModeBar": False})
        st.caption(f"Semilla 20261114 (reproducible). Con {sims} simulaciones, el error de Monte Carlo de una tasa del "
                   f"5 % es ≈ ±{1.96 * np.sqrt(0.05 * 0.95 / sims):.1%}.")

    with t_gloss:
        for k, v in GLOSSARY.items():
            st.markdown(f"**{k}.** {v}")

    with t_scen:
        st.dataframe(pd.DataFrame([{
            "Escenario": s.name_es,
            "Pendiente real T2M (°C/déc.)": s.temp_trend_per_decade,
            "Pendiente real precip. (mm/año/déc.)": s.precip_trend_per_decade,
            "Semilla T2M": scenario_seed(s, "T2M"), "Semilla precip.": scenario_seed(s, "PRECTOTCORR"),
            "φ AR(1)": s.ar1_phi, "Faltantes": f"{s.missing_fraction:.0%}" + (" + hueco" if s.gap_block else ""),
            "Descripción": s.description_es,
        } for s in SCENARIOS.values()]), hide_index=True)

    with t_lim:
        st.markdown("""
- Las pendientes describen el período elegido; **no son pronósticos** ni identifican causas.
- Ninguna corrección de autocorrelación es perfecta con series cortas y persistencia fuerte (ver «Falsos positivos»).
- Seasonal Mann-Kendall supone independencia entre meses; es diagnóstico, no base del veredicto.
- MERRA-2 es un reanálisis: en relieve complejo o costas, una celda de ~50 km puede diferir mucho de una estación.
- Los CSV llevan la procedencia que declara quien los sube; el laboratorio no puede verificarla.
- La comparación A − B no corrige por comparaciones múltiples si se prueban muchos pares de lugares.
- Detalles en `SCIENTIFIC_METHOD.md`, `DATA_SOURCES.md` y `LIMITATIONS.md`.
""")
