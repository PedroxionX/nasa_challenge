"""Conector EXPERIMENTAL con la API mensual por punto de NASA POWER.

Verificado contra el servidor el 2026-11-06 (API v2.10.0):
* GET https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=T2M,PRECTOTCORR&community=AG&latitude=..&longitude=..&start=YYYY&end=YYYY&format=JSON
* properties.parameter.<CODE> = {"YYYYMM": valor, ...}; el mes "13" es el valor ANUAL de POWER.
* parameters.<CODE>.units: T2M → "C"; PRECTOTCORR → "mm/day" (tasa media diaria del mes).
* header.fill_value = -999.0 (p. ej. meses aún no procesados del año en curso).
* header.sources = ["MERRA2"]; header.api.version = "v2.10.0".
* start < 1981 ⇒ HTTP 422 con {"header": ..., "messages": [...]}; parámetro inválido ⇒ HTTP 422.
* Ojo: PRECTOTCORR_SUM declara "mm/day" pero sus valores son acumulados mensuales (mm). Por eso el
  laboratorio usa PRECTOTCORR y convierte él mismo con los días reales de cada mes.

Regla: cualquier fallo lanza DataSourceError. No hay sustitución silenciosa por datos sintéticos.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import numpy as np
import pandas as pd
import requests

from ..config import (POWER_COMMUNITY, POWER_FIRST_YEAR, POWER_GRID_DESCRIPTION, POWER_MONTHLY_POINT_URL,
                      POWER_TIMEOUT_S, POWER_CACHE_TTL_DAYS, USER_AGENT, Location, VariableSpec)
from ..schema import Provenance, SeriesBundle, make_frame
from .base import DataSourceError

DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache" / "power"


def build_request(variable: VariableSpec, location: Location, start_year: int, end_year: int) -> tuple[str, dict[str, Any]]:
    if not (-90 <= location.lat <= 90 and -180 <= location.lon <= 180):
        raise DataSourceError(f"Coordenadas fuera de rango: lat={location.lat}, lon={location.lon}.")
    if start_year < POWER_FIRST_YEAR:
        raise DataSourceError(f"NASA POWER (MERRA-2) comienza en {POWER_FIRST_YEAR}; se pidió {start_year}.")
    if end_year < start_year:
        raise DataSourceError("El año final debe ser mayor o igual que el inicial.")
    params = {
        "parameters": variable.code,
        "community": POWER_COMMUNITY,
        "latitude": f"{location.lat:.4f}",
        "longitude": f"{location.lon:.4f}",
        "start": str(start_year),
        "end": str(end_year),
        "format": "JSON",
    }
    return POWER_MONTHLY_POINT_URL, params


def _messages(payload: Any) -> str:
    if isinstance(payload, dict):
        msgs = payload.get("messages") or payload.get("detail") or payload.get("header")
        if isinstance(msgs, list):
            return " ".join(str(m) for m in msgs)
        if msgs:
            return str(msgs)
    return ""


def parse_power_monthly(payload: dict, variable: VariableSpec, location: Location, *, request_url: str,
                        retrieved_at_utc: str, from_cache: bool = False) -> SeriesBundle:
    """Convierte la respuesta JSON de POWER al esquema normalizado, validando todo lo que se supone."""
    try:
        param_block = payload["properties"]["parameter"]
        header = payload.get("header", {})
        meta = payload.get("parameters", {})
    except (KeyError, TypeError) as exc:
        raise DataSourceError("La respuesta de NASA POWER no tiene la estructura esperada.",
                              details=f"Falta {exc}; mensajes: {_messages(payload)}") from exc
    if variable.code not in param_block:
        raise DataSourceError(f"La respuesta no incluye la variable {variable.code}.", details=_messages(payload))

    unit_label = (meta.get(variable.code) or {}).get("units")
    if unit_label != variable.power_unit_label:
        raise DataSourceError(
            f"Unidad inesperada para {variable.code}: '{unit_label}' (se esperaba '{variable.power_unit_label}'). "
            "No se analiza para no convertir a ciegas."
        )
    fill = float(header.get("fill_value", -999.0))
    rows, annual = [], {}
    for key, val in param_block[variable.code].items():
        if len(key) != 6 or not key.isdigit():
            raise DataSourceError(f"Clave de fecha inesperada en la respuesta: {key!r}.")
        year, month = int(key[:4]), int(key[4:])
        v = float(val) if val is not None else fill
        if month == 13:  # valor anual calculado por POWER: solo para verificación cruzada
            if v != fill:
                annual[year] = v
            continue
        if not 1 <= month <= 12:
            raise DataSourceError(f"Mes inválido en la respuesta: {key!r}.")
        rows.append((pd.Timestamp(year=year, month=month, day=1), v))
    if not rows:
        raise DataSourceError("La respuesta no contiene valores mensuales.")
    rows.sort()
    ts = [r[0] for r in rows]
    raw = np.array([r[1] for r in rows], dtype=float)
    is_fill = raw == fill
    values = np.where(is_fill, np.nan, raw)
    flags = np.where(is_fill, "fill_value", "ok")
    if np.all(np.isnan(values)):
        raise DataSourceError("Todos los valores devueltos son de relleno (-999): no hay datos válidos.")

    sources = list(header.get("sources", []))
    coords = (payload.get("geometry") or {}).get("coordinates") or [location.lon, location.lat, None]
    df = make_frame(ts, values, variable=variable, location=location, unit=variable.native_unit,
                    source="NASA POWER", product="+".join(sources) or "desconocido",
                    spatial_resolution=POWER_GRID_DESCRIPTION, is_synthetic=False, quality_flags=flags)
    prov = Provenance(
        source="NASA POWER — API mensual por punto",
        product=f"{variable.product}; fuentes declaradas: {', '.join(sources) or 'no declaradas'}",
        is_synthetic=False,
        retrieved_at_utc=retrieved_at_utc,
        request_url=request_url,
        origin="nasa_power",
        api_version=((header.get("api") or {}).get("version")),
        grid_cell={"lon": coords[0], "lat": coords[1], "elevation_m": coords[2] if len(coords) > 2 else None},
        from_cache=from_cache,
        source_annual_values=annual,
        notes=[
            "Valor de un punto de cuadrícula del producto (no promedio regional).",
            f"Unidad declarada por la API: '{unit_label}'.",
            f"Estándar temporal: {header.get('time_standard', 'no declarado')}.",
        ],
        extra={"sources": sources, "fill_value": fill, "n_fill": int(is_fill.sum()),
               "longname": (meta.get(variable.code) or {}).get("longname"), "community": POWER_COMMUNITY},
    )
    return SeriesBundle(data=df, variable=variable, location=location, provenance=prov)


class NasaPowerSource:
    """Adaptador `DataSource` para NASA POWER con caché JSON local (útil sin red durante una demo)."""

    name = "nasa_power"

    def __init__(self, session: requests.Session | None = None, cache_dir: Path | None = DEFAULT_CACHE_DIR,
                 ttl_days: float = POWER_CACHE_TTL_DAYS, timeout: tuple[float, float] = POWER_TIMEOUT_S):
        self.session = session or requests.Session()
        self.session.headers.setdefault("User-Agent", USER_AGENT)
        self.cache_dir = cache_dir
        self.ttl = _dt.timedelta(days=ttl_days)
        self.timeout = timeout

    # ---- caché -----------------------------------------------------------------------
    def _cache_path(self, url: str) -> Path | None:
        if self.cache_dir is None:
            return None
        return self.cache_dir / (hashlib.sha256(url.encode()).hexdigest()[:24] + ".json")

    def _read_cache(self, url: str) -> tuple[dict, str] | None:
        p = self._cache_path(url)
        if p is None or not p.exists():
            return None
        try:
            blob = json.loads(p.read_text(encoding="utf-8"))
            when = _dt.datetime.fromisoformat(blob["retrieved_at_utc"])
            if _dt.datetime.now(_dt.timezone.utc) - when > self.ttl:
                return None
            return blob["payload"], blob["retrieved_at_utc"]
        except (OSError, ValueError, KeyError):
            return None  # caché corrupta: se ignora y se vuelve a descargar

    def _write_cache(self, url: str, payload: dict, retrieved_at: str) -> None:
        p = self._cache_path(url)
        if p is None:
            return
        p.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=p.parent, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump({"url": url, "retrieved_at_utc": retrieved_at, "payload": payload}, fh)
        os.replace(tmp, p)

    # ---- red -------------------------------------------------------------------------
    def fetch(self, variable: VariableSpec, location: Location, start_year: int, end_year: int,
              force_refresh: bool = False) -> SeriesBundle:
        end_year = min(end_year, _dt.date.today().year)
        base, params = build_request(variable, location, start_year, end_year)
        url = f"{base}?{urlencode(params)}"
        if not force_refresh:
            cached = self._read_cache(url)
            if cached is not None:
                payload, when = cached
                return parse_power_monthly(payload, variable, location, request_url=url,
                                           retrieved_at_utc=when, from_cache=True)
        try:
            resp = self.session.get(base, params=params, timeout=self.timeout)
        except requests.exceptions.Timeout as exc:
            raise DataSourceError("NASA POWER no respondió a tiempo. Intenta de nuevo o usa el modo sintético.",
                                  details=str(exc)) from exc
        except requests.exceptions.RequestException as exc:
            raise DataSourceError("No se pudo conectar con NASA POWER (¿sin conexión a internet?).",
                                  details=str(exc)) from exc
        try:
            payload = resp.json()
        except ValueError:
            payload = None
        if resp.status_code != 200:
            raise DataSourceError(f"NASA POWER rechazó la solicitud (HTTP {resp.status_code}).",
                                  details=_messages(payload) or resp.text[:300], status_code=resp.status_code)
        if not isinstance(payload, dict):
            raise DataSourceError("NASA POWER devolvió una respuesta que no es JSON válido.", status_code=resp.status_code)
        retrieved = Provenance.now_utc()
        bundle = parse_power_monthly(payload, variable, location, request_url=url, retrieved_at_utc=retrieved)
        self._write_cache(url, payload, retrieved)  # solo se guarda lo que pasó la validación
        return bundle
