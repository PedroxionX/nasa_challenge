"""Constructores de series de prueba con valores conocidos."""

import numpy as np
import pandas as pd

from trendlens.config import VARIABLES, Location
from trendlens.schema import Provenance, SeriesBundle, make_frame

TEST_LOC = Location("test", "Sitio de prueba", 10.0, 20.0)


def monthly_bundle(values, start="2000-01-01", code="T2M", synthetic=True, unit=None, loc=TEST_LOC,
                   timestamps=None, flags=None):
    var = VARIABLES[code]
    values = np.asarray(values, dtype=float)
    ts = timestamps if timestamps is not None else pd.date_range(start, periods=len(values), freq="MS")
    df = make_frame(ts, values, variable=var, location=loc, unit=unit or var.native_unit,
                    source="PRUEBA", product="test", spatial_resolution="n/a", is_synthetic=synthetic,
                    quality_flags=flags)
    prov = Provenance(source="PRUEBA", product="test", is_synthetic=synthetic, retrieved_at_utc="2026-11-06T00:00:00+00:00")
    return SeriesBundle(df, var, loc, prov)


def annual_to_monthly(annual_values, start_year=1981, seasonal_amp=0.0):
    """Repite cada valor anual en sus 12 meses (+ ciclo estacional opcional de media ~0)."""
    vals = []
    for v in annual_values:
        for m in range(1, 13):
            vals.append(v + seasonal_amp * np.cos(2 * np.pi * (m - 7) / 12))
    return monthly_bundle(vals, start=f"{start_year}-01-01")
