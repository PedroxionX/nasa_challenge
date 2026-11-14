"""Lectura de productos mensuales de GES DISC con earthaccess (FR-D01, FR-D08; T017, T018).

Por cada gránulo (un mes): se abre con `earthaccess.open` (HTTPS de Earthdata Cloud), se lee solo la variable
y el recuadro de las regiones, se extraen las celdas que usan las 84 regiones y se guarda ese vector en caché
local fuera de git. Así no se descargan los 37 GB de archivos completos y una segunda ejecución no vuelve a leer.

Reglas: como mucho 4 lecturas a la vez; 3 reintentos con espera creciente; si al final algún gránulo sigue
fallando se lanza `ReadFailed` con la lista completa y nada se publica; nunca se cambia de fuente.
Credenciales: solo `~/.netrc` (o `~/_netrc`) o EARTHDATA_USERNAME/EARTHDATA_PASSWORD; nada se escribe en disco.
"""

from __future__ import annotations

import hashlib
import io
import os
import re
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import numpy as np

from sources.base import BACKOFF_S, MAX_RETRIES, GridData, ReadFailed, SourceInfo, now_utc
from trendlens.data.base import DataSourceError

PIPELINE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CACHE_DIR = Path(os.environ.get("TD_CACHE_DIR", PIPELINE_DIR / "cache")) / "gesdisc"
MAX_WORKERS = 4
# Recuadro que cubre México, EE. UU. contiguo, Alaska (recortada en −180°), Hawái y Puerto Rico, con margen.
READ_BOX = {"west": -180.0, "south": 13.0, "east": -63.0, "north": 73.0}


# --------------------------------------------------------------------------------------
# Credenciales
# --------------------------------------------------------------------------------------
def netrc_env_fix(home: Path | None = None, env: dict | None = None, is_windows: bool | None = None) -> str | None:
    """En Windows earthaccess busca `~/_netrc`; si falta y existe `~/.netrc`, apunta NETRC a este.

    Devuelve la ruta asignada (o None). No lee ni copia el archivo.
    """
    home = Path(home) if home is not None else Path.home()
    env = os.environ if env is None else env
    is_windows = (os.name == "nt") if is_windows is None else is_windows
    if not is_windows or "NETRC" in env or (home / "_netrc").exists() or not (home / ".netrc").exists():
        return None
    env["NETRC"] = str(home / ".netrc")
    return env["NETRC"]


_logged_in = False


def ensure_login() -> None:
    global _logged_in
    if _logged_in:
        return
    import earthaccess

    netrc_env_fix()
    has_netrc = any(p.exists() for p in (Path(os.environ.get("NETRC", "")), Path.home() / ".netrc",
                                          Path.home() / "_netrc") if str(p))
    strategy = "netrc" if has_netrc else "environment"
    auth = earthaccess.login(strategy=strategy)
    if not getattr(auth, "authenticated", False):
        raise DataSourceError("No se pudo iniciar sesión en NASA Earthdata (revisa ~/.netrc o EARTHDATA_USERNAME/"
                              "EARTHDATA_PASSWORD; si da 401, autoriza «NASA GESDISC DATA ARCHIVE» en tu perfil).")
    _logged_in = True


# --------------------------------------------------------------------------------------
# Productos
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class Product:
    short_name: str
    version: str
    doi: str
    product: str  # nombre legible para provenance.product
    parameter: str
    unit_declared: str
    dlat: float
    dlon: float
    read: Callable[[Any], tuple[np.ndarray, np.ndarray, np.ndarray]]  # archivo → (lats, lons, valores[lat, lon])


@dataclass
class Granule:
    name: str
    month: tuple[int, int]
    url: str
    handle: Any  # objeto de earthaccess (o lo que entienda `opener` en las pruebas)


def _granule_month(g: Any) -> tuple[int, int]:
    begin = g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"]
    return int(begin[:4]), int(begin[5:7])


def search_granules(product: Product, first_year: int, end_year: int) -> list[Granule]:
    import earthaccess

    found = earthaccess.search_data(short_name=product.short_name, version=product.version,
                                    temporal=(f"{first_year}-01-01", f"{end_year}-12-31"), count=-1)
    out = []
    for g in found:
        links = g.data_links(access="external")
        out.append(Granule(g["umm"]["GranuleUR"], _granule_month(g), links[0] if links else "", g))
    return out


