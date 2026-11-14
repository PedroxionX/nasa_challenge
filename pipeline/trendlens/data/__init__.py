"""Acceso a datos: cada fuente produce un `SeriesBundle` con el esquema normalizado."""

from .base import DataSource, DataSourceError

__all__ = ["DataSource", "DataSourceError"]
