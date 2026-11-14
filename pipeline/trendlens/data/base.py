"""Interfaz común de fuentes de datos.

Regla del laboratorio: si una fuente real falla, se lanza `DataSourceError` y la interfaz
lo muestra. **Nunca** se sustituye en silencio por datos sintéticos.
"""

from __future__ import annotations

from typing import Protocol

from ..config import Location, VariableSpec
from ..schema import SeriesBundle


class DataSourceError(RuntimeError):
    """Error al obtener datos de una fuente. `user_message` está en español y es mostrable."""

    def __init__(self, user_message: str, *, details: str | None = None, status_code: int | None = None):
        super().__init__(user_message if details is None else f"{user_message} — {details}")
        self.user_message = user_message
        self.details = details
        self.status_code = status_code


class DataSource(Protocol):
    """Contrato mínimo que cumple cualquier adaptador (sintético, POWER, CSV, NetCDF futuro)."""

    name: str

    def fetch(self, variable: VariableSpec, location: Location, start_year: int, end_year: int) -> SeriesBundle:
        """Devuelve la serie MENSUAL normalizada para [start_year, end_year] o lanza DataSourceError."""
        ...