def open_granule(g: Granule) -> Any:
    import earthaccess

    try:
        files = earthaccess.open([g.handle], show_progress=False)
    except TypeError:  # versiones sin show_progress
        files = earthaccess.open([g.handle])
    if not files:
        raise DataSourceError(f"No se pudo abrir {g.name}.")
    return files[0]


# --------------------------------------------------------------------------------------
# Fuente
# --------------------------------------------------------------------------------------
def cells_key(lats: np.ndarray, lons: np.ndarray) -> str:
    arr = np.round(np.c_[lats, lons], 4).astype(np.float64)
    return hashlib.sha256(arr.tobytes()).hexdigest()[:16]


def cell_indices(file_lats: np.ndarray, file_lons: np.ndarray, lats: np.ndarray, lons: np.ndarray,
                 dlat: float, dlon: float) -> tuple[np.ndarray, np.ndarray]:
    """Índices (fila, columna) de cada celda en el recorte del archivo; error si alguna no está."""
    i = np.rint((lats - file_lats[0]) / dlat).astype(int)
    j = np.rint((lons - file_lons[0]) / dlon).astype(int)
    bad = (i < 0) | (i >= len(file_lats)) | (j < 0) | (j >= len(file_lons))
    if bad.any() or not (np.allclose(file_lats[np.clip(i, 0, len(file_lats) - 1)], lats, atol=1e-3)
                         and np.allclose(file_lons[np.clip(j, 0, len(file_lons) - 1)], lons, atol=1e-3)):
        raise DataSourceError("Las celdas de las regiones no coinciden con la malla del archivo.")
    return i, j


