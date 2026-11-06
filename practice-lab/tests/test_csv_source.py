"""Adaptador CSV: fidelidad con datos reales, formatos aceptados y rechazos explícitos."""

import io
import json

import numpy as np
import pandas as pd
import pytest

from trendlens.config import PRESETS_BY_ID, VARIABLES, Location
from trendlens.data.base import DataSourceError
from trendlens.data.csv_source import (MAX_CSV_BYTES, CsvFormat, example_csv, guess_columns, load_monthly_csv,
                                       read_csv_table)
from trendlens.data.nasa_power import parse_power_monthly
from trendlens.explain import explain_trend
from trendlens.stats.compare import compare_results
from trendlens.stats.engine import analyze_bundle

LOC = Location("csv_A", "Mexicali (CSV)", 32.62, -115.45)
T2M, PREC = VARIABLES["T2M"], VARIABLES["PRECTOTCORR"]


def power_to_csv(payload: dict, code: str) -> bytes:
    """Convierte la respuesta grabada de POWER a un CSV largo (fecha, valor), sin el 'mes 13'."""
    rows = [(f"{k[:4]}-{k[4:]}", v) for k, v in payload["properties"]["parameter"][code].items() if not k.endswith("13")]
    return pd.DataFrame(rows, columns=["fecha", "valor"]).to_csv(index=False).encode()


def load(content, var=T2M, **kw):
    args = dict(unit=var.native_unit, source_name="Prueba", product="test", date_column="fecha", value_column="valor")
    args.update(kw)
    return load_monthly_csv(content, var, LOC, **args)


@pytest.mark.parametrize("code", ["T2M", "PRECTOTCORR"])
def test_csv_path_reproduces_direct_power_analysis(load_fixture, code):
    payload = load_fixture("power_mexicali_1981_2025.json")
    direct = analyze_bundle(parse_power_monthly(payload, VARIABLES[code], PRESETS_BY_ID["mexicali"],
                                                request_url="x", retrieved_at_utc="t"), 1981, 2025)
    via_csv = analyze_bundle(load(power_to_csv(payload, code), VARIABLES[code]), 1981, 2025)
    np.testing.assert_allclose(via_csv.core.values, direct.core.values, rtol=1e-12)
    assert via_csv.slope_per_decade == pytest.approx(direct.slope_per_decade, rel=1e-12)
    assert via_csv.p_value == pytest.approx(direct.p_value, rel=1e-12)
    assert via_csv.provenance.origin == "csv" and not via_csv.is_synthetic


def test_semicolon_decimal_comma_header_lines_and_autodetect():
    text = "# exportado de una herramienta\n# variable: T2M\nfecha;valor\n2001-01;12,5\n2001-02;13,25\n"
    b = load(text.encode(), fmt=CsvFormat(sep=None, decimal=",", skiprows=2))
    assert b.data["value"].tolist() == [12.5, 13.25]
    b2 = load(text.encode(), fmt=CsvFormat(sep=";", decimal=",", skiprows=2))
    assert b2.data["value"].tolist() == [12.5, 13.25]


def test_yyyymm_integer_dates():
    b = load(b"fecha,valor\n200101,1.0\n200102,2.0\n")
    assert b.data["timestamp"].dt.strftime("%Y-%m").tolist() == ["2001-01", "2001-02"]


def test_mid_month_dates_need_explicit_option():
    content = b"fecha,valor\n2001-01-15,1\n2001-02-15,2\n"
    with pytest.raises(DataSourceError, match="día 1"):
        load(content)
    b = load(content, fmt=CsvFormat(normalize_to_month_start=True))
    assert (b.data["timestamp"].dt.day == 1).all()


def test_daily_data_is_rejected_even_with_normalization():
    content = b"fecha,valor\n2001-01-01,1\n2001-01-02,2\n2001-02-01,3\n"
    with pytest.raises(DataSourceError, match="más de un valor"):
        load(content, fmt=CsvFormat(normalize_to_month_start=True))


