"""Adaptador CSV (preparación para los recursos oficiales del 13 de noviembre).

Carga una serie MENSUAL en formato largo (una fila por mes: fecha + valor), con procedencia DECLARADA
por quien sube el archivo. No adivina nada que pueda cambiar el resultado:
* la unidad se declara y debe coincidir con la de la variable (no hay conversiones implícitas);
* las fechas deben ser ISO (AAAA-MM, AAAA-MM-DD) o AAAAMM; las fechas con '/' se rechazan por ambiguas;
* un valor no vacío que no sea numérico es un error (p. ej. coma decimal mal declarada);
* más de un valor por mes (datos diarios) es un error: hay que agregarlos antes.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import IO

import numpy as np
import pandas as pd

from ..config import Location, VariableSpec
from ..schema import Provenance, SeriesBundle, make_frame
from .base import DataSourceError

MAX_CSV_BYTES = 5 * 1024 * 1024  # una serie mensual por punto ocupa unos pocos KB
DATE_HINTS = ("date", "fecha", "time", "tiempo", "mes", "month", "periodo", "period")


@dataclass(frozen=True)
class CsvFormat:
    sep: str | None = ","  # None = detectar automáticamente
    decimal: str = "."
    skiprows: int = 0
    normalize_to_month_start: bool = False  # True: '2001-01-15' se toma como enero de 2001


def _as_source(source: str | bytes | IO) -> str | IO:
    if isinstance(source, bytes):
        if len(source) > MAX_CSV_BYTES:
            raise DataSourceError(f"El archivo pesa {len(source) / 1e6:.1f} MB; el máximo es "
                                  f"{MAX_CSV_BYTES / 1e6:.0f} MB. Una serie mensual por punto debería ocupar KB.")
        return io.BytesIO(source)
    return source


def read_csv_table(source: str | bytes | IO, fmt: CsvFormat = CsvFormat(), nrows: int | None = None) -> pd.DataFrame:
    kw: dict = dict(decimal=fmt.decimal, skiprows=int(fmt.skiprows), nrows=nrows)
    if fmt.sep is None:
        kw.update(sep=None, engine="python")
    else:
        kw["sep"] = fmt.sep
    try:
        df = pd.read_csv(_as_source(source), **kw)
    except DataSourceError:
        raise
    except Exception as exc:  # noqa: BLE001 - se re-lanza con mensaje claro
        raise DataSourceError("No se pudo leer el CSV (revisa separador y filas a omitir).", details=str(exc)) from exc
    df.columns = [str(c).strip() for c in df.columns]
    if df.empty:
        raise DataSourceError("El CSV no tiene filas de datos.")
    return df


def guess_columns(df: pd.DataFrame) -> tuple[str, str | None]:
    """Sugerencia inicial (el usuario siempre puede cambiarla): columna de fecha y de valor."""
    cols = list(df.columns)
    date_col = next((c for c in cols if any(h in c.lower() for h in DATE_HINTS)), cols[0])
    value_col = next((c for c in cols if c != date_col and pd.api.types.is_numeric_dtype(df[c])), None)
    if value_col is None:
        value_col = next((c for c in cols if c != date_col), None)
    return date_col, value_col


def parse_monthly_dates(col: pd.Series, normalize_to_month_start: bool = False) -> pd.Series:
    if pd.api.types.is_float_dtype(col) and col.notna().all() and (col % 1 == 0).all():
        col = col.astype("int64")
    s = col.astype(str).str.strip()
    if s.str.contains("/", regex=False).any():
        raise DataSourceError("Hay fechas con '/' (p. ej. "
                              f"'{s[s.str.contains('/', regex=False)].iloc[0]}'), que son ambiguas: ¿día/mes o mes/día? "
                              "Usa formato ISO: AAAA-MM o AAAA-MM-DD.")
    if s.str.fullmatch(r"\d{6}").all():
        ts = pd.to_datetime(s, format="%Y%m", errors="coerce")
    else:
        ts = pd.to_datetime(s, format="ISO8601", errors="coerce")
    if ts.isna().any():
        bad = s[ts.isna()].head(3).tolist()
        raise DataSourceError(f"{int(ts.isna().sum())} fechas no se pudieron interpretar (p. ej. {bad}). "
                              "Formatos aceptados: AAAA-MM, AAAA-MM-DD o AAAAMM.")
    if not normalize_to_month_start and not (ts.dt.day == 1).all():
        ex = s[ts.dt.day != 1].iloc[0]
        raise DataSourceError(f"Se esperaban fechas mensuales con día 1 (encontré '{ex}'). Si cada fila es un mes "
                              "fechado a mitad de mes, activa «usar el mes de cada fecha».")
    month = ts.dt.to_period("M").dt.to_timestamp()
    if month.duplicated().any():
        dup = month[month.duplicated()].iloc[0].strftime("%Y-%m")
        raise DataSourceError(f"Hay más de un valor para el mes {dup} (¿datos diarios?). El laboratorio necesita "
                              "una fila por mes: agrega los datos a mensuales antes de cargarlos.")
    return month


def load_monthly_csv(source: str | bytes | IO, variable: VariableSpec, location: Location, *, unit: str,
                     source_name: str, product: str, date_column: str = "date", value_column: str = "value",
                     fmt: CsvFormat = CsvFormat(), fill_values: tuple[float, ...] = (-999.0, -9999.0),
                     is_synthetic: bool = False, spatial_resolution: str = "no declarada",
                     filename: str | None = None) -> SeriesBundle:
    if not source_name.strip():
        raise DataSourceError("Declara la fuente de los datos: sin procedencia no hay resultado verificable.")
    if unit != variable.native_unit:
        raise DataSourceError(f"La unidad declarada '{unit}' no coincide con la esperada '{variable.native_unit}' "
                              f"para {variable.code}. Convierte explícitamente antes de cargar.")
    raw = read_csv_table(source, fmt)
    for col in (date_column, value_column):
        if col not in raw.columns:
            raise DataSourceError(f"El CSV no tiene la columna '{col}'. Columnas: {list(raw.columns)}")
    if date_column == value_column:
        raise DataSourceError("La columna de fecha y la de valor deben ser distintas.")
    raw = raw.dropna(subset=[date_column]).reset_index(drop=True)
    ts = parse_monthly_dates(raw[date_column], fmt.normalize_to_month_start)
    num = pd.to_numeric(raw[value_column], errors="coerce")
    bad = raw[value_column].notna() & num.isna()
    if bad.any():
        ex = raw.loc[bad, value_column].astype(str).head(3).tolist()
        raise DataSourceError(f"{int(bad.sum())} valores no son numéricos (p. ej. {ex}). ¿Separador decimal "
                              "incorrecto o un marcador de faltante no declarado?")
    vals = num.to_numpy(dtype=float)
    is_fill = np.isin(vals, fill_values)
    flags = np.where(is_fill, "fill_value", np.where(np.isnan(vals), "missing", "ok"))
    vals = np.where(is_fill, np.nan, vals)
    if np.all(np.isnan(vals)):
        raise DataSourceError("La columna de valores no contiene ningún dato válido.")
    df = make_frame(ts, vals, variable=variable, location=location, unit=unit, source=source_name, product=product,
                    spatial_resolution=spatial_resolution, is_synthetic=is_synthetic, quality_flags=flags)
    prov = Provenance(
        source=source_name, product=product or "no declarado", is_synthetic=is_synthetic,
        retrieved_at_utc=Provenance.now_utc(), origin="csv",
        notes=["Cargado desde un CSV local. Procedencia DECLARADA por quien subió el archivo; el laboratorio no la verificó."]
              + (["Declarado como datos SINTÉTICOS."] if is_synthetic else []),
        extra={"filename": filename, "declared_unit": unit, "spatial_resolution": spatial_resolution,
               "date_column": date_column, "value_column": value_column, "n_rows": int(len(raw)),
               "n_fill": int(is_fill.sum())},
    )
    return SeriesBundle(df, variable, location, prov)


def example_csv(variable: VariableSpec, scenario_key: str = "creciente") -> bytes:
    """CSV de ejemplo en el formato esperado, generado con un escenario SINTÉTICO (y marcado como tal)."""
    from .synthetic import SCENARIOS, generate_monthly

    b = generate_monthly(SCENARIOS[scenario_key], variable, "A")
    out = pd.DataFrame({"fecha": b.data["timestamp"].dt.strftime("%Y-%m"), "valor": b.data["value"],
                        "origen": "SINTÉTICO — SOLO DEMOSTRACIÓN"})
    return out.to_csv(index=False).encode("utf-8")
