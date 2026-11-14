"""Descarga de NASA POWER por teselas, con caché, reintentos y manifiesto (FR-D01, T002).

Endpoint (verificado el 2026-11-14, API v2.10.0):
  GET https://power.larc.nasa.gov/api/temporal/monthly/regional
      ?parameters=T2M&community=AG&latitude-min=..&latitude-max=..&longitude-min=..&longitude-max=..
      &start=YYYY&end=YYYY&format=JSON
Devuelve un FeatureCollection: un punto por centro de celda (0.5° lat × 0.625° lon) dentro de la caja,
bordes incluidos, con `properties.parameter.<CODE>` = {"YYYYMM": valor}; el mes 13 es el valor anual.
Límites: caja de 2° a 10° por lado, un parámetro por solicitud, inicio ≥ 1981.

Teselas: 10° × 10° alineadas a múltiplos de 10°, para que varias regiones compartan la misma descarga.
Las celdas de los bordes llegan repetidas en dos teselas vecinas; se quedan una vez.

Reglas:
* Un fallo nunca produce datos: lanza `DataSourceError`.
* Hasta 3 reintentos con espera creciente ante errores de red, tiempo agotado, HTTP 429 o 5xx.
  Un 4xx distinto de 429 no se reintenta (la solicitud está mal y fallaría igual).
* Si al terminar alguna tesela sigue fallando, se lanza `DownloadFailed` con la lista completa;
  las teselas buenas quedan en caché y una nueva ejecución solo vuelve a pedir las que fallaron.
* Cada solicitud queda en el manifiesto: URL, fecha de consulta, huella SHA-256 y si vino de caché.
"""

from __future__ import annotations

import datetime as _dt
import gzip
import hashlib
import json
import os
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlencode

import numpy as np
import requests

from trendlens.config import POWER_COMMUNITY, POWER_FIRST_YEAR, VariableSpec
from trendlens.data.base import DataSourceError

POWER_REGIONAL_URL = "https://power.larc.nasa.gov/api/temporal/monthly/regional"
TILE_DEG = 10.0
MAX_RETRIES = 3
TIMEOUT_S = (10, 30)  # (conexión, lectura): 30 s de límite por solicitud
BACKOFF_S = (2.0, 4.0, 8.0)
USER_AGENT = "TrendDetectivePipeline/0.1 (NASA Space Apps 2026)"
PIPELINE_DIR = Path(__file__).resolve().parent
DEFAULT_CACHE_DIR = Path(os.environ.get("TD_CACHE_DIR", PIPELINE_DIR / "cache" / "power"))
_RETRY_STATUS = {429, 500, 502, 503, 504}


@dataclass(frozen=True, order=True)
class Tile:
    """Caja (sur, oeste, norte, este) en grados."""

    south: float
    west: float
    north: float
    east: float

    @property
    def label(self) -> str:
        return f"lat {self.south:g}…{self.north:g}, lon {self.west:g}…{self.east:g}"


def tiles_for_bounds(bounds: tuple[float, float, float, float], margin_lat: float = 0.25,
                     margin_lon: float = 0.3125) -> list[Tile]:
    """Teselas alineadas que cubren la caja (oeste, sur, este, norte) más media celda de margen."""
    w, s, e, n = bounds
    w, s, e, n = max(w - margin_lon, -180.0), max(s - margin_lat, -90.0), min(e + margin_lon, 180.0), min(n + margin_lat, 90.0)
    out = []
    lat = np.floor(s / TILE_DEG) * TILE_DEG
    while lat < n:
        lon = np.floor(w / TILE_DEG) * TILE_DEG
        while lon < e:
            out.append(Tile(float(lat), float(lon), float(min(lat + TILE_DEG, 90.0)), float(min(lon + TILE_DEG, 180.0))))
            lon += TILE_DEG
        lat += TILE_DEG
    return out


