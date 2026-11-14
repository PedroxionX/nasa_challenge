"""Esquema interno normalizado (formato largo) y metadatos de procedencia.

Toda fuente de datos (sintética, NASA POWER, CSV, y en el futuro NetCDF) debe producir un
DataFrame con estas columnas. El motor científico solo conoce este esquema.
"""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from .config import Location, VariableSpec

NORMALIZED_COLUMNS: tuple[str, ...] = (
    "timestamp",  # datetime64: primer día del mes observado
    "variable",  # código de la variable (p. ej. "T2M")
    "value",  # float; NaN si falta
    "unit",  # unidad del valor TAL COMO SE ENTREGA (p. ej. "°C", "mm/día")
    "latitude",  # grados decimales (solicitados)
    "longitude",
    "location_id",
    "source",  # "NASA POWER" | "SINTÉTICO" | "CSV" ...
    "product",  # producto científico (p. ej. "MERRA2") o escenario sintético
    "temporal_resolution",  # "monthly"
    "spatial_resolution",  # descripción legible
    "quality_flag",  # "ok" | "missing" | "fill_value" | "out_of_range"
    "is_synthetic",  # bool
)

QUALITY_FLAGS = {"ok", "missing", "fill_value", "out_of_range"}


class SchemaError(ValueError):
    """El DataFrame no cumple el esquema normalizado."""


def validate_normalized(df: pd.DataFrame) -> None:
    """Valida columnas, tipos básicos y coherencia del indicador sintético/real."""
    missing = [c for c in NORMALIZED_COLUMNS if c not in df.columns]
    if missing:
        raise SchemaError(f"Faltan columnas del esquema normalizado: {missing}")
    if df.empty:
        raise SchemaError("La serie está vacía.")
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        raise SchemaError("La columna 'timestamp' debe ser datetime64.")
    if not pd.api.types.is_numeric_dtype(df["value"]):
        raise SchemaError("La columna 'value' debe ser numérica.")
    bad_flags = set(df["quality_flag"].unique()) - QUALITY_FLAGS
    if bad_flags:
        raise SchemaError(f"Indicadores de calidad desconocidos: {sorted(bad_flags)}")
    if df["is_synthetic"].nunique() != 1:
        raise SchemaError("Una serie no puede mezclar datos sintéticos y reales.")
    if df["variable"].nunique() != 1:
        raise SchemaError("Una serie debe contener una sola variable.")
    if df["location_id"].nunique() != 1:
        raise SchemaError("Una serie debe contener una sola ubicación.")


@dataclass
class Provenance:
    """De dónde vienen los datos y cómo se obtuvieron. Se muestra junto a cada resultado."""

    source: str
    product: str
    is_synthetic: bool
    retrieved_at_utc: str
    request_url: str | None = None
    api_version: str | None = None
    grid_cell: dict[str, float] | None = None  # lat/lon solicitados y elevación que reporta la API
    seed: int | None = None
    from_cache: bool = False
    source_annual_values: dict[int, float] = field(default_factory=dict)  # p. ej. el "mes 13" de POWER
    notes: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)
    origin: str = "unknown"  # "synthetic" | "nasa_power" | "csv": decide advertencias y redacción

    @staticmethod
    def now_utc() -> str:
        return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class SeriesBundle:
    """Serie mensual normalizada + metadatos. Unidad de intercambio entre fuente y motor."""

    data: pd.DataFrame
    variable: VariableSpec
    location: Location
    provenance: Provenance

    def __post_init__(self) -> None:
        validate_normalized(self.data)
        if bool(self.data["is_synthetic"].iloc[0]) != self.provenance.is_synthetic:
            raise SchemaError("Inconsistencia: procedencia y datos difieren en el indicador sintético.")

    @property
    def is_synthetic(self) -> bool:
        return self.provenance.is_synthetic


def make_frame(
    timestamps: pd.DatetimeIndex | list,
    values: np.ndarray | list,
    *,
    variable: VariableSpec,
    location: Location,
    unit: str,
    source: str,
    product: str,
    spatial_resolution: str,
    is_synthetic: bool,
    quality_flags: list[str] | np.ndarray | None = None,
) -> pd.DataFrame:
    """Construye un DataFrame normalizado a partir de vectores."""
    values = np.asarray(values, dtype=float)
    n = len(values)
    if quality_flags is None:
        quality_flags = np.where(np.isnan(values), "missing", "ok")
    return pd.DataFrame(
        {
            "timestamp": pd.to_datetime(timestamps),
            "variable": variable.code,
            "value": values,
            "unit": unit,
            "latitude": float(location.lat),
            "longitude": float(location.lon),
            "location_id": location.id,
            "source": source,
            "product": product,
            "temporal_resolution": "monthly",
            "spatial_resolution": spatial_resolution,
            "quality_flag": np.asarray(quality_flags, dtype=object),
            "is_synthetic": bool(is_synthetic),
        },
        index=pd.RangeIndex(n),
    )
