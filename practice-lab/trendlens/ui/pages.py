"""Las cuatro pantallas: Laboratorio → Análisis → Comparación → Métodos y fuentes."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import streamlit as st

from .. import viz
from ..config import MIN_YEARS_FOR_TEST, POWER_GRID_DESCRIPTION, RECOMMENDED_MIN_YEARS
from ..data.synthetic import SCENARIOS, scenario_seed
from ..explain import VERDICT_ES, explain_comparison, explain_trend, fnum, fp, headline
from ..export import annual_table, results_table, to_csv_bytes
from ..stats.engine import TrendResult, evidence_label, start_year_sensitivity
from ..stats.experiments import rejection_rates
from .state import AnalysisContext, get_ctx
from .theme import banner, esc, kv, site_tag

PIPELINE = ["Variable", "Ubicación", "Datos", "Procesamiento", "Análisis", "Evidencia", "Interpretación"]
VERDICT_ICON = {"increasing": "↗", "decreasing": "↘", "inconclusive": "≈", "insufficient": "∅"}
PAGES: dict[str, object] = {}


# ---------------------------------------------------------------------------------------------
# Piezas comunes
# ---------------------------------------------------------------------------------------------
def header(title: str, subtitle: str, ctx: AnalysisContext, active: int) -> None:
    st.markdown(f'<div class="tl-hero"><div class="kicker">TrendLens Lab · laboratorio de práctica</div>'
                f'<h1>{esc(title)}</h1><p>{esc(subtitle)}</p></div>', unsafe_allow_html=True)
    st.markdown(f'<div class="tl-question"><div class="lbl">Pregunta científica</div>{esc(ctx.cfg.question())}</div>',
                unsafe_allow_html=True)
    data_ok = ctx.ok
    chips = []
    for i, name in enumerate(PIPELINE):
        cls = "done" if (i < 2 or data_ok) and i <= active else ""
        if i == 2 and ctx.errors:
            cls = "fail"
        chips.append(f'<span class="tl-step {cls}">{i + 1}. {name}</span>')
    st.markdown('<div class="tl-steps">' + '<span class="tl-arrow">→</span>'.join(chips) + "</div>",
                unsafe_allow_html=True)
    cfg = ctx.cfg
    if cfg.mode == "csv":
        src = cfg.site_a.csv.source_name if cfg.site_a.csv else ""
        banner("csv_synthetic" if cfg.data_is_synthetic else "csv", src)
    else:
        banner("synthetic" if cfg.synthetic else "power")


def show_errors(ctx: AnalysisContext) -> bool:
    """Muestra lo que falta y los errores de datos. Devuelve True si se puede continuar."""
    for slot, msg in ctx.pending.items():
        st.info(msg, icon=":material/upload_file:")
    for slot, msg in ctx.errors.items():
        st.error(f"**Sitio {slot}:** {msg}", icon=":material/cloud_off:")
        det = ctx.error_details.get(slot)
        if det:
            with st.expander(f"Detalle técnico del error (sitio {slot})"):
                st.code(det)
    if ctx.errors:
        st.info("No se sustituyó nada por datos sintéticos. Puedes reintentar, elegir otra ubicación o cambiar "
                "**tú** al modo sintético en el panel lateral.", icon=":material/info:")
    return not ctx.errors and not ctx.pending


def warnings_block(res: TrendResult) -> None:
    for w in res.warnings:
        if w.code == "synthetic":
            continue
        if w.level == "critical":
            st.error(w.message, icon=":material/block:")
        elif w.level == "warning":
            st.warning(w.message, icon=":material/warning:")
        else:
            st.info(w.message, icon=":material/info:")


def verdict_badge(res: TrendResult) -> None:
    v = res.verdict
    color = "blue" if v in ("increasing", "decreasing") else "gray"
    st.badge(f"{VERDICT_ICON[v]} {VERDICT_ES[v].capitalize()}", color=color)


def page_links(*names: str) -> None:
    names = tuple(n for n in names if n in PAGES)  # sin navegación registrada (p. ej. en pruebas) no hay enlaces
    if not names:
        return
    cols = st.columns(len(names))
    for c, n in zip(cols, names):
        page, label, icon = PAGES[n]
        c.page_link(page, label=label, icon=icon)


def footer() -> None:
    st.markdown('<div class="tl-foot">Material de entrenamiento previo al hackathon NASA Space Apps 2026 '
                '(14–15 nov). No es la solución que se presentará a competencia. Los datos sintéticos están '
                'marcados como tales; los datos reales provienen de la API pública de NASA POWER.</div>',
                unsafe_allow_html=True)


def _csv_variable_note(var) -> str:
    return (f"Serie mensual cargada desde CSV. Debe medir {var.name_es.lower()} en {var.native_unit}"
            + (" (tasa media diaria de cada mes)" if var.aggregation == "sum_from_rate" else "")
            + "; el laboratorio aplica las mismas reglas de limpieza y agregación que a NASA POWER.")


def _product_label(cfg) -> str:
    if cfg.synthetic:
        return "generador sintético"
    if cfg.mode == "csv":
        c = cfg.site_a.csv
        if not (c and c.source_name):
            return "no declarado"
        return c.source_name + (f" · {c.product}" if c.product else "")
    return cfg.variable.product


def _csv_sites_card(cfg) -> None:
    st.markdown("Series cargadas por el usuario. Las coordenadas son **opcionales** y solo sirven de contexto.")
    pts = []
    for spec in (cfg.site_a, cfg.site_b):
        loc = spec.location()
        fname = spec.csv.filename if spec.csv else "sin archivo"
        st.markdown(site_tag(spec.slot, loc.name), unsafe_allow_html=True)
        st.caption(f"Archivo: {fname}")
        if math.isfinite(loc.lat) and math.isfinite(loc.lon):
            pts.append((spec.slot, loc.lat, loc.lon, loc.name))
    if pts:
        st.plotly_chart(viz.map_figure(pts), config={"displayModeBar": False}, key="map_csv")
        st.caption("Mapa de contexto con las coordenadas declaradas; no es un mapa de tendencias.")


# ---------------------------------------------------------------------------------------------
# Pantalla 1 — Laboratorio
# ---------------------------------------------------------------------------------------------
def lab() -> None:
    ctx = get_ctx()
    cfg = ctx.cfg
    header("Explorando los cambios ocultos de la Tierra",
           "Elige una variable, dos lugares y un período en el panel lateral. Cada paso alimenta la pregunta.",
           ctx, active=3)

    var = cfg.variable
    c1, c2 = st.columns([1.1, 1])
    with c1:
        st.markdown(
            f'<div class="tl-card"><h4>Paso 1 · Variable: {esc(var.name_es)} ({esc(var.code)})</h4>'
            f'<div class="sub">{esc(var.description_es if cfg.mode != "csv" else _csv_variable_note(var))}</div><br>'
            + kv([("Unidad de llegada", var.native_unit), ("Serie mensual", var.monthly_unit),
                  ("Serie anual analizada", var.annual_unit),
                  ("Agregación anual", "promedio ponderado por días" if var.aggregation == "mean"
                   else "suma de acumulados mensuales (tasa × días)"),
                  ("Producto", _product_label(cfg))])
            + "</div>", unsafe_allow_html=True)
    with c2, st.container(border=True):
        st.markdown("**Paso 2 · Ubicaciones**")
        if cfg.mode == "csv":
            _csv_sites_card(cfg)
        elif cfg.synthetic:
            st.markdown("Los sitios sintéticos **no tienen coordenadas**: así nunca se confunden con lugares reales.")
            for spec in (cfg.site_a, cfg.site_b):
                sc = SCENARIOS[spec.scenario]
                st.markdown(site_tag(spec.slot, sc.name_es), unsafe_allow_html=True)
                st.caption(sc.description_es)
        else:
            pts = [(s.slot, s.location().lat, s.location().lon, s.location().name) for s in (cfg.site_a, cfg.site_b)]
            st.plotly_chart(viz.map_figure(pts), config={"displayModeBar": False}, key="map")
            st.caption(f"Mapa de contexto, no de tendencias. Cada punto se resuelve a una celda de {POWER_GRID_DESCRIPTION}.")

    st.subheader("Pasos 3–4 · Datos y procesamiento")
    if not show_errors(ctx):
        footer()
        return
    cols = st.columns(2)
    for col, slot in zip(cols, ("A", "B")):
        r = ctx.results[slot]
        p, rep = r.provenance, r.processing
        with col:
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
            rows += [("Meses en el período", f"{rep.n_months_valid} válidos de {rep.n_months_expected}"),
                     ("Años completos", f"{len(rep.complete_years)}"),
                     ("Años excluidos", ", ".join(map(str, sorted(rep.incomplete_years))) or "ninguno")]
            st.markdown(kv(rows), unsafe_allow_html=True)
            with st.expander("Registro de procesamiento"):
                st.markdown(f"- Conversión: {rep.conversion_note}")
                for n in rep.notes or ["Sin incidencias: datos ordenados, sin duplicados ni marcadores de relleno."]:
                    st.markdown(f"- {n}")
                if p.request_url:
                    st.markdown("Solicitud HTTP exacta:")
                    st.code(p.request_url, language=None)
            st.plotly_chart(viz.monthly_figure(r, slot), key=f"monthly_{slot}")
    st.success("Datos listos y procesados. Siguiente paso: estimar la tendencia y su incertidumbre.",
               icon=":material/check_circle:")
    page_links("analysis", "compare")
    footer()


# ---------------------------------------------------------------------------------------------
# Pantalla 2 — Análisis
# ---------------------------------------------------------------------------------------------
def _site_analysis(r: TrendResult, slot: str, cfg) -> None:
    st.markdown(site_tag(slot, r.location.name), unsafe_allow_html=True)
    verdict_badge(r)
    st.markdown(f'<div class="tl-verdict">{esc(headline(r))}</div>', unsafe_allow_html=True)

    m1, m2, m3, m4 = st.columns(4)
    lo, hi = r.ci_per_decade
    m1.metric("Pendiente (Theil-Sen)", f"{fnum(r.slope_per_decade)} {r.unit}/déc.",
              help="Mediana de todas las pendientes entre pares de años. Robusta a valores atípicos.", border=True)
    m1.caption(f"IC 95 %: {fnum(lo, ref=r.slope_per_decade)} a {fnum(hi, ref=r.slope_per_decade)}")
    m2.metric("Cambio neto en el período", f"{fnum(r.total_change)} {r.unit}", border=True,
              help="Pendiente × años transcurridos entre el primer y el último año analizado.")
    span = r.analyzed_span
    m2.caption(f"{span[0]}–{span[1]}" if span else "—")
    m3.metric("Valor p (prueba principal)", fp(r.p_value).replace("p = ", "").replace("p < ", "< "), border=True,
              help="Mann-Kendall con corrección por autocorrelación AR(1). Mide evidencia, no magnitud.")
    m3.caption(evidence_label(r.p_value, r.core.alpha).capitalize())
    m4.metric("Años analizados", f"{r.n}", border=True,
              help=f"Mínimo para emitir veredicto: {MIN_YEARS_FOR_TEST}. Recomendado: ≥ {RECOMMENDED_MIN_YEARS}.")
    if math.isfinite(r.detectability_years):
        m4.caption(f"Para detectar esta pendiente: ≈ {r.detectability_years:.0f} años")

    show_anom = st.toggle("Mostrar como anomalías", key=f"anom_{slot}",
                          help=f"Diferencia respecto a la media de {cfg.reference[0]}–{cfg.reference[1]}.")
    fig, note = viz.annual_trend_figure(r, slot, show_anom, cfg.reference)
    st.plotly_chart(fig, key=f"annual_{slot}")
    if note:
        st.caption(note)

    ex = explain_trend(r)
    with st.container(border=True):
        st.markdown("#### Interpretación (generada solo con las cifras calculadas)")
        st.markdown(ex["resumen"])
        st.markdown(ex["interpretacion"])
        if ex["incertidumbre"]:
            st.markdown(ex["incertidumbre"])
        if ex["verdad_sintetica"]:
            st.markdown("🧪 " + ex["verdad_sintetica"])
        st.markdown("**Lo que este resultado NO permite concluir:**")
        for s in ex["no_concluir"]:
            st.markdown(f"- {s}")
    warnings_block(r)

    with st.expander("Detalle estadístico (todas las pruebas)"):
        st.dataframe(_stats_table(r), hide_index=True)
        st.caption("La prueba principal es la base del veredicto; las demás se muestran para transparencia. "
                   "Que discrepen es información, no un error.")
    with st.expander("Sensibilidad al año inicial (¿depende la conclusión del período elegido?)"):
        tab = start_year_sensitivity(r)
        st.plotly_chart(viz.sensitivity_figure(tab, r, slot), key=f"sens_{slot}")
        if len(tab):
            signs = set(np.sign(tab["slope_decade"].round(12)))
            st.caption("El signo de la pendiente es el mismo para todos los años iniciales probados."
                       if len(signs) == 1 else
                       "⚠ El signo de la pendiente cambia según el año inicial: la conclusión depende del período.")


def _stats_table(r: TrendResult) -> pd.DataFrame:
    c, o = r.core, r.core.ols
    u = f"{r.unit}/déc."
    rows = [
        ("Theil-Sen (pendiente)", f"{fnum(c.sen_slope * 10)} {u}",
         f"IC 95 % corregido: {fnum(c.sen_ci[0] * 10)} a {fnum(c.sen_ci[1] * 10)}; "
         f"suponiendo independencia: {fnum(c.sen_ci_independent[0] * 10)} a {fnum(c.sen_ci_independent[1] * 10)}"),
        (f"{c.primary.test_name} (principal)", fp(c.primary.p_value),
         f"S = {c.primary.s:.0f}, Var*(S) = {c.primary.var_s:.1f}, Z = {c.primary.z:.2f}, factor = {c.primary.correction_factor:.2f}; {c.primary.note}"),
        ("Mann-Kendall original", fp(c.mk.p_value), f"S = {c.mk.s:.0f}, Var(S) = {c.mk.var_s:.1f}, Z = {c.mk.z:.2f}, τ = {c.mk.tau:.3f}. Supone independencia."),
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
    return pd.DataFrame(rows, columns=["Método", "Resultado", "Detalle"])


def analysis() -> None:
    ctx = get_ctx()
    header("Análisis de tendencia por ubicación",
           "Magnitud (cuánto cambia), incertidumbre (qué tan seguro) y evidencia (¿podría ser azar?).", ctx, active=5)
    if not show_errors(ctx):
        footer()
        return
    tabs = st.tabs([f"A · {ctx.results['A'].location.name}", f"B · {ctx.results['B'].location.name}"])
    for tab, slot in zip(tabs, ("A", "B")):
        with tab:
            _site_analysis(ctx.results[slot], slot, ctx.cfg)
    st.download_button("Descargar resultados (CSV)", to_csv_bytes(results_table(ctx.results, ctx.comparison)),
                       file_name="trendlens_resultados.csv", mime="text/csv", icon=":material/download:")
    st.download_button("Descargar series anuales (CSV)", to_csv_bytes(annual_table(ctx.results)),
                       file_name="trendlens_series_anuales.csv", mime="text/csv", icon=":material/download:")
    page_links("compare", "methods")
    footer()


# ---------------------------------------------------------------------------------------------
# Pantalla 3 — Comparación (Opposite Trends Explorer)
# ---------------------------------------------------------------------------------------------
def compare() -> None:
    ctx = get_ctx()
    header("Opposite Trends Explorer",
           "¿Cambian los dos lugares en el mismo sentido? ¿Son realmente distintas sus tendencias?", ctx, active=6)
    if not show_errors(ctx):
        footer()
        return
    ra, rb, cmp = ctx.results["A"], ctx.results["B"], ctx.comparison

    c1, c2 = st.columns([1.5, 1])
    with c1:
        diff_line = ""
        if cmp.differ_significantly is not None:
            diff_line = ("La prueba sobre la diferencia indica que las pendientes <b>difieren significativamente</b>."
                         if cmp.differ_significantly else
                         "La prueba sobre la diferencia <b>no muestra evidencia suficiente</b> de que las pendientes difieran.")
        st.markdown(f'<div class="tl-pattern"><div class="t">{esc(cmp.pattern_title)}</div>'
                    f'<div class="d">{diff_line}</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown("**¿Son comparables?**")
        for ch in cmp.checks:
            mark = '<span class="ok">✓</span>' if ch.ok else '<span class="no">✗</span>'
            st.markdown(f'<div class="tl-check">{mark} {esc(ch.label)} <span style="color:#8A97A6">— {esc(ch.detail)}</span></div>',
                        unsafe_allow_html=True)

    if cmp.core_a is None:
        for p in explain_comparison(cmp, ra, rb):
            st.markdown(p)
        footer()
        return

    use_anom = st.toggle("Comparar como anomalías (recomendado)", value=True, key="cmp_anom",
                         help="Pone ambos lugares en la misma escala aunque sus climatologías sean muy distintas.")
    fig, note = viz.comparison_figure(ra, rb, cmp, use_anom, ctx.cfg.reference)
    st.plotly_chart(fig, key="cmp_series")
    if note:
        st.caption(note)
    st.plotly_chart(viz.forest_figure(cmp, ra, rb), key="forest", config={"displayModeBar": False})
    st.caption("Si los intervalos de A y B no se solapan es una pista, pero la prueba correcta es la de la fila "
               "A − B: su intervalo ya considera que ambas series comparten años y variabilidad regional.")

    with st.container(border=True):
        st.markdown("#### Interpretación")
        for p in explain_comparison(cmp, ra, rb):
            st.markdown(p)

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
        st.caption("La prueba z que supone independencia se muestra solo como contraste: si los lugares están "
                   "correlacionados, su valor p es demasiado optimista o pesimista.")
    st.download_button("Descargar comparación (CSV)", to_csv_bytes(results_table(ctx.results, cmp)),
                       file_name="trendlens_comparacion.csv", mime="text/csv", icon=":material/download:")
    page_links("analysis", "methods")
    footer()


# ---------------------------------------------------------------------------------------------
# Pantalla 4 — Métodos y fuentes
# ---------------------------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def _rejection(phi: float, n: int, sims: int) -> pd.DataFrame:
    return rejection_rates(phi, n_years=n, n_sims=sims)


def methods() -> None:
    ctx = get_ctx()
    header("Métodos y fuentes", "Procedencia, supuestos, definiciones y límites. Todo lo que hace falta para auditar "
           "un resultado.", ctx, active=6)

    st.subheader("Procedencia de los datos actuales")
    if ctx.results:
        rows = []
        for slot, r in ctx.results.items():
            p = r.provenance
            rows.append({"Sitio": slot, "Ubicación": r.location.name, "¿Sintético?": "sí" if p.is_synthetic else "no",
                         "Fuente": p.source, "Producto": p.product, "Consultado (UTC)": p.retrieved_at_utc,
                         "Caché": "sí" if p.from_cache else "no", "API": p.api_version or "—",
                         "Semilla": p.seed if p.seed is not None else "—", "URL": p.request_url or "—",
                         "Origen": p.origin, "Archivo": p.extra.get("filename") or "—"})
        st.dataframe(pd.DataFrame(rows), hide_index=True)
    show_errors(ctx)

    st.subheader("Recorrido metodológico")
    st.markdown("""
