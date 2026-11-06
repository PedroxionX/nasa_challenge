"""Panel de control (visible en todas las pantallas): fuente, variable, ubicaciones y período."""

from __future__ import annotations

import hashlib

import pandas as pd
import streamlit as st

from ..config import ALPHA_CHOICES, ALPHA_DEFAULT, DEFAULT_REFERENCE_PERIOD, POWER_FIRST_YEAR, PRESET_LOCATIONS, \
    PRESETS_BY_ID, VARIABLES, last_complete_year
from ..data.base import DataSourceError
from ..data.csv_source import CsvFormat, example_csv, guess_columns, parse_monthly_dates, read_csv_table
from ..data.synthetic import SCENARIOS, SUGGESTED_PAIRS
from .state import CsvSpec, LabConfig, SiteSpec

CUSTOM = "__custom__"
REF_MIN_YEAR = 1900  # límites fijos: un CSV puede empezar antes de 1981
MODES = {"synthetic": "Sintético (demo)", "power": "NASA POWER (real)", "csv": "CSV propio"}
SEPARATORS = {"auto": "Detectar automáticamente", ",": "Coma ( , )", ";": "Punto y coma ( ; )", "\t": "Tabulador"}
DEFAULTS = {
    "mode": "synthetic", "code": "T2M", "scen_A": "opuesta_pos", "scen_B": "opuesta_neg", "pair": "—",
    "loc_A": "mexicali", "loc_B": "ushuaia", "lat_A": 32.62, "lon_A": -115.45, "lat_B": -54.80, "lon_B": -68.30,
    "alpha": ALPHA_DEFAULT, "nonce": 0,
    "csv_name_A": "Sitio A", "csv_name_B": "Sitio B", "csv_kind": "real", "csv_sep": "auto", "csv_dec": ".",
    "csv_skip": 0, "csv_norm": False,
}


def _init_state() -> None:
    last = last_complete_year()
    for k, v in DEFAULTS.items():
        st.session_state.setdefault(k, v)
    st.session_state.setdefault("years", (POWER_FIRST_YEAR, last))
    st.session_state.setdefault("ref", DEFAULT_REFERENCE_PERIOD)


def _apply_pair() -> None:
    pair = st.session_state.get("pair")
    if pair in SUGGESTED_PAIRS:
        st.session_state["scen_A"], st.session_state["scen_B"] = SUGGESTED_PAIRS[pair]
    st.session_state["pair"] = "—"


def _power_site(slot: str) -> SiteSpec:
    options = [loc.id for loc in PRESET_LOCATIONS] + [CUSTOM]
    choice = st.selectbox(
        f"Ubicación {slot}", options, key=f"loc_{slot}",
        format_func=lambda i: "Coordenadas personalizadas…" if i == CUSTOM else PRESETS_BY_ID[i].label,
    )
    if choice == CUSTOM:
        c1, c2 = st.columns(2)
        lat = c1.number_input(f"Latitud {slot}", -90.0, 90.0, step=0.25, format="%.2f", key=f"lat_{slot}")
        lon = c2.number_input(f"Longitud {slot}", -180.0, 180.0, step=0.25, format="%.2f", key=f"lon_{slot}")
        return SiteSpec(slot, "power", loc_id=f"custom_{slot}_{lat:.2f}_{lon:.2f}",
                        name=f"Punto {slot} ({lat:.2f}, {lon:.2f})", lat=float(lat), lon=float(lon))
    loc = PRESETS_BY_ID[choice]
    st.caption(loc.context_es)
    return SiteSpec(slot, "power", loc_id=loc.id)


# ------------------------------------------------------------------------------------------
# Modo CSV
# ------------------------------------------------------------------------------------------
@st.cache_data(show_spinner=False, max_entries=32)
def _csv_preview(content: bytes, fmt: CsvFormat) -> pd.DataFrame:
    return read_csv_table(content, fmt)


@st.cache_data(show_spinner=False, max_entries=64)
def _csv_year_range(content: bytes, fmt: CsvFormat, date_column: str) -> tuple[int, int] | None:
    try:
        months = parse_monthly_dates(read_csv_table(content, fmt)[date_column].dropna(), fmt.normalize_to_month_start)
    except (DataSourceError, KeyError):
        return None  # el error completo se mostrará al analizar
    return int(months.dt.year.min()), int(months.dt.year.max())


@st.cache_data(show_spinner=False)
def _example_csv(code: str) -> bytes:
    return example_csv(VARIABLES[code])