def build_url(variable: VariableSpec, tile: Tile, start_year: int, end_year: int) -> str:
    if start_year < POWER_FIRST_YEAR:
        raise DataSourceError(f"NASA POWER (MERRA-2) comienza en {POWER_FIRST_YEAR}; se pidió {start_year}.")
    params = {
        "parameters": variable.code,
        "community": POWER_COMMUNITY,
        "latitude-min": f"{tile.south:g}",
        "latitude-max": f"{tile.north:g}",
        "longitude-min": f"{tile.west:g}",
        "longitude-max": f"{tile.east:g}",
        "start": str(start_year),
        "end": str(end_year),
        "format": "JSON",
    }
    return f"{POWER_REGIONAL_URL}?{urlencode(params)}"


# --------------------------------------------------------------------------------------
# Lectura y validación de una respuesta
# --------------------------------------------------------------------------------------
@dataclass
class CellGrid:
    """Valores mensuales de varias celdas. `values[i, k]` = celda i, mes k (NaN = faltante)."""

    variable: str
    unit_declared: str
    lats: np.ndarray
    lons: np.ndarray
    months: list[tuple[int, int]]
    values: np.ndarray
    annual: dict[int, np.ndarray]  # año -> valor anual de POWER por celda (mes 13), NaN si es relleno
    sources: list[str]
    api_version: str | None
    fill_value: float

    def index_of(self, lat: float, lon: float) -> int:
        hit = np.where(np.isclose(self.lats, lat) & np.isclose(self.lons, lon))[0]
        if len(hit) == 0:
            raise KeyError(f"La celda ({lat}, {lon}) no está en la descarga.")
        return int(hit[0])


def parse_regional(payload: Any, variable: VariableSpec) -> CellGrid:
    """Valida la respuesta (estructura, unidad, fuente, fechas) y la convierte a `CellGrid`."""
    if not isinstance(payload, dict) or "features" not in payload:
        raise DataSourceError("La respuesta de NASA POWER no tiene la estructura esperada (falta 'features').")
    header = payload.get("header") or {}
    unit = ((payload.get("parameters") or {}).get(variable.code) or {}).get("units")
    if unit != variable.power_unit_label:
        raise DataSourceError(
            f"Unidad inesperada para {variable.code}: '{unit}' (se esperaba '{variable.power_unit_label}'). "
            "No se convierte a ciegas."
        )
    sources = list(header.get("sources") or [])
    if sources != ["MERRA2"]:
        raise DataSourceError(f"Fuentes declaradas inesperadas: {sources} (se esperaba ['MERRA2']).")
    fill = float(header.get("fill_value", -999.0))
    feats = payload["features"]
    if not feats:
        raise DataSourceError("La respuesta no contiene celdas.")

    month_keys: list[str] | None = None
    lats, lons, rows, annual_rows = [], [], [], []
    for f in feats:
        lon, lat = f["geometry"]["coordinates"][:2]
        series = f["properties"]["parameter"].get(variable.code)
        if series is None:
            raise DataSourceError(f"Una celda no incluye la variable {variable.code}.")
        keys = sorted(series)
        for k in keys:
            if len(k) != 6 or not k.isdigit() or not 1 <= int(k[4:]) <= 13:
                raise DataSourceError(f"Clave de fecha inesperada en la respuesta: {k!r}.")
        mk = [k for k in keys if not k.endswith("13")]
        if month_keys is None:
            month_keys = mk
        elif mk != month_keys:
            raise DataSourceError("Las celdas de una misma respuesta no tienen los mismos meses.")
        raw = np.array([series[k] if series[k] is not None else fill for k in mk], dtype=float)
        rows.append(np.where(raw == fill, np.nan, raw))
        ann = {int(k[:4]): (np.nan if series[k] in (None, fill) else float(series[k])) for k in keys if k.endswith("13")}
        annual_rows.append(ann)
        lats.append(float(lat))
        lons.append(float(lon))
    assert month_keys is not None
    years = sorted({y for a in annual_rows for y in a})
    annual = {y: np.array([a.get(y, np.nan) for a in annual_rows], dtype=float) for y in years}
    return CellGrid(variable.code, unit, np.array(lats), np.array(lons),
                    [(int(k[:4]), int(k[4:])) for k in month_keys], np.vstack(rows), annual, sources,
                    (header.get("api") or {}).get("version"), fill)


