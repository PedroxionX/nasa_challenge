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


# ---------------------------------------------------------------------------------------------
# Modo CSV
# ---------------------------------------------------------------------------------------------
def _csv_no_files_script(page_name: str):
    import streamlit as st

    from trendlens.ui import pages, sidebar, state, theme

    st.session_state.setdefault("mode", "csv")
    theme.inject_css()
    cfg = sidebar.render()
    st.session_state["ctx"] = state.compute(cfg)
    getattr(pages, page_name)()


@pytest.mark.parametrize("page", ["lab", "analysis", "compare", "methods"])
def test_csv_mode_without_files_asks_for_them(page):
    at = AppTest.from_function(_csv_no_files_script, args=(page,), default_timeout=120).run()
    assert not at.exception, [e.value for e in at.exception]
    assert not at.error, [e.value for e in at.error]
    assert any("Sube el archivo CSV" in i.value for i in at.info)
    banner = [m.value for m in at.markdown if 'class="tl-banner' in m.value]
    assert banner and "cargados desde CSV" in banner[0]


def _csv_data_script(page_name: str, declared_synthetic: bool):
    import json
    import pathlib

    import pandas as pd
    import streamlit as st

    import trendlens
    from trendlens.data.csv_source import CsvFormat
    from trendlens.ui import pages, state, theme

    fixtures = pathlib.Path(trendlens.__file__).resolve().parents[1] / "tests" / "fixtures"

    def to_csv(name):
        p = json.loads((fixtures / name).read_text(encoding="utf-8"))["properties"]["parameter"]["T2M"]
        rows = [(f"{k[:4]}-{k[4:]}", v) for k, v in p.items() if not k.endswith("13")]
        return pd.DataFrame(rows, columns=["fecha", "valor"]).to_csv(index=False).encode()

    def spec(slot, name, fname, lat, lon):
        c = state.CsvSpec(content=to_csv(fname), filename=fname, date_column="fecha", value_column="valor",
                          fmt=CsvFormat(), source_name="NASA POWER (exportado a CSV)", product="MERRA-2",
                          spatial_resolution="celda 0.5° × 0.625°", declared_synthetic=declared_synthetic)
        return state.SiteSpec(slot, "csv", name=name, lat=lat, lon=lon, csv=c)

    cfg = state.LabConfig(mode="csv", code="T2M", site_a=spec("A", "Mexicali", "power_mexicali_1981_2025.json", 32.62, -115.45),
                          site_b=spec("B", "Ushuaia", "power_ushuaia_1981_2025.json", None, None),
                          start=1981, end=2025, alpha=0.05, reference=(1991, 2020),
                          csv_declared_synthetic=declared_synthetic)
    theme.inject_css()
    st.session_state["ctx"] = state.compute(cfg)
    getattr(pages, page_name)()


@pytest.mark.parametrize("page", ["lab", "analysis", "compare", "methods"])
@pytest.mark.parametrize("declared_synthetic", [False, True])
def test_csv_mode_with_data_renders(page, declared_synthetic):
    at = AppTest.from_function(_csv_data_script, args=(page, declared_synthetic), default_timeout=120).run()
    assert not at.exception, [e.value for e in at.exception]
    assert not at.error, [e.value for e in at.error]
    banner = [m.value for m in at.markdown if 'class="tl-banner' in m.value][0]
    if declared_synthetic:
        assert "DATOS SINTÉTICOS" in banner and "CSV" in banner
    else:
        assert "fuente declarada: NASA POWER (exportado a CSV)" in banner and "SINTÉTICOS" not in banner
    if page == "analysis":
        verdicts = [m.value for m in at.markdown if 'class="tl-verdict"' in m.value]
        assert "Creciente · +0.46 °C/década" in verdicts[0]  # mismas cifras que la ruta directa de POWER


def test_csv_sidebar_end_to_end_upload_declare_confirm(load_fixture):
    """Flujo real del panel: subir 2 CSV → pide fuente → pide confirmar unidad → analiza con cifras correctas."""
    import pandas as pd

    def to_csv(name):
        p = load_fixture(name)["properties"]["parameter"]["T2M"]
        rows = [(f"{k[:4]}-{k[4:]}", str(v).replace(".", ",")) for k, v in p.items() if not k.endswith("13")]
        return pd.DataFrame(rows, columns=["mes", "t2m"]).to_csv(index=False, sep=";").encode()

    at = AppTest.from_function(_csv_no_files_script, args=("analysis",), default_timeout=120).run()
    at.file_uploader(key="csv_file_A").set_value(("mexicali.csv", to_csv("power_mexicali_1981_2025.json"), "text/csv"))
    at.file_uploader(key="csv_file_B").set_value(("ushuaia.csv", to_csv("power_ushuaia_1981_2025.json"), "text/csv"))
    at.selectbox(key="csv_dec").set_value(",")
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("fuente de los datos" in i.value for i in at.info)

    at.text_input(key="csv_source").input("NASA POWER (exportado a CSV)").run()
    assert any("Confirma" in i.value for i in at.info)

    at.checkbox(key="csv_unit_ok_T2M").check().run()
    assert not at.exception and not at.error, [e.value for e in at.error]
    verdicts = [m.value for m in at.markdown if 'class="tl-verdict"' in m.value]
    assert "Creciente · +0.46 °C/década" in verdicts[0]  # coma decimal + ';' + columnas autodetectadas
    slider = [s for s in at.slider if s.key and s.key.startswith("years_csv_")]
    assert slider and slider[0].value == (1981, 2025)  # el período se ajustó a las fechas del archivo
