"""Panel de control (visible en todas las pantallas): fuente, variable, ubicaciones y período."""

from __future__ import annotations

import streamlit as st

from ..config import ALPHA_CHOICES, ALPHA_DEFAULT, DEFAULT_REFERENCE_PERIOD, POWER_FIRST_YEAR, PRESET_LOCATIONS, \
    PRESETS_BY_ID, VARIABLES, last_complete_year
from ..data.synthetic import SCENARIOS, SUGGESTED_PAIRS
from .state import LabConfig, SiteSpec

CUSTOM = "__custom__"
DEFAULTS = {
    "mode": "synthetic", "code": "T2M", "scen_A": "opuesta_pos", "scen_B": "opuesta_neg", "pair": "—",
    "loc_A": "mexicali", "loc_B": "ushuaia", "lat_A": 32.62, "lon_A": -115.45, "lat_B": -54.80, "lon_B": -68.30,
    "alpha": ALPHA_DEFAULT, "nonce": 0,
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


def render() -> LabConfig:
    _init_state()
    last = last_complete_year()
    with st.sidebar:
        st.markdown('<div class="tl-brand">Trend<span>Lens</span> Lab</div>', unsafe_allow_html=True)
        st.caption("Laboratorio de práctica para Space Apps 2026. **No es la solución competitiva.**")

        st.markdown("**1 · Fuente de datos**")
        mode = st.radio("Fuente de datos", ["synthetic", "power"], key="mode", horizontal=True,
                        label_visibility="collapsed",
                        format_func=lambda m: "Sintético (demo)" if m == "synthetic" else "NASA POWER (real)")
        st.markdown("**2 · Variable**")
        code = st.selectbox("Variable", list(VARIABLES), key="code", label_visibility="collapsed",
                            format_func=lambda c: VARIABLES[c].short_es)
        var = VARIABLES[code]
        st.caption(f"Llega en {var.native_unit} · se analiza en {var.annual_unit} (serie anual).")

        st.markdown("**3 · Ubicaciones**")
        if mode == "synthetic":
            st.selectbox("Ejemplo rápido", ["—"] + list(SUGGESTED_PAIRS), key="pair", on_change=_apply_pair,
                         help="Carga un par de escenarios en A y B.")
            sa = st.selectbox("Sitio sintético A", list(SCENARIOS), key="scen_A",
                              format_func=lambda k: SCENARIOS[k].name_es)
            sb = st.selectbox("Sitio sintético B", list(SCENARIOS), key="scen_B",
                              format_func=lambda k: SCENARIOS[k].name_es)
            site_a, site_b = SiteSpec("A", "synthetic", scenario=sa), SiteSpec("B", "synthetic", scenario=sb)
        else:
            site_a, site_b = _power_site("A"), _power_site("B")

        st.markdown("**4 · Período (años completos)**")
        y0, y1 = st.slider("Período", POWER_FIRST_YEAR, last, key="years", label_visibility="collapsed")

        with st.expander("Opciones avanzadas"):
            alpha = st.select_slider("Nivel de significancia α", list(ALPHA_CHOICES), key="alpha",
                                     help="Probabilidad aceptada de declarar una tendencia que no existe "
                                          "(bajo los supuestos de la prueba).")
            ref = st.slider("Período de referencia para anomalías", POWER_FIRST_YEAR, last, key="ref",
                            help="Por defecto 1991–2020, la normal climatológica vigente de la OMM.")
            if mode == "power" and st.button("Volver a descargar de NASA POWER", help="Ignora la caché local."):
                st.session_state["nonce"] += 1
        st.caption("Los cambios se aplican al instante en todas las pantallas.")

    return LabConfig(mode=mode, code=code, site_a=site_a, site_b=site_b, start=int(y0), end=int(y1),
                     alpha=float(alpha), reference=(int(ref[0]), int(ref[1])), nonce=int(st.session_state["nonce"]))