def merge_grids(grids: list[CellGrid]) -> CellGrid:
    """Une teselas y quita las celdas de borde repetidas (mismos valores por construcción)."""
    if not grids:
        raise ValueError("No hay teselas que unir.")
    first = grids[0]
    for g in grids[1:]:
        if g.months != first.months or g.variable != first.variable or g.unit_declared != first.unit_declared:
            raise DataSourceError("Las teselas no son compatibles (meses, variable o unidad distintos).")
    lats = np.concatenate([g.lats for g in grids])
    lons = np.concatenate([g.lons for g in grids])
    values = np.vstack([g.values for g in grids])
    years = sorted(set().union(*[g.annual.keys() for g in grids]))
    annual = {y: np.concatenate([g.annual.get(y, np.full(len(g.lats), np.nan)) for g in grids]) for y in years}
    _, keep = np.unique(np.round(np.c_[lats, lons], 4), axis=0, return_index=True)
    keep = np.sort(keep)
    return CellGrid(first.variable, first.unit_declared, lats[keep], lons[keep], first.months, values[keep],
                    {y: a[keep] for y, a in annual.items()}, first.sources, first.api_version, first.fill_value)


# --------------------------------------------------------------------------------------
# Descarga con caché, reintentos y manifiesto
# --------------------------------------------------------------------------------------
class DownloadFailed(DataSourceError):
    """Una o más teselas siguen fallando tras los reintentos. Nada se publica."""

    def __init__(self, failures: list[dict[str, str]]):
        self.failures = failures
        lines = "; ".join(f"{f['variable']} {f['tile']}: {f['error']}" for f in failures)
        super().__init__(f"{len(failures)} tesela(s) fallaron tras {MAX_RETRIES} reintentos: {lines}")


def unique_manifest_path(directory: Path, run_date: str, now: _dt.datetime | None = None) -> Path:
    """`<fecha>.json` si no existe; si no, `<fecha>-<HHMMSS>[-n].json`. Nunca reutiliza el de otra ejecución,
    para que `provenance.requests` de los archivos publicados siempre apunte a su propio manifiesto."""
    directory = Path(directory)
    path = directory / f"{run_date}.json"
    if not path.exists():
        return path
    stamp = (now or _dt.datetime.now(_dt.timezone.utc)).strftime("%H%M%S")
    path, k = directory / f"{run_date}-{stamp}.json", 1
    while path.exists():
        k += 1
        path = directory / f"{run_date}-{stamp}-{k}.json"
    return path