def _unit_confirmation(var) -> str:
    if var.aggregation == "sum_from_rate":
        return (f"Confirmo que los valores son **tasas en {var.native_unit}** (promedio diario de cada mes), "
                "no acumulados mensuales ni mm/h.")
    return f"Confirmo que los valores están en **{var.native_unit}** (no en K ni en °F)."


def _csv_common(code: str) -> dict:
    var = VARIABLES[code]
    st.caption(f"Una fila por mes: una columna de **fecha** (AAAA-MM, AAAA-MM-DD o AAAAMM) y una de **valor** "
               f"de {var.name_es.lower()} en {var.native_unit}.")
    st.download_button("Descargar CSV de ejemplo (sintético)", _example_csv(code),
                       file_name=f"ejemplo_{code}_sintetico.csv", mime="text/csv", icon=":material/download:",
                       help="Formato esperado, con datos del escenario sintético «Tendencia creciente».")
    source = st.text_input("Fuente de los datos *", key="csv_source",
                           placeholder="p. ej. GPM IMERG V07 vía Giovanni",
                           help="Obligatoria: aparece en cada resultado y en el CSV exportado.")
    product = st.text_input("Producto / versión", key="csv_product", placeholder="p. ej. GPM_3IMERGM v07")
    spatial = st.text_input("Resolución espacial", key="csv_spatial",
                            placeholder="p. ej. celda de 0.1°, estación, promedio de área")
    kind = st.radio("Los datos son…", ["real", "synthetic"], key="csv_kind", horizontal=True,
                    format_func=lambda k: "Reales" if k == "real" else "Sintéticos / de prueba")
    unit_ok = st.checkbox(_unit_confirmation(var), key=f"csv_unit_ok_{code}")
    with st.expander("Formato del archivo"):
        sep = st.selectbox("Separador de columnas", list(SEPARATORS), key="csv_sep", format_func=SEPARATORS.get)
        dec = st.selectbox("Separador decimal", [".", ","], key="csv_dec")
        skip = st.number_input("Filas a omitir al inicio", 0, 500, step=1, key="csv_skip",
                               help="Para archivos con encabezado de metadatos (p. ej. exportaciones de Giovanni).")
        norm = st.checkbox("Las fechas no son día 1: usar el mes de cada fecha", key="csv_norm",
                           help="Por ejemplo, productos mensuales fechados el día 15. Si hay dos fechas en el "
                                "mismo mes, el archivo se rechaza.")
    fmt = CsvFormat(sep=None if sep == "auto" else sep, decimal=dec, skiprows=int(skip), normalize_to_month_start=norm)
    pending = None
    if not source.strip():
        pending = "Declara la **fuente de los datos** en el panel lateral (sin procedencia no hay resultado verificable)."
    elif not unit_ok:
        pending = f"Confirma en el panel lateral que los valores están en **{var.native_unit}**."
    return dict(source=source.strip(), product=product.strip(), spatial=spatial.strip() or "no declarada",
                synthetic=kind == "synthetic", fmt=fmt, pending=pending)


def _csv_site(slot: str, common: dict) -> tuple[SiteSpec, tuple[int, int] | None]:
    with st.expander(f"Sitio {slot}", expanded=True):
        up = st.file_uploader(f"CSV del sitio {slot}", type=["csv", "txt"], key=f"csv_file_{slot}")
        name = st.text_input(f"Nombre del sitio {slot}", key=f"csv_name_{slot}").strip() or f"Sitio {slot}"
        c1, c2 = st.columns(2)
        lat = c1.number_input("Latitud (opcional)", -90.0, 90.0, value=None, format="%.2f", key=f"csv_lat_{slot}")
        lon = c2.number_input("Longitud (opcional)", -180.0, 180.0, value=None, format="%.2f", key=f"csv_lon_{slot}")
        if up is None:
            return SiteSpec(slot, "csv", name=name, lat=lat, lon=lon,
                            pending=f"Sube el archivo CSV del **sitio {slot}** en el panel lateral."), None
        content = up.getvalue()
        date_col = value_col = ""
        try:
            preview = _csv_preview(content, common["fmt"])
            cols = list(preview.columns)
            g_date, g_value = guess_columns(preview)
            tag = f"{slot}_{hashlib.sha256(content).hexdigest()[:10]}"  # claves nuevas si cambia el archivo
            date_col = st.selectbox("Columna de fecha", cols, index=cols.index(g_date), key=f"csv_dcol_{tag}")
            value_col = st.selectbox("Columna de valor", cols, key=f"csv_vcol_{tag}",
                                     index=cols.index(g_value) if g_value in cols else min(1, len(cols) - 1))
            st.caption(f"{len(preview)} filas · {len(cols)} columnas")
        except DataSourceError as exc:
            st.caption(f"⚠ {exc.user_message} Revisa «Formato del archivo».")
        spec = CsvSpec(content=content, filename=up.name, date_column=date_col, value_column=value_col,
                       fmt=common["fmt"], source_name=common["source"], product=common["product"],
                       spatial_resolution=common["spatial"], declared_synthetic=common["synthetic"])
        years = _csv_year_range(content, common["fmt"], date_col) if date_col else None
        return SiteSpec(slot, "csv", name=name, lat=lat, lon=lon, csv=spec, pending=common["pending"]), years


