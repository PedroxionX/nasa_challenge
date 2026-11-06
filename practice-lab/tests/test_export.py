"""La exportación CSV conserva procedencia, período e indicador sintético/real."""

import io

import pandas as pd

from trendlens.config import VARIABLES
from trendlens.data.synthetic import SCENARIOS, generate_monthly
from trendlens.export import annual_table, results_table, to_csv_bytes
from trendlens.stats.compare import compare_results
from trendlens.stats.engine import analyze_bundle


def test_results_csv_contains_provenance_period_and_synthetic_flag():
    ra = analyze_bundle(generate_monthly(SCENARIOS["opuesta_pos"], VARIABLES["T2M"], "A"), 1981, 2025)
    rb = analyze_bundle(generate_monthly(SCENARIOS["opuesta_neg"], VARIABLES["T2M"], "B"), 1981, 2025)
    res = {"A": ra, "B": rb}
    df = pd.read_csv(io.BytesIO(to_csv_bytes(results_table(res, compare_results(ra, rb)))), encoding="utf-8-sig")
    assert list(df["fila"]) == ["sitio A", "sitio B", "diferencia A−B"]
    assert df["es_sintetico"].all()
    assert (df.loc[:1, "anio_inicial"] == 1981).all() and (df.loc[:1, "anio_final"] == 2025).all()
    assert df.loc[0, "semilla"] == SCENARIOS["opuesta_pos"].seed
    assert df.loc[0, "pendiente_sen"] == ra.slope_per_decade
    annual = annual_table(res)
    assert len(annual) == 90 and set(annual["unidad"]) == {"°C"} and annual["consultado_utc"].notna().all()
