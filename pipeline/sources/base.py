"""Interfaz común de las fuentes (T016)."""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np

from trendlens.data.base import DataSourceError

MAX_RETRIES = 3
BACKOFF_S = (2.0, 4.0, 8.0)


@dataclass
class SourceInfo:
    """Procedencia común a todas las series de una variable leídas de una fuente."""

    source: str
    product: str
    short_name: str
    version: str
    doi: str | None
    api_version: str
    parameter: str
    unit_declared: str
    grid_text: str


@dataclass
class GridData:
    """Valores mensuales por celda. `values[i, k]` = celda i, mes k (NaN = faltante), en la unidad de `spec`."""

    lats: np.ndarray
    lons: np.ndarray
    months: list[tuple[int, int]]
    values: np.ndarray
    info: SourceInfo
    retrieved_by_region: dict[str, str] = field(default_factory=dict)
    granules_by_region: dict[str, int] = field(default_factory=dict)


class ReadFailed(DataSourceError):
    """Una o más lecturas siguen fallando tras los reintentos. Nada se publica."""

    def __init__(self, failures: list[dict[str, str]], affected_regions: list[str] | None = None):
        self.failures = failures
        self.affected_regions = affected_regions or []
        lines = "; ".join(f"{f.get('variable', '')} {f.get('item', '')}: {f.get('error', '')}" for f in failures[:10])
        super().__init__(f"{len(failures)} lectura(s) fallaron tras {MAX_RETRIES} reintentos: {lines}")


class Source(Protocol):
    """Lo que `build.py` necesita de una fuente."""

    id: str
    manifest: list[dict[str, Any]]

    def read(self, var: Any, regions: list[Any], weights: dict[str, Any], union_lats: np.ndarray,
             union_lons: np.ndarray, first_year: int, end_year: int) -> GridData: ...


def now_utc() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