| Paso | Qué hace el laboratorio | Por qué |
|---|---|---|
| **Datos** | Serie mensual por punto (NASA POWER, MERRA-2, ½° × ⅝°) o escenario sintético con semilla | Una sola fuente, verificable y con procedencia |
| **Procesamiento** | Ordena, elimina duplicados idénticos (los contradictorios son error), convierte −999 a faltante, valida unidades y rango físico | Ningún dato dudoso entra en silencio al cálculo |
| **Unidades** | Precipitación: mm/día × días reales del mes (bisiestos incluidos) → mm/mes → mm/año | Una tasa no se suma; un acumulado sí |
| **Agregación** | Año = 12 meses válidos. Temperatura: promedio ponderado por días. Años incompletos: excluidos, nunca rellenados | Elimina el ciclo estacional sin modelarlo |
| **Magnitud** | Pendiente de Theil-Sen sobre años reales (no índices) + MCO de referencia | Robusta a atípicos; unidades físicas por década |
| **Evidencia** | Mann-Kendall con corrección AR(1) del tamaño efectivo de muestra | Los años vecinos se parecen; sin corrección hay demasiados falsos positivos |
| **Diagnósticos** | Hamed-Rao, Seasonal MK, ajuste de Santer, escalón vs. recta, sensibilidad al período, detectabilidad | Comprobar si la conclusión es robusta |
| **Comparación** | Prueba sobre la serie de diferencias A − B en los años comunes | Signos opuestos ≠ tendencias distintas |
| **Interpretación** | Plantillas deterministas con las cifras calculadas | Nada de texto sin respaldo numérico |
""")

    st.subheader("Experimento: ¿cuántos falsos positivos produce cada prueba?")
    st.markdown("Se simulan series **sin tendencia** con ruido AR(1). Una prueba bien calibrada debería declarar "
                "tendencia solo en ≈ α (5 %) de los casos. Este experimento fue el criterio para elegir la prueba principal.")
    e1, e2, e3 = st.columns(3)
    phi = e1.select_slider("Autocorrelación φ", [0.0, 0.25, 0.5, 0.75, 0.9], value=0.5, key="mc_phi")
    n = e2.select_slider("Años por serie", [20, 30, 45, 60], value=45, key="mc_n")
    sims = e3.select_slider("Simulaciones", [200, 500, 1000], value=200, key="mc_sims")
    with st.spinner("Simulando…"):
        df = _rejection(float(phi), int(n), int(sims))
    st.plotly_chart(viz.rejection_figure(df), key="mc_fig", config={"displayModeBar": False})
    st.caption(f"Semilla del experimento: 20261114 (reproducible). Con {sims} simulaciones, el error de Monte Carlo "
               f"de una tasa del 5 % es ≈ ±{1.96 * np.sqrt(0.05 * 0.95 / sims):.1%}.")

    st.subheader("Glosario")
    gloss = {
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
    for k, v in gloss.items():
        st.markdown(f"**{k}.** {v}")

    st.subheader("Catálogo de escenarios sintéticos")
    st.dataframe(pd.DataFrame([{
        "Clave": s.key, "Escenario": s.name_es,
        "Pendiente real T2M (°C/déc.)": s.temp_trend_per_decade,
        "Pendiente real precip. (mm/año/déc.)": s.precip_trend_per_decade,
        "Semilla T2M": scenario_seed(s, "T2M"), "Semilla precip.": scenario_seed(s, "PRECTOTCORR"),
        "φ AR(1)": s.ar1_phi, "Faltantes": f"{s.missing_fraction:.0%}" + (" + hueco" if s.gap_block else ""),
        "Descripción": s.description_es,
    } for s in SCENARIOS.values()]), hide_index=True)

    st.subheader("Limitaciones principales")
    st.markdown("""
- Las pendientes describen el período elegido; **no son pronósticos** ni identifican causas.
- Ninguna corrección de autocorrelación es perfecta con series cortas y persistencia fuerte (ver experimento).
- Seasonal Mann-Kendall supone independencia entre meses; se muestra como diagnóstico, no como base del veredicto.
- MERRA-2 es un reanálisis: en relieve complejo o costas, una celda de ~50 km puede diferir mucho de una estación.
- La comparación A − B no corrige por comparaciones múltiples si se prueban muchos pares de lugares.
- Detalles completos en `SCIENTIFIC_METHOD.md`, `DATA_SOURCES.md` y `LIMITATIONS.md` del repositorio.
""")
    footer()