def _now_utc() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class Downloader:
    cache_dir: Path = DEFAULT_CACHE_DIR
    session: requests.Session = field(default_factory=requests.Session)
    sleep: Callable[[float], None] = time.sleep
    timeout: tuple[float, float] = TIMEOUT_S
    manifest: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.session.headers.setdefault("User-Agent", USER_AGENT)

    # ---- caché ---------------------------------------------------------------------
    def _cache_path(self, url: str) -> Path:
        return Path(self.cache_dir) / (hashlib.sha256(url.encode()).hexdigest()[:32] + ".json.gz")

    def _read_cache(self, url: str) -> dict | None:
        p = self._cache_path(url)
        if not p.exists():
            return None
        try:
            blob = json.loads(gzip.decompress(p.read_bytes()).decode("utf-8"))
            if blob.get("url") != url:
                return None
            body = blob["body"].encode("utf-8")
            if hashlib.sha256(body).hexdigest() != blob["sha256"]:
                return None  # caché corrupta: se vuelve a descargar
            return blob
        except (OSError, ValueError, KeyError):
            return None

    def _write_cache(self, url: str, body: str, sha: str, retrieved: str) -> None:
        p = self._cache_path(url)
        p.parent.mkdir(parents=True, exist_ok=True)
        data = gzip.compress(json.dumps({"url": url, "retrieved_at_utc": retrieved, "sha256": sha, "body": body}).encode("utf-8"))
        fd, tmp = tempfile.mkstemp(dir=p.parent, suffix=".tmp")
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp, p)

    # ---- red -----------------------------------------------------------------------
    def _get(self, url: str) -> str:
        last = ""
        for attempt in range(MAX_RETRIES + 1):
            if attempt:
                self.sleep(BACKOFF_S[min(attempt - 1, len(BACKOFF_S) - 1)])
            try:
                resp = self.session.get(url, timeout=self.timeout)
            except requests.exceptions.RequestException as exc:
                last = f"{type(exc).__name__}: {exc}"
                continue
            if resp.status_code == 200:
                return resp.text
            last = f"HTTP {resp.status_code}: {resp.text[:200]}"
            if resp.status_code not in _RETRY_STATUS:
                break
        raise DataSourceError(last)

    def fetch(self, variable: VariableSpec, tile: Tile, start_year: int, end_year: int) -> tuple[CellGrid, dict]:
        """Una tesela, desde caché o desde la red. Devuelve la rejilla validada y su entrada del manifiesto."""
        url = build_url(variable, tile, start_year, end_year)
        cached = self._read_cache(url)
        if cached is not None:
            grid = parse_regional(json.loads(cached["body"]), variable)
            entry = {"url": url, "retrieved_at_utc": cached["retrieved_at_utc"], "sha256": cached["sha256"],
                     "from_cache": True, "status": "ok"}
        else:
            body = self._get(url)
            try:
                payload = json.loads(body)
            except ValueError as exc:
                raise DataSourceError("NASA POWER devolvió una respuesta que no es JSON válido.") from exc
            grid = parse_regional(payload, variable)  # solo se guarda en caché lo que pasó la validación
            sha = hashlib.sha256(body.encode("utf-8")).hexdigest()
            retrieved = _now_utc()
            self._write_cache(url, body, sha, retrieved)
            entry = {"url": url, "retrieved_at_utc": retrieved, "sha256": sha, "from_cache": False, "status": "ok"}
        entry.update(variable=variable.code, tile=tile.label)
        return grid, entry

    def fetch_many(self, variable: VariableSpec, tiles: list[Tile], start_year: int, end_year: int
                   ) -> dict[Tile, CellGrid]:
        """Todas las teselas; si alguna falla se siguen pidiendo las demás y al final se lanza `DownloadFailed`."""
        grids: dict[Tile, CellGrid] = {}
        failures: list[dict[str, str]] = []
        for tile in sorted(set(tiles)):
            try:
                grid, entry = self.fetch(variable, tile, start_year, end_year)
                grids[tile] = grid
            except DataSourceError as exc:
                entry = {"url": build_url(variable, tile, start_year, end_year), "retrieved_at_utc": _now_utc(),
                         "sha256": None, "from_cache": False, "status": "error", "error": str(exc),
                         "variable": variable.code, "tile": tile.label}
                failures.append({"variable": variable.code, "tile": tile.label, "error": str(exc)})
            self.manifest.append(entry)
        if failures:
            raise DownloadFailed(failures)
        return grids

    def write_manifest(self, path: Path) -> Path:
        """Escribe el manifiesto en `path` (elegido con `unique_manifest_path`, nunca sobre otro existente)."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"run_at_utc": _now_utc(), "requests": self.manifest}, ensure_ascii=False, indent=1),
                        encoding="utf-8")
        return path