# --------------------------------------------------------------------------------------
# Un gránulo (función de módulo: se puede ejecutar en otro proceso)
# --------------------------------------------------------------------------------------
def cache_path(cache_dir: Path, short_name: str, key: str, name: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return Path(cache_dir) / short_name / key / f"{safe}.npz"


def read_cache(p: Path) -> dict | None:
    if not p.exists():
        return None
    try:
        with np.load(p, allow_pickle=False) as z:
            values = z["values"]
            meta = {k: str(z[k]) for k in ("url", "retrieved_at_utc", "sha256")}
        if hashlib.sha256(values.tobytes()).hexdigest() != meta["sha256"]:
            return None
        return {"values": values, **meta}
    except (OSError, ValueError, KeyError):
        return None


def write_cache(p: Path, values: np.ndarray, url: str, retrieved: str, sha: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    np.savez_compressed(buf, values=values, url=url, retrieved_at_utc=retrieved, sha256=sha)
    tmp = p.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_bytes(buf.getvalue())
    os.replace(tmp, p)


def read_granule_cached(product: Product, g: Granule, lats: np.ndarray, lons: np.ndarray, key: str,
                        cache_dir: Path, opener: Callable = None, sleep: Callable = time.sleep) -> tuple:
    """Devuelve (valores, meta) o (None, meta con error). Caché, 3 reintentos y sin cambiar de fuente."""
    opener = opener or open_granule
    p = cache_path(cache_dir, product.short_name, key, g.name)
    cached = read_cache(p)
    if cached is not None:
        return cached["values"], {"retrieved_at_utc": cached["retrieved_at_utc"], "sha256": cached["sha256"],
                                  "from_cache": True, "status": "ok"}
    last = ""
    for attempt in range(MAX_RETRIES + 1):
        if attempt:
            sleep(BACKOFF_S[min(attempt - 1, len(BACKOFF_S) - 1)])
        try:
            f = opener(g)
            try:
                flats, flons, arr = product.read(f)
            finally:
                close = getattr(f, "close", None)
                if close:
                    close()
            i, j = cell_indices(flats, flons, lats, lons, product.dlat, product.dlon)
            values = arr[i, j].astype(np.float32)
            break
        except DataSourceError as exc:  # unidad o malla inesperada: reintentar no lo arregla
            return None, _error_meta(f"{g.name}: {exc}")
        except Exception as exc:  # red, tiempo agotado, archivo truncado…
            last = f"{type(exc).__name__}: {exc}"
    else:
        return None, _error_meta(f"{g.name}: {last}")
    sha = hashlib.sha256(values.tobytes()).hexdigest()
    retrieved = now_utc()
    write_cache(p, values, g.url, retrieved, sha)
    return values, {"retrieved_at_utc": retrieved, "sha256": sha, "from_cache": False, "status": "ok"}


def _error_meta(msg: str) -> dict:
    return {"retrieved_at_utc": now_utc(), "sha256": None, "from_cache": False, "status": "error", "error": msg}


def _worker_init() -> None:
    ensure_login()


def _process_task(args: tuple) -> tuple:
    product, g, lats, lons, key, cache_dir = args
    return read_granule_cached(product, g, lats, lons, key, cache_dir)



class GesDiscSource:
    id = "gesdisc"

    def __init__(self, product: Product, cache_dir: Path = DEFAULT_CACHE_DIR, max_workers: int = MAX_WORKERS,
                 sleep: Callable[[float], None] = time.sleep, searcher: Callable | None = None,
                 opener: Callable | None = None, login: Callable | None = None):
        self.product = product
        self.cache_dir = Path(cache_dir)
        self.max_workers = max(1, min(max_workers, MAX_WORKERS))
        self.sleep = sleep
        self.searcher = searcher or search_granules
        self.opener = opener or open_granule
        self.login = login or ensure_login
        self.manifest: list[dict[str, Any]] = []

    # ---- todos ---------------------------------------------------------------------------
    def read(self, var, regions, weights, union_lats, union_lons, first_year: int, end_year: int) -> GridData:
        self.login()
        granules = sorted(self.searcher(self.product, first_year, end_year), key=lambda g: g.month)
        months = [g.month for g in granules]
        if len(set(months)) != len(months):
            raise DataSourceError(f"{self.product.short_name}: hay más de un gránulo para algún mes.")
        if not granules:
            raise DataSourceError(f"{self.product.short_name}: no se encontraron gránulos en {first_year}–{end_year}.")
        key = cells_key(union_lats, union_lons)
        results: dict[int, np.ndarray] = {}
        failures: list[dict[str, str]] = []

        use_processes = self.opener is open_granule and self.max_workers > 1
        if use_processes:
            # h5py serializa toda lectura detrás de un candado global: con hilos no hay paralelismo real.
            tasks = [(self.product, g, union_lats, union_lons, key, self.cache_dir) for g in granules]
            pool = ProcessPoolExecutor(max_workers=self.max_workers, initializer=_worker_init)
            mapped = pool.map(_process_task, tasks)
        else:
            pool = ThreadPoolExecutor(max_workers=self.max_workers)
            mapped = pool.map(lambda g: read_granule_cached(self.product, g, union_lats, union_lons, key,
                                                            self.cache_dir, self.opener, self.sleep), granules)
        with pool:
            for k, (vals, meta) in enumerate(mapped):
                g = granules[k]
                self.manifest.append({"variable": var.id, "source": self.product.short_name, "granule": g.name,
                                      "month": f"{g.month[0]}-{g.month[1]:02d}", "url": g.url, **meta})
                if vals is None:
                    failures.append({"variable": var.id, "item": g.name, "error": meta["error"]})
                else:
                    results[k] = vals
                done = k + 1
                if done % 25 == 0 or done == len(granules):
                    print(f"  {self.product.short_name}: {done}/{len(granules)} gránulos", flush=True)
        if failures:
            raise ReadFailed(failures, sorted(r.id for r in regions))
        values = np.vstack([results[k] for k in range(len(granules))]).T.astype(float)  # celdas × meses
        import earthaccess  # noqa: PLC0415 (versión para provenance)

        info = SourceInfo(
            source="NASA GES DISC (Earthdata Cloud) vía earthaccess", product=self.product.product,
            short_name=self.product.short_name, version=self.product.version, doi=self.product.doi,
            api_version=f"earthaccess {getattr(earthaccess, '__version__', '?')}", parameter=self.product.parameter,
            unit_declared=self.product.unit_declared, grid_text=f"{self.product.dlat:g}° × {self.product.dlon:g}°")
        newest = max(e["retrieved_at_utc"] for e in self.manifest[-len(granules):])
        return GridData(np.asarray(union_lats, float), np.asarray(union_lons, float), months, values, info,
                        retrieved_by_region={r.id: newest for r in regions},
                        granules_by_region={r.id: len(granules) for r in regions})
