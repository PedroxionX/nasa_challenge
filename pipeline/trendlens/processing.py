"""Normalización y validación previa al análisis (Módulo D).

Pasos, en orden:
1. Validar esquema y unidad esperada de la variable.
2. Ordenar por fecha; detectar duplicados (idénticos ⇒ se eliminan; contradictorios ⇒ error).
3. Convertir marcadores de faltante residuales (-999, -9999) a NaN.
4. Marcar valores fuera de rango físico como inválidos.
5. Completar el calendario mensual para que los meses ausentes sean explícitos.
6. Convertir unidades (tasa mm/día → acumulado mm/mes con días reales del mes).
7. Agregar a serie anual solo con años completos (12 meses válidos).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .config import DEFAULT_REFERENCE_PERIOD, MIN_MONTHS_PER_YEAR, MIN_REFERENCE_YEARS, VariableSpec
from .schema import SeriesBundle, validate_normalized

FILL_MARKERS = (-999.0, -9999.0, -99.0)


class DataQualityError(ValueError):
    """Problema en los datos que impide un análisis honesto (p. ej. unidades o duplicados contradictorios)."""


@dataclass
class ProcessingReport:
    n_raw_rows: int = 0
    n_exact_duplicates_dropped: int = 0
    n_fill_values_converted: int = 0
    n_out_of_range: int = 0
    n_months_expected: int = 0
    n_months_valid: int = 0
    missing_months: list[str] = field(default_factory=list)  # "YYYY-MM"
    incomplete_years: dict[int, int] = field(default_factory=dict)  # año -> meses válidos
    complete_years: list[int] = field(default_factory=list)
    unit_in: str = ""
    unit_monthly: str = ""
    unit_annual: str = ""
    conversion_note: str = ""
    notes: list[str] = field(default_factory=list)

    @property
    def missing_fraction(self) -> float:
        if self.n_months_expected == 0:
            return 0.0
        return 1.0 - self.n_months_valid / self.n_months_expected


def _days_in_month(ts: pd.Series) -> np.ndarray:
    return pd.DatetimeIndex(ts).days_in_month.to_numpy().astype(float)


def clean_monthly(bundle: SeriesBundle, start_year: int | None = None, end_year: int | None = None
                  ) -> tuple[pd.DataFrame, ProcessingReport]:
    """Devuelve una tabla mensual limpia y completa en calendario, más el reporte de procesamiento.

    Columnas de salida: timestamp, year, month, days, value_native, value_monthly, quality_flag.
    `value_monthly` está en `variable.monthly_unit` (para precipitación: mm/mes).
    """
    var: VariableSpec = bundle.variable
    df = bundle.data.copy()
    validate_normalized(df)
    rep = ProcessingReport(n_raw_rows=len(df), unit_in=var.native_unit, unit_monthly=var.monthly_unit,
                           unit_annual=var.annual_unit)

    # 1. Unidades
    units = set(df["unit"].unique())
    if units != {var.native_unit}:
        raise DataQualityError(
            f"Unidad inesperada para {var.code}: {sorted(units)}; se esperaba '{var.native_unit}'. "
            "No se convierte a ciegas: revisa la fuente."
        )

    # 2. Orden, recorte al período pedido y duplicados
    df = df.sort_values("timestamp", kind="mergesort").reset_index(drop=True)
    if start_year is not None:
        df = df[df["timestamp"].dt.year >= int(start_year)]
    if end_year is not None:
        df = df[df["timestamp"].dt.year <= int(end_year)]
    if df.empty:
        raise DataQualityError(f"No hay datos en el período {start_year}–{end_year}.")
    df = df.reset_index(drop=True)
    dup_mask = df.duplicated(subset=["timestamp"], keep=False)
    if dup_mask.any():
        dups = df[dup_mask]
        conflicting = dups.groupby("timestamp")["value"].nunique(dropna=False)
        if (conflicting > 1).any():
            bad = [t.strftime("%Y-%m") for t in conflicting[conflicting > 1].index]
            raise DataQualityError(f"Duplicados con valores distintos en: {bad}. Se requiere decisión humana.")
        before = len(df)
        df = df.drop_duplicates(subset=["timestamp"], keep="first").reset_index(drop=True)
        rep.n_exact_duplicates_dropped = before - len(df)
        rep.notes.append(f"Se eliminaron {rep.n_exact_duplicates_dropped} filas duplicadas idénticas.")

    # 3. Marcadores de faltante residuales
    fill_mask = df["value"].isin(FILL_MARKERS)
    if fill_mask.any():
        rep.n_fill_values_converted = int(fill_mask.sum())
        df.loc[fill_mask, "value"] = np.nan
        df.loc[fill_mask, "quality_flag"] = "fill_value"
        rep.notes.append(f"{rep.n_fill_values_converted} valores de relleno (p. ej. -999) tratados como faltantes.")

    # 4. Rango físico
    oor = df["value"].notna() & ((df["value"] < var.physical_min) | (df["value"] > var.physical_max))
    if oor.any():
        rep.n_out_of_range = int(oor.sum())
        df.loc[oor, "value"] = np.nan
        df.loc[oor, "quality_flag"] = "out_of_range"
        rep.notes.append(f"{rep.n_out_of_range} valores fuera del rango físico se marcaron inválidos.")

    # 5. Calendario completo en el período pedido
    y0 = int(df["timestamp"].dt.year.min()) if start_year is None else int(start_year)
    y1 = int(df["timestamp"].dt.year.max()) if end_year is None else int(end_year)
    full = pd.DataFrame({"timestamp": pd.date_range(f"{y0}-01-01", f"{y1}-12-01", freq="MS")})
    out = full.merge(df[["timestamp", "value", "quality_flag"]], on="timestamp", how="left")
    out["quality_flag"] = out["quality_flag"].fillna("missing")
    out.loc[out["value"].isna() & (out["quality_flag"] == "ok"), "quality_flag"] = "missing"
    out["year"] = out["timestamp"].dt.year
    out["month"] = out["timestamp"].dt.month
    out["days"] = _days_in_month(out["timestamp"])
    out = out.rename(columns={"value": "value_native"})

    # 6. Conversión de unidades
    if var.aggregation == "sum_from_rate":
        out["value_monthly"] = out["value_native"] * out["days"]
        rep.conversion_note = (
            f"Tasa en {var.native_unit} × días del mes (28/29/30/31) = acumulado en {var.monthly_unit}; "
            f"suma de 12 meses = {var.annual_unit}."
        )
    else:
        out["value_monthly"] = out["value_native"]
        rep.conversion_note = (
            f"Promedio anual = Σ(Tmes × días) / Σ días (ponderado por la duración real de cada mes)."
        )

    rep.n_months_expected = len(out)
    valid = out["value_native"].notna()
    rep.n_months_valid = int(valid.sum())
    rep.missing_months = [t.strftime("%Y-%m") for t in out.loc[~valid, "timestamp"]]
    counts = out.loc[valid].groupby("year").size().reindex(range(y0, y1 + 1), fill_value=0)
    rep.incomplete_years = {int(y): int(c) for y, c in counts.items() if c < MIN_MONTHS_PER_YEAR}
    rep.complete_years = [int(y) for y, c in counts.items() if c >= MIN_MONTHS_PER_YEAR]
    if rep.incomplete_years:
        rep.notes.append(
            f"{len(rep.incomplete_years)} año(s) con menos de {MIN_MONTHS_PER_YEAR} meses válidos se excluyen "
            "del análisis anual (no se rellenan ni se interpolan)."
        )
    return out, rep


def to_annual(monthly: pd.DataFrame, variable: VariableSpec) -> pd.DataFrame:
    """Serie anual con solo años completos. Columnas: year, value, n_months, days."""
    rows = []
    for year, g in monthly.groupby("year"):
        valid = g["value_native"].notna()
        n_valid = int(valid.sum())
        if n_valid < MIN_MONTHS_PER_YEAR:
            continue
        if variable.aggregation == "mean":
            value = float(np.sum(g["value_native"] * g["days"]) / np.sum(g["days"]))
        elif variable.aggregation == "sum_from_rate":
            value = float(np.sum(g["value_monthly"]))
        else:  # pragma: no cover - protegido por el catálogo
            raise ValueError(variable.aggregation)
        rows.append({"year": int(year), "value": value, "n_months": n_valid, "days": int(g["days"].sum())})
    return pd.DataFrame(rows, columns=["year", "value", "n_months", "days"])


@dataclass
class AnomalyInfo:
    available: bool
    reference: tuple[int, int]
    reference_mean: float | None = None
    n_reference_years: int = 0
    reason: str = ""


def anomalies(annual: pd.DataFrame, reference: tuple[int, int] = DEFAULT_REFERENCE_PERIOD
              ) -> tuple[pd.Series | None, AnomalyInfo]:
    """Anomalía = valor − media del período de referencia (solo años completos dentro de él).

    Restar una constante no cambia la pendiente: las anomalías sirven para comparar sitios con
    climatologías distintas en una misma escala, no para "mejorar" la tendencia.
    """
    r0, r1 = reference
    in_ref = annual[(annual["year"] >= r0) & (annual["year"] <= r1)]
    n_ref = len(in_ref)
    expected = r1 - r0 + 1
    if n_ref < MIN_REFERENCE_YEARS:
        return None, AnomalyInfo(False, reference, None, n_ref,
                                 f"Solo hay {n_ref} años completos en {r0}–{r1} (mínimo {MIN_REFERENCE_YEARS}).")
    ref_mean = float(in_ref["value"].mean())
    reason = "" if n_ref == expected else f"Referencia calculada con {n_ref} de {expected} años (faltan años completos)."
    return annual["value"] - ref_mean, AnomalyInfo(True, reference, ref_mean, n_ref, reason)


def choose_reference_period(years: list[int]) -> tuple[int, int]:
    """1991–2020 si cabe en los datos; si no, los primeros 30 años disponibles (o todos)."""
    if not years:
        return DEFAULT_REFERENCE_PERIOD
    y0, y1 = min(years), max(years)
    r0, r1 = DEFAULT_REFERENCE_PERIOD
    if y0 <= r0 and y1 >= r1:
        return DEFAULT_REFERENCE_PERIOD
    return (y0, min(y1, y0 + 29))


def seasonal_matrix(monthly: pd.DataFrame) -> pd.DataFrame:
    """Tabla año × mes con `value_monthly` (NaN si falta). Entrada para Seasonal Mann-Kendall."""
    return monthly.pivot(index="year", columns="month", values="value_monthly").reindex(columns=range(1, 13))
