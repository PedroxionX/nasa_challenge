"""Exportación de resultados a CSV, siempre con procedencia e indicador sintético/real."""

from __future__ import annotations

import pandas as pd

from .stats.compare import ComparisonResult
from .stats.engine import TrendResult


def annual_table(results: dict[str, TrendResult]) -> pd.DataFrame:
    frames = []
    for slot, r in results.items():
        df = r.annual[["year", "value", "n_months"]].copy()
        df.insert(0, "sitio", slot)
        df.insert(1, "ubicacion", r.location.name)
        df["latitud"] = r.location.lat
        df["longitud"] = r.location.lon
        df["variable"] = r.variable.code
        df["unidad"] = r.unit
        df["fuente"] = r.provenance.source
        df["producto"] = r.provenance.product
        df["es_sintetico"] = r.is_synthetic
        df["consultado_utc"] = r.provenance.retrieved_at_utc
        frames.append(df)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def results_table(results: dict[str, TrendResult], cmp: ComparisonResult | None = None) -> pd.DataFrame:
    rows = []
    for slot, r in results.items():
        c = r.core
        o = c.ols
        span = r.analyzed_span or (None, None)
        rows.append({
            "fila": f"sitio {slot}", "ubicacion": r.location.name, "variable": r.variable.code,
            "unidad_pendiente": f"{r.unit}/década", "anio_inicial": span[0], "anio_final": span[1], "n_anios": r.n,
            "pendiente_sen": r.slope_per_decade, "ic95_inf": r.ci_per_decade[0], "ic95_sup": r.ci_per_decade[1],
            "prueba_principal": c.primary.test_name, "p_principal": c.primary.p_value, "veredicto": r.verdict,
            "p_mk_original": c.mk.p_value, "p_hamed_rao": c.mk_hr.p_value,
            "pendiente_mco": (o.slope * 10) if o else None,
            "p_mco_ajustado": (o.adj_p_value if (o and o.adj_valid) else (o.p_value if o else None)),
            "anios_para_detectar": r.detectability_years,
            "anios_excluidos": ";".join(str(y) for y in sorted(r.processing.incomplete_years)),
            "es_sintetico": r.is_synthetic, "fuente": r.provenance.source, "producto": r.provenance.product,
            "url_solicitud": r.provenance.request_url, "consultado_utc": r.provenance.retrieved_at_utc,
            "origen": r.provenance.origin, "archivo_origen": r.provenance.extra.get("filename"),
            "semilla": r.provenance.seed,
        })
    if cmp is not None and cmp.diff is not None:
        d = cmp.diff
        any_r = next(iter(results.values()))
        rows.append({
            "fila": "diferencia A−B", "variable": any_r.variable.code, "unidad_pendiente": f"{any_r.unit}/década",
            "anio_inicial": cmp.common_years[0], "anio_final": cmp.common_years[-1], "n_anios": cmp.n_common,
            "pendiente_sen": d.sen_slope * 10, "ic95_inf": d.sen_ci[0] * 10, "ic95_sup": d.sen_ci[1] * 10,
            "prueba_principal": d.primary.test_name, "p_principal": d.primary.p_value,
            "veredicto": "difieren" if cmp.differ_significantly else "sin evidencia de diferencia",
            "pendiente_mco": d.ols.slope * 10 if d.ols else None, "patron": cmp.pattern,
            "es_sintetico": any_r.is_synthetic,
        })
    return pd.DataFrame(rows)


def to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8-sig")  # BOM: Excel abre bien los acentos