# ------------------------------------------------------------------------------------------
def render() -> LabConfig:
    _init_state()
    last = last_complete_year()
    csv_synthetic = False
    with st.sidebar:
        st.markdown('<div class="tl-brand">Trend<span>Lens</span> Lab</div>', unsafe_allow_html=True)
        st.caption("Laboratorio de práctica para Space Apps 2026. **No es la solución competitiva.**")

        st.markdown("**1 · Fuente de datos**")
        mode = st.radio("Fuente de datos", list(MODES), key="mode", label_visibility="collapsed",
                        format_func=MODES.get)
        st.markdown("**2 · Variable**")
        code = st.selectbox("Variable", list(VARIABLES), key="code", label_visibility="collapsed",
                            format_func=lambda c: VARIABLES[c].short_es)
        var = VARIABLES[code]
        st.caption(f"Llega en {var.native_unit} · se analiza en {var.annual_unit} (serie anual).")

        bounds = (POWER_FIRST_YEAR, last)
        if mode == "synthetic":
            st.markdown("**3 · Ubicaciones**")
            st.selectbox("Ejemplo rápido", ["—"] + list(SUGGESTED_PAIRS), key="pair", on_change=_apply_pair,
                         help="Carga un par de escenarios en A y B.")
            sa = st.selectbox("Sitio sintético A", list(SCENARIOS), key="scen_A",
                              format_func=lambda k: SCENARIOS[k].name_es)
            sb = st.selectbox("Sitio sintético B", list(SCENARIOS), key="scen_B",
                              format_func=lambda k: SCENARIOS[k].name_es)
            site_a, site_b = SiteSpec("A", "synthetic", scenario=sa), SiteSpec("B", "synthetic", scenario=sb)
        elif mode == "power":
            st.markdown("**3 · Ubicaciones**")
            site_a, site_b = _power_site("A"), _power_site("B")
        else:
            st.markdown("**3 · Archivos CSV y procedencia**")
            common = _csv_common(code)
            csv_synthetic = common["synthetic"]
            site_a, years_a = _csv_site("A", common)
            site_b, years_b = _csv_site("B", common)
            ranges = [r for r in (years_a, years_b) if r]
            if ranges:
                bounds = (min(r[0] for r in ranges), max(r[1] for r in ranges))

        st.markdown("**4 · Período (años completos)**")
        if mode == "csv":
            lo, hi = bounds if bounds[0] < bounds[1] else (bounds[0], bounds[0] + 1)
            y0, y1 = st.slider("Período", lo, hi, value=(lo, hi), key=f"years_csv_{lo}_{hi}",
                               label_visibility="collapsed",
                               help="El rango se ajusta a las fechas de los archivos cargados.")
        else:
            y0, y1 = st.slider("Período", POWER_FIRST_YEAR, last, key="years", label_visibility="collapsed")

        with st.expander("Opciones avanzadas"):
            alpha = st.select_slider("Nivel de significancia α", list(ALPHA_CHOICES), key="alpha",
                                     help="Probabilidad aceptada de declarar una tendencia que no existe "
                                          "(bajo los supuestos de la prueba).")
            ref = st.slider("Período de referencia para anomalías", REF_MIN_YEAR, last, key="ref",
                            help="Por defecto 1991–2020, la normal climatológica vigente de la OMM.")
            if mode == "power" and st.button("Volver a descargar de NASA POWER", help="Ignora la caché local."):
                st.session_state["nonce"] += 1
        st.caption("Los cambios se aplican al instante en todas las pantallas.")

    return LabConfig(mode=mode, code=code, site_a=site_a, site_b=site_b, start=int(y0), end=int(y1),
                     alpha=float(alpha), reference=(int(ref[0]), int(ref[1])), nonce=int(st.session_state["nonce"]),
                     csv_declared_synthetic=csv_synthetic)
