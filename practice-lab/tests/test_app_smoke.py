"""Prueba de humo de la interfaz: cada pantalla se ejecuta sin excepciones (modo sintético, sin red)."""

import pytest
from streamlit.testing.v1 import AppTest


def _page_script(page_name: str, code: str, scen_a: str, scen_b: str):
    import streamlit as st

    from trendlens.ui import pages, sidebar, state, theme

    st.session_state.setdefault("code", code)
    st.session_state.setdefault("scen_A", scen_a)
    st.session_state.setdefault("scen_B", scen_b)
    theme.inject_css()
    cfg = sidebar.render()
    st.session_state["ctx"] = state.compute(cfg)
    getattr(pages, page_name)()


@pytest.mark.parametrize("page", ["lab", "analysis", "compare", "methods"])
@pytest.mark.parametrize("code,scen_a,scen_b", [("T2M", "opuesta_pos", "opuesta_neg"),
                                                ("PRECTOTCORR", "faltantes", "autocorrelada")])
def test_page_renders_without_exceptions(page, code, scen_a, scen_b):
    at = AppTest.from_function(_page_script, args=(page, code, scen_a, scen_b), default_timeout=120).run()
    assert not at.exception, [e.value for e in at.exception]
    assert not at.error, [e.value for e in at.error]  # en modo sintético no debe haber errores de datos
    banner = [m.value for m in at.markdown if 'class="tl-banner' in m.value]
    assert banner and "DATOS SINTÉTICOS" in banner[0]


def test_sidebar_change_updates_results():
    at = AppTest.from_function(_page_script, args=("analysis", "T2M", "creciente", "sin_tendencia"),
                               default_timeout=120).run()
    before = [m.value for m in at.markdown if 'class="tl-verdict"' in m.value]
    at.selectbox(key="scen_A").set_value("decreciente").run()
    after = [m.value for m in at.markdown if 'class="tl-verdict"' in m.value]
    assert before and after and before[0] != after[0]
    assert "Decreciente" in after[0]


def _power_script(page_name: str, code: str):
    import streamlit as st

    from trendlens.ui import pages, sidebar, state, theme

    st.session_state.setdefault("mode", "power")
    st.session_state.setdefault("code", code)
    theme.inject_css()
    cfg = sidebar.render()
    st.session_state["ctx"] = state.compute(cfg)
    getattr(pages, page_name)()


@pytest.mark.live
@pytest.mark.parametrize("page", ["lab", "analysis", "compare", "methods"])
@pytest.mark.parametrize("code", ["T2M", "PRECTOTCORR"])
def test_power_mode_pages_render(page, code):
    """Modo real (red): Mexicali vs. Ushuaia por defecto; sin excepciones ni errores de datos."""
    at = AppTest.from_function(_power_script, args=(page, code), default_timeout=180).run()
    assert not at.exception, [e.value for e in at.exception]
    assert not at.error, [e.value for e in at.error]
    banner = [m.value for m in at.markdown if 'class="tl-banner' in m.value]
    assert banner and "NASA POWER" in banner[0] and "SINTÉTICOS" not in banner[0]
