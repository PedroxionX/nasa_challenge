"""Adaptador CSV mínimo (preparación para los recursos oficiales del 13 de noviembre).

Permite cargar cualquier serie MENSUAL con columnas de fecha y valor, declarando explícitamente
unidad, variable y procedencia. No adivina unidades ni frecuencias: si algo no cuadra, falla.
"""

from __future__ import annotations

from typing import IO

import numpy as np
import pandas as pd

from ..config import Location, VariableSpec
from ..schema import Provenance, SeriesBundle, make_frame
from .base import DataSourceError


def load_monthly_csv(source: str | IO, variable: VariableSpec, location: Location, *, unit: str,
                     source_name: str, product: str, date_column: str = "date", value_column: str = "value",
                     fill_values: tuple[float, ...] = (-999.0, -9999.0), is_synthetic: bool = False,
                     spatial_resolution: str = "no declarada") -> SeriesBundle:
    try:
        raw = pd.read_csv(source)
    except Exception as exc:  # noqa: BLE001 - se re-lanza con mensaje claro
        raise DataSourceError("No se pudo leer el CSV.", details=str(exc)) from exc
    for col in (date_column, value_column):
        if col not in raw.columns:
            raise DataSourceError(f"El CSV no tiene la columna '{col}'. Columnas: {list(raw.columns)}")
    if unit != variable.native_unit:
        raise DataSourceError(f"La unidad declarada '{unit}' no coincide con la esperada '{variable.native_unit}' "
                              f"para {variable.code}. Convierte explícitamente antes de cargar.")
    ts = pd.to_datetime(raw[date_column], errors="coerce")
    if ts.isna().any():
        raise DataSourceError(f"{int(ts.isna().sum())} fechas no se pudieron interpretar.")
    if not (ts.dt.day == 1).all():
        raise DataSourceError("Se esperaban fechas mensuales con día 1 (AAAA-MM-01).")
    vals = pd.to_numeric(raw[value_column], errors="coerce").to_numpy(dtype=float)
    is_fill = np.isin(vals, fill_values)
    flags = np.where(is_fill, "fill_value", np.where(np.isnan(vals), "missing", "ok"))
    vals = np.where(is_fill, np.nan, vals)
    df = make_frame(ts.dt.to_period("M").dt.to_timestamp(), vals, variable=variable, location=location, unit=unit,
                    source=source_name, product=product, spatial_resolution=spatial_resolution,
                    is_synthetic=is_synthetic, quality_flags=flags)
    prov = Provenance(source=source_name, product=product, is_synthetic=is_synthetic,
                      retrieved_at_utc=Provenance.now_utc(), notes=["Cargado desde CSV local."])
    return SeriesBundle(df, variable, location, prov)
