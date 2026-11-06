"""TrendLens Lab — punto de entrada de Streamlit.

Ejecutar:  streamlit run app.py
Material de PRÁCTICA previo a NASA Space Apps 2026; no es la solución competitiva.
"""

import streamlit as st

st.set_page_config(page_title="TrendLens Lab", page_icon="🛰️", layout="wide", initial_sidebar_state="expanded")

from trendlens.ui import pages, sidebar, state, theme  # noqa: E402  (set_page_config debe ir primero)

theme.inject_css()
cfg = sidebar.render()

nav = {
    "lab": st.Page(pages.lab, title="Laboratorio", icon=":material/science:", url_path="laboratorio", default=True),
    "analysis": st.Page(pages.analysis, title="Análisis", icon=":material/monitoring:", url_path="analisis"),
    "compare": st.Page(pages.compare, title="Comparación", icon=":material/compare_arrows:", url_path="comparacion"),
    "methods": st.Page(pages.methods, title="Métodos y fuentes", icon=":material/menu_book:", url_path="metodos"),
}
pages.PAGES.update({
    "lab": (nav["lab"], "Volver al laboratorio", ":material/science:"),
    "analysis": (nav["analysis"], "Ver el análisis por ubicación →", ":material/monitoring:"),
    "compare": (nav["compare"], "Abrir el Opposite Trends Explorer →", ":material/compare_arrows:"),
    "methods": (nav["methods"], "Métodos, fuentes y limitaciones →", ":material/menu_book:"),
})
current = st.navigation(list(nav.values()), position="top")

SPINNER = {"synthetic": "Generando datos sintéticos…", "power": "Obteniendo datos de NASA POWER…",
           "csv": "Leyendo y procesando los CSV…"}
with st.spinner(SPINNER[cfg.mode]):
    st.session_state["ctx"] = state.compute(cfg)

current.run()