def test_ambiguous_slash_dates_rejected():
    with pytest.raises(DataSourceError, match="ambiguas"):
        load(b"fecha,valor\n01/02/2001,1\n")


def test_non_numeric_values_and_wrong_decimal_are_errors():
    with pytest.raises(DataSourceError, match="no son numéricos"):
        load(b"fecha;valor\n2001-01;12,5\n2001-02;13,1\n", fmt=CsvFormat(sep=";", decimal="."))
    with pytest.raises(DataSourceError, match="no son numéricos"):
        load(b"fecha,valor\n2001-01,M\n2001-02,3\n")


def test_missing_values_and_fill_markers():
    b = load(b"fecha,valor\n2001-01,\n2001-02,-999\n2001-03,4.5\n")
    assert b.data["quality_flag"].tolist() == ["missing", "fill_value", "ok"]
    assert b.data["value"].isna().sum() == 2


def test_declaration_and_structure_errors():
    with pytest.raises(DataSourceError, match="columna 'valor'"):
        load(b"fecha,temp\n2001-01,1\n")
    with pytest.raises(DataSourceError, match="unidad declarada"):
        load(b"fecha,valor\n2001-01,290\n", unit="K")
    with pytest.raises(DataSourceError, match="fuente"):
        load(b"fecha,valor\n2001-01,1\n", source_name="  ")
    with pytest.raises(DataSourceError, match="MB"):
        load(b"x" * (MAX_CSV_BYTES + 1))
    with pytest.raises(DataSourceError, match="ningún dato válido"):
        load(b"fecha,valor\n2001-01,\n2001-02,\n")


def test_provenance_and_synthetic_declaration():
    b = load(b"fecha,valor\n2001-01,1\n", is_synthetic=True, filename="mi.csv", spatial_resolution="estación")
    p = b.provenance
    assert p.origin == "csv" and p.is_synthetic and b.data["is_synthetic"].all()
    assert p.extra["filename"] == "mi.csv" and p.extra["spatial_resolution"] == "estación"
    assert any("no la verificó" in n for n in p.notes)


def test_example_csv_roundtrips_and_is_marked_synthetic():
    content = example_csv(T2M)
    df = read_csv_table(content)
    assert (df["origen"] == "SINTÉTICO — SOLO DEMOSTRACIÓN").all()
    assert guess_columns(df) == ("fecha", "valor")
    b = load(content, is_synthetic=True)
    assert len(b.data) == 45 * 12


def test_csv_results_use_csv_wording_not_power(load_fixture):
    payload = load_fixture("power_mexicali_1981_2025.json")
    r = analyze_bundle(load(power_to_csv(payload, "T2M"), filename="mexicali.csv"), 1981, 2025)
    codes = {w.code for w in r.warnings}
    assert "user_data" in codes and "grid_point" not in codes
    e = explain_trend(r)
    assert "CSV" in e["resumen"] and "NASA POWER" not in e["resumen"]
    assert any("no puede verificar" in s for s in e["no_concluir"])


def test_same_file_twice_is_not_comparable_but_same_coords_are_fine(load_fixture):
    payload = load_fixture("power_mexicali_1981_2025.json")
    content = power_to_csv(payload, "T2M")
    ra = analyze_bundle(load(content), 1981, 2025)
    rb = analyze_bundle(load(content), 1981, 2025)
    c = compare_results(ra, rb)
    assert c.pattern == "no_comparable" and any(ch.label == "Series distintas" and not ch.ok for ch in c.checks)
    other = power_to_csv(load_fixture("power_ushuaia_1981_2025.json"), "T2M")
    c2 = compare_results(ra, analyze_bundle(load(other), 1981, 2025))  # mismas coordenadas declaradas
    assert c2.comparable and not any("MERRA-2" in ch.detail for ch in c2.checks)
