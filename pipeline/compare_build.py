"""Prueba de la diferencia de tendencias entre pares de regiones (007, FR-K02 a FR-K05 y FR-K11 a FR-K13).

Uso:
    python compare_build.py                          # todas las variables del catálogo publicado
    python compare_build.py --variables <id>,<id>    # solo esas; las demás quedan intactas
    python compare_build.py --check                  # ¿compare/ corresponde a las series publicadas?

Lee `catalog.json` y `series/` de la carpeta ya publicada (por omisión `web/public/data/trends/`) y escribe
`compare/` según specs/007-region-comparison/contracts/compare-files.md. No descarga nada ni usa credenciales.

Este archivo no nombra ninguna variable, unidad ni producto: recorre las variables del catálogo y decide todo
con sus campos (`relative_change`, `last_complete_year`…) y con la procedencia de cada serie. Una variable
nueva se compara con solo volver a ejecutarlo.

Método (un solo motor: `trendlens.stats.engine.trend_core`, el mismo de las series):
1. Par (A, B) con A antes que B en orden alfabético de id. Se guarda una vez, en el archivo de A.
2. Ventanas `inicio`–`fin` con `fin` = último año completo de la variable y al menos `min_window_years` años.
3. Serie de diferencias en los años completos comunes de la ventana:
   - variable sin `relative_change`: D = A − B, en la unidad anual;
   - variable con `relative_change`: D = 100 · (A / media(A) − B / media(B)), con las medias de esos mismos
     años; va en puntos porcentuales. Si una media es ≤ 0 la fila es `invalid`.
4. Sobre D: pendiente de Theil-Sen por década, intervalo de Sen y Mann-Kendall corregido por autocorrelación.
   Estado: `differ` si p < α y la pendiente no es cero; si no, `inconclusive`.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import shutil
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from trendlens.stats.engine import trend_core

SCHEMA_VERSION = 1
COLUMNS = ["n", "diff_decade", "ci_low", "ci_high", "p", "status"]
STATUSES = {"differ", "inconclusive", "insufficient", "invalid"}
REASONS = {"different_unit", "different_product", "mixed_synthetic", "identical_series"}
METHOD = {"series": "difference-common-years", "slope": "theil-sen", "test": "mann-kendall-ar1-corrected",
          "interval": "sen-1968-95"}
RELATIVE_UNIT = "puntos porcentuales/década"
SIGNIFICANT_DIGITS = 4  # de sobra para lo que se muestra; con 5, compare/ pasaba de 15 MB
DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data" / "trends"
_NO_FIGURES = [None, None, None, None]


# --------------------------------------------------------------------------------------
# Lectura de lo publicado
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class RegionSeries:
    region: str
    unit: str
    product: tuple
    synthetic: bool
    values: dict[int, float]  # año completo → valor anual


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_series(path: Path) -> RegionSeries:
    doc = _load(path)
    prov = doc.get("provenance", {})
    values = {int(y): float(v) for y, v in zip(doc["years"], doc["values"])
              if v is not None and np.isfinite(float(v))}
    product = (prov.get("source"), prov.get("short_name") or prov.get("product"), prov.get("version"))
    return RegionSeries(doc["region"], doc["unit"], product, bool(prov.get("is_synthetic")), values)


def load_variable_series(data_dir: Path, variable_id: str) -> dict[str, RegionSeries]:
    """Series publicadas de una variable, por id de región. Una región sin archivo no participa."""
    folder = data_dir / "series" / variable_id
    out = {}
    for path in sorted(folder.glob("*.json")):
        s = read_series(path)
        if s.region != path.stem:
            raise ValueError(f"{path}: el archivo no corresponde a la región {s.region!r}")
        out[s.region] = s
    return out


def series_fingerprint(data_dir: Path, variable_id: str) -> str:
    """Huella de las series de las que salen las cifras (FR-K13): nombre y contenido, en orden de id."""
    h = hashlib.sha256()
    for path in sorted((data_dir / "series" / variable_id).glob("*.json")):
        h.update(path.name.encode("utf-8") + b"\0" + path.read_bytes() + b"\0")
    return h.hexdigest()


def window_starts(first_year: int, end: int, min_years: int) -> list[int]:
    return list(range(first_year, end - min_years + 2))


# --------------------------------------------------------------------------------------
# Una ventana de un par
# --------------------------------------------------------------------------------------
def _sig(x: float) -> float:
    """Redondeo a cifras significativas: vale para cualquier unidad y magnitud."""
    return float(f"{float(x):.{SIGNIFICANT_DIGITS}g}") + 0.0  # + 0.0 convierte −0.0 en 0.0


def _p_out(p: float, alpha: float) -> float:
    """p redondeado, salvo que redondear lo cambie de lado respecto a α (contradiría el estado)."""
    p = min(max(float(p), 0.0), 1.0)
    rounded = _sig(p)
    return rounded if (rounded < alpha) == (p < alpha) else p


def not_comparable_reason(a: RegionSeries, b: RegionSeries) -> str | None:
    if a.unit != b.unit:
        return "different_unit"
    if a.synthetic != b.synthetic:
        return "mixed_synthetic"
    if a.product != b.product:
        return "different_product"
    common = a.values.keys() & b.values.keys()
    if common and all(a.values[y] == b.values[y] for y in common):
        return "identical_series"
    return None


def difference_series(a: RegionSeries, b: RegionSeries, start: int, end: int, relative: bool
                      ) -> tuple[np.ndarray, np.ndarray | None]:
    """Años completos comunes de la ventana y la serie de diferencias A − B (None si no es evaluable).

    Con `relative`, cada serie se divide entre su media en esos mismos años y la diferencia va en puntos
    porcentuales: una región con valores altos no domina a otra con valores bajos (criterio del mapa).
    """
    years = np.array(sorted(y for y in a.values.keys() & b.values.keys() if start <= y <= end), dtype=float)
    if len(years) == 0:
        return years, None
    va = np.array([a.values[int(y)] for y in years])
    vb = np.array([b.values[int(y)] for y in years])
    if not relative:
        return years, va - vb
    ma, mb = float(np.mean(va)), float(np.mean(vb))
    if not (np.isfinite(ma) and np.isfinite(mb) and ma > 0 and mb > 0):
        return years, None
    return years, 100.0 * (va / ma - vb / mb)


def window_row(a: RegionSeries, b: RegionSeries, start: int, end: int, relative: bool, alpha: float,
               min_years: int) -> list[Any]:
    years, diff = difference_series(a, b, start, end, relative)
    n = int(len(years))
    if n < min_years:
        return [n, *_NO_FIGURES, "insufficient"]
    if diff is None or not np.all(np.isfinite(diff)) or np.ptp(diff) == 0:
        return [n, *_NO_FIGURES, "invalid"]
    core = trend_core(years, diff, alpha)
    slope, (low, high), p = core.sen_slope * 10, core.sen_ci, core.primary.p_value
    if not (core.primary.valid and np.isfinite(p) and np.isfinite(slope) and np.isfinite(low) and np.isfinite(high)):
        return [n, *_NO_FIGURES, "invalid"]
    status = "differ" if (p < alpha and slope != 0) else "inconclusive"
    return [n, _sig(slope), _sig(low * 10), _sig(high * 10), _p_out(p, alpha), status]


# --------------------------------------------------------------------------------------
# Documentos
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class VariablePlan:
    id: str
    relative: bool
    unit: str
    end: int
    starts: list[int]
    alpha: float
    min_years: int

    @property
    def basis(self) -> str:
        return "relative" if self.relative else "absolute"


def plan_for(catalog: dict, variable: dict, series: dict[str, RegionSeries]) -> VariablePlan | None:
    """Qué se calcula para una variable, solo con campos del catálogo. None si no hay nada que comparar."""
    period = catalog["period"]
    min_years = int(period["min_window_years"])
    first = int(variable.get("first_year", period["first_year"]))
    end = int(variable.get("last_complete_year", period["last_complete_year"]))
    starts = window_starts(first, end, min_years)
    if len(series) < 2 or not starts:
        return None
    relative = bool(variable.get("relative_change"))
    unit = RELATIVE_UNIT if relative else f"{variable['unit_annual']}/década"
    return VariablePlan(variable["id"], relative, unit, end, starts, float(catalog["alpha"]), min_years)


def region_doc(plan: VariablePlan, region: str, series: dict[str, RegionSeries]) -> dict | None:
    """Archivo de una región: sus pares con las regiones de id posterior. None para la última."""
    later = [r for r in sorted(series) if r > region]
    if not later:
        return None
    a = series[region]
    partners: dict[str, list] = {}
    not_comparable: dict[str, str] = {}
    for other in later:
        b = series[other]
        reason = not_comparable_reason(a, b)
        if reason:
            not_comparable[other] = reason
            continue
        partners[other] = [window_row(a, b, s, plan.end, plan.relative, plan.alpha, plan.min_years)
                           for s in plan.starts]
    doc = {"schema_version": SCHEMA_VERSION, "variable": plan.id, "region": region, "basis": plan.basis,
           "unit": plan.unit, "end": plan.end, "starts": plan.starts, "columns": COLUMNS, "partners": partners}
    if not_comparable:
        doc["not_comparable"] = not_comparable
    return doc


_WORKER: tuple[VariablePlan, dict[str, RegionSeries]] | None = None


def _init_worker(plan: VariablePlan, data_dir: str) -> None:
    global _WORKER
    _WORKER = (plan, load_variable_series(Path(data_dir), plan.id))


def _work(region: str) -> tuple[str, dict | None]:
    assert _WORKER is not None
    plan, series = _WORKER
    return region, region_doc(plan, region, series)


def build_variable(plan: VariablePlan, series: dict[str, RegionSeries], data_dir: Path, jobs: int) -> dict[str, dict]:
    regions = sorted(series)
    if jobs <= 1:
        results = [(r, region_doc(plan, r, series)) for r in regions]
    else:
        with ProcessPoolExecutor(max_workers=jobs, initializer=_init_worker, initargs=(plan, str(data_dir))) as pool:
            results = list(pool.map(_work, regions))
    return {r: doc for r, doc in results if doc is not None}


# --------------------------------------------------------------------------------------
# Contrato
# --------------------------------------------------------------------------------------
def validate_variable(plan: VariablePlan, docs: dict[str, dict], regions: list[str]) -> list[str]:
    """Problemas de los archivos de una variable frente a contracts/compare-files.md (vacío = válido)."""
    errs: list[str] = []
    seen: set[tuple[str, str]] = set()
    for region, doc in docs.items():
        where = f"{plan.id}/{region}"
        for key in ("schema_version", "variable", "region", "basis", "unit", "end", "starts", "columns", "partners"):
            if key not in doc:
                errs.append(f"{where}: falta «{key}»")
        if errs:
            continue
        if doc["schema_version"] != SCHEMA_VERSION or doc["variable"] != plan.id or doc["region"] != region:
            errs.append(f"{where}: cabecera incoherente")
        if doc["columns"] != COLUMNS or doc["starts"] != plan.starts or doc["end"] != plan.end:
            errs.append(f"{where}: columnas o ventanas distintas de las del índice")
        if doc["basis"] != plan.basis or doc["unit"] != plan.unit:
            errs.append(f"{where}: base o unidad distintas de las del índice")
        blocked = doc.get("not_comparable", {})
        for other, reason in blocked.items():
            if reason not in REASONS:
                errs.append(f"{where}: motivo desconocido {reason!r} con {other}")
            if other in doc["partners"]:
                errs.append(f"{where}: {other} está en «partners» y en «not_comparable»")
        for other in list(doc["partners"]) + list(blocked):
            if other <= region or other not in regions:
                errs.append(f"{where}: {other} no es una región posterior con serie")
            if (region, other) in seen:
                errs.append(f"{where}: par repetido con {other}")
            seen.add((region, other))
        for other, rows in doc["partners"].items():
            if len(rows) != len(plan.starts):
                errs.append(f"{where}: {other} no tiene una fila por año inicial")
                continue
            for start, row in zip(plan.starts, rows):
                at = f"{where} con {other}, {start}–{plan.end}"
                if len(row) != len(COLUMNS):
                    errs.append(f"{at}: fila de {len(row)} columnas")
                    continue
                n, diff, low, high, p, status = row
                figures = [diff, low, high, p]
                if status not in STATUSES:
                    errs.append(f"{at}: estado desconocido {status!r}")
                elif status in ("insufficient", "invalid"):
                    if any(x is not None for x in figures):
                        errs.append(f"{at}: {status} con cifras")
                elif any(x is None or not np.isfinite(x) for x in figures):
                    errs.append(f"{at}: {status} sin cifras")
                elif not (low <= diff <= high):
                    errs.append(f"{at}: intervalo que no contiene la diferencia")
                elif not (0 <= p <= 1) or (status == "differ") != (p < plan.alpha and diff != 0):
                    errs.append(f"{at}: estado incoherente con p y α")
                if not (isinstance(n, int) and 0 <= n <= plan.end - start + 1):
                    errs.append(f"{at}: n fuera de rango")
                if status == "insufficient" and n >= plan.min_years:
                    errs.append(f"{at}: insufficient con {n} años")
    expected = len(regions) * (len(regions) - 1) // 2
    if len(seen) != expected:
        errs.append(f"{plan.id}: {len(seen)} pares, se esperaban {expected}")
    return errs


def count_pairs(docs: dict[str, dict]) -> int:
    return sum(len(d["partners"]) + len(d.get("not_comparable", {})) for d in docs.values())


# --------------------------------------------------------------------------------------
# Escritura
# --------------------------------------------------------------------------------------
def _dump(doc: dict) -> str:
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def write_variable(compare_dir: Path, variable_id: str, docs: dict[str, dict]) -> int:
    """Todo o nada por variable: se escribe en una carpeta temporal y se cambia de una vez. Devuelve los bytes."""
    compare_dir.mkdir(parents=True, exist_ok=True)
    tmp = compare_dir / f".tmp-{variable_id}-{os.getpid()}"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir()
    size = 0
    try:
        for region, doc in docs.items():
            size += (tmp / f"{region}.json").write_bytes(_dump(doc).encode("utf-8"))
        final = compare_dir / variable_id
        shutil.rmtree(final, ignore_errors=True)
        tmp.rename(final)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return size


def write_index(compare_dir: Path, index: dict) -> None:
    tmp = compare_dir / f".tmp-index-{os.getpid()}.json"
    tmp.write_text(_dump(index), encoding="utf-8")
    os.replace(tmp, compare_dir / "index.json")


def read_index(compare_dir: Path) -> dict | None:
    path = compare_dir / "index.json"
    return _load(path) if path.exists() else None


# --------------------------------------------------------------------------------------
# Órdenes
# --------------------------------------------------------------------------------------
def build(data_dir: Path, variable_ids: list[str] | None = None, jobs: int = 1, log=print) -> dict:
    """Calcula y publica `compare/` para las variables pedidas (todas las del catálogo si es None)."""
    catalog = _load(data_dir / "catalog.json")
    by_id = {v["id"]: v for v in catalog["variables"]}
    wanted = list(by_id) if variable_ids is None else variable_ids
    unknown = [v for v in wanted if v not in by_id]
    if unknown:
        raise ValueError(f"Variables que no están en el catálogo: {', '.join(unknown)}. "
                         f"El catálogo tiene: {', '.join(by_id)}.")
    compare_dir = data_dir / "compare"
    previous = read_index(compare_dir) or {}
    # Se conservan las variables ya publicadas que siguen en el catálogo y no se recalculan ahora.
    entries = {k: v for k, v in previous.get("variables", {}).items() if k in by_id and k not in wanted}

    def publish_index() -> dict:
        index = {"schema_version": SCHEMA_VERSION,
                 "built_at_utc": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                 "alpha": float(catalog["alpha"]), "method": METHOD,
                 "variables": {k: entries[k] for k in by_id if k in entries}}
        compare_dir.mkdir(parents=True, exist_ok=True)
        write_index(compare_dir, index)
        return index

    for variable_id in wanted:
        t0 = time.perf_counter()
        fingerprint = series_fingerprint(data_dir, variable_id)
        series = load_variable_series(data_dir, variable_id)
        plan = plan_for(catalog, by_id[variable_id], series)
        if plan is None:
            log(f"{variable_id}: sin series o sin ventanas suficientes; no se publica su comparación.")
            shutil.rmtree(compare_dir / variable_id, ignore_errors=True)
            publish_index()
            continue
        docs = build_variable(plan, series, data_dir, jobs)
        problems = validate_variable(plan, docs, sorted(series))
        if problems:
            raise ValueError(f"{variable_id}: la salida no cumple el contrato y no se escribió nada:\n  "
                             + "\n  ".join(problems[:20]))
        size = write_variable(compare_dir, variable_id, docs)
        entries[variable_id] = {"basis": plan.basis, "unit": plan.unit, "end": plan.end, "starts": plan.starts,
                                "n_pairs": count_pairs(docs), "series_sha256": fingerprint}
        biggest = max(len(_dump(d).encode("utf-8")) for d in docs.values())
        log(f"{variable_id}: {entries[variable_id]['n_pairs']} pares × {len(plan.starts)} ventanas, base {plan.basis}, "
            f"{size / 1e6:.2f} MB (archivo mayor {biggest / 1e3:.0f} kB), {time.perf_counter() - t0:.0f} s")
        publish_index()  # tras cada variable: si la siguiente falla, el índice ya describe lo escrito
    return publish_index()


def check(data_dir: Path) -> tuple[list[str], list[str]]:
    """(desfasadas, sin publicar): variables cuya huella no coincide y variables del catálogo sin comparación."""
    catalog = _load(data_dir / "catalog.json")
    index = read_index(data_dir / "compare") or {"variables": {}}
    stale, missing = [], []
    for variable in catalog["variables"]:
        entry = index["variables"].get(variable["id"])
        if entry is None:
            missing.append(variable["id"])
        elif entry["series_sha256"] != series_fingerprint(data_dir, variable["id"]):
            stale.append(variable["id"])
    return stale, missing


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", default=str(DEFAULT_DATA_DIR), help="carpeta publicada con catalog.json y series/")
    ap.add_argument("--variables", default=None, help="ids separados por coma (por omisión, todas las del catálogo)")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 1, help="procesos en paralelo")
    ap.add_argument("--check", action="store_true", help="solo comprobar que compare/ corresponde a las series")
    args = ap.parse_args(argv)
    data_dir = Path(args.data)
    if args.check:
        stale, missing = check(data_dir)
        for v in missing:
            print(f"aviso: {v} está en el catálogo y no tiene comparación publicada.")
        for v in stale:
            print(f"DESFASADA: las series de {v} cambiaron después de calcular su comparación. "
                  f"Ejecuta: python compare_build.py --variables {v}")
        if not stale:
            print("compare/ corresponde a las series publicadas.")
        return 1 if stale else 0
    ids = [v.strip() for v in args.variables.split(",") if v.strip()] if args.variables else None
    t0 = time.perf_counter()
    try:
        index = build(data_dir, ids, max(1, args.jobs))
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    size = sum(p.stat().st_size for p in (data_dir / "compare").rglob("*.json"))
    print(f"Listo: {len(index['variables'])} variables en compare/, {size / 1e6:.2f} MB en total, "
          f"{time.perf_counter() - t0:.0f} s.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
