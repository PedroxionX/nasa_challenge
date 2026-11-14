"""Series regionales, tabla de ventanas, mapa y catálogo; escritura validada «todo o nada» (FR-D01 a FR-D05).

Uso:
    python build.py --regions MX-BCN,US-TX --out out/t005          # prueba con dos regiones (GES DISC)
    python build.py --out ../web/public/data/trends                 # las 84 regiones (T006)
    python build.py --source power --regions MX-BCN,US-TX ...       # alternativa NASA POWER, solo a mano

Método (specs/001-trend-explorer-mvp/plan.md, «Método de principio a fin»):
1. Leer la rejilla mensual de la fuente (sources/: MERRA-2 e IMERG de GES DISC; POWER como alternativa).
2. Pesos por celda en la malla de cada variable: cos(latitud) × fracción cubierta (weights).
3. Serie mensual regional = media ponderada; un mes regional solo es válido si todas sus celdas lo son.
4. Validación y años completos con el núcleo del laboratorio (trendlens.processing): unidad, relleno,
   rango físico, tasa → acumulado con la duración real del mes, año completo = 12 meses válidos, sin interpolar.
5. Periodo por variable: del primer al último año con 12 meses en la fuente.
6. Para cada ventana de al menos 10 años: Theil-Sen, intervalo de Sen, Mann-Kendall original y con
   corrección AR(1), r1, MCO con ajuste de Santer; estado asignado aquí.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

import contract
import variables
from power_regional import PIPELINE_DIR, unique_manifest_path
from regions import ALL_REGION_IDS
from sources.base import GridData, ReadFailed
from trendlens.config import ALPHA_DEFAULT, MIN_YEARS_FOR_TEST, Location, VariableSpec
from trendlens.processing import clean_monthly, to_annual
from trendlens.schema import Provenance, SeriesBundle, make_frame
from trendlens.stats.diagnostics import acf, step_vs_linear
from trendlens.stats.engine import trend_core
from variables import MAP_LABELS, VarDef
from weights import MERRA2_GRID, CellWeights, GridSpec, Region, load_regions, region_weights

SHORT_SERIES_YEARS = 30
SPATIAL_METHOD = "Promedio de área ponderado por cos(latitud) y fracción de la celda cubierta por el polígono"
MANIFEST_DIR = PIPELINE_DIR / "manifest"
METHOD = {"slope": "theil-sen", "test": "mann-kendall-ar1-corrected", "interval": "sen-1968-95",
          "contrast": "ols-santer-2000"}


def _r(x: Any, nd: int) -> float | None:
    if x is None:
        return None
    x = float(x)
    return round(x, nd) if np.isfinite(x) else None


def _p(x: Any) -> float | None:
    """Valores p sin redondear: redondear podría mostrar 0.05 en una fila con estado significativo."""
    if x is None:
        return None
    x = float(x)
    return min(max(x, 0.0), 1.0) if np.isfinite(x) else None


# --------------------------------------------------------------------------------------
# Serie regional
# --------------------------------------------------------------------------------------
def regional_monthly(grid, cw: CellWeights) -> np.ndarray:
    """Media ponderada por mes; NaN si falta cualquiera de las celdas con peso."""
    lookup = {(round(float(a), 4), round(float(o), 4)): i for i, (a, o) in enumerate(zip(grid.lats, grid.lons))}
    try:
        idx = np.array([lookup[(round(float(a), 4), round(float(o), 4))] for a, o in zip(cw.lats, cw.lons)])
    except KeyError as exc:
        raise KeyError(f"La lectura no incluye la celda {exc.args[0]}: revisa el recuadro de lectura.") from exc
    vals = grid.values[idx]
    out = (cw.weights[:, None] * vals).sum(axis=0) / cw.weights.sum()
    out[np.isnan(vals).any(axis=0)] = np.nan
    return out


def regional_bundle(region: Region, spec: VariableSpec, months: list[tuple[int, int]], values: np.ndarray,
                    source: str, product: str, grid_text: str) -> SeriesBundle:
    pt = region.geometry.representative_point()
    loc = Location(region.id, region.name, float(pt.y), float(pt.x))
    ts = [pd.Timestamp(year=y, month=m, day=1) for y, m in months]
    df = make_frame(ts, values, variable=spec, location=loc, unit=spec.native_unit, source=source,
                    product=product, spatial_resolution=grid_text, is_synthetic=False,
                    quality_flags=np.where(np.isnan(values), "fill_value", "ok"))
    prov = Provenance(source=source, product=product, is_synthetic=False, retrieved_at_utc="", origin="regional")
    return SeriesBundle(df, spec, loc, prov)


def complete_period(months: list[tuple[int, int]], first_request_year: int, max_last_year: int) -> tuple[int, int]:
    """Primer y último año con los 12 meses disponibles en la fuente (el último no pasa de `max_last_year`)."""
    count: dict[int, int] = {}
    for y, _ in months:
        count[y] = count.get(y, 0) + 1
    full = sorted(y for y, c in count.items() if c == 12 and first_request_year <= y <= max_last_year)
    if not full:
        raise ValueError("La fuente no tiene ningún año completo en el periodo pedido.")
    return full[0], full[-1]


# --------------------------------------------------------------------------------------
# Ventanas
# --------------------------------------------------------------------------------------
@dataclass
class WindowStats:
    row: list[Any]
    slope_decade_raw: float | None
    mean: float | None
    slope_pct_raw: float | None = None


_NO_PCT = [None, None, None]


def pct_of_mean(slope_decade: float, ci: tuple[float, float], mean: float) -> list[float | None]:
    """Cambio relativo en % por década: pendiente e intervalo ÷ media de la ventana × 100. null si la media ≤ 0."""
    if not (np.isfinite(mean) and mean > 0):
        return list(_NO_PCT)
    return [_r(slope_decade / mean * 100, 4), _r(ci[0] / mean * 100, 4), _r(ci[1] / mean * 100, 4)]


def sen_line_mid(t: np.ndarray, x: np.ndarray, slope_per_year: float, start: int, end: int) -> float:
    """Valor de la recta de Theil-Sen en el año central c = (start + end) / 2: mediana(yᵢ − b·(tᵢ − c))."""
    c = (start + end) / 2
    return float(np.median(x - slope_per_year * (t - c)))


def analyze_window(start: int, end: int, years: np.ndarray, values: np.ndarray, small_region: bool,
                   alpha: float = ALPHA_DEFAULT, relative_change: bool = False) -> WindowStats:
    m = (years >= start) & (years <= end)
    t, x = years[m].astype(float), values[m]
    n = int(len(x))
    flags: list[str] = []
    if small_region:
        flags.append("small_region")
    if n < SHORT_SERIES_YEARS:
        flags.append("short")
    if n < MIN_YEARS_FOR_TEST:
        return WindowStats([start, end, n, None, None, None, None, None, None, None, None, "insufficient", flags]
                           + [None] + _NO_PCT, None, None)
    if np.ptp(x) == 0:
        return WindowStats([start, end, n, None, None, None, None, None, None, None, None, "invalid", flags]
                           + [None] + _NO_PCT, None, None)
    c = trend_core(t, x, alpha)
    if len(np.unique(x)) < n:
        flags.append("ties")
    if c.primary.significant_lags:
        flags.append("autocorr")
    step = step_vs_linear(t, x)
    if step is not None and step.favors_step:
        flags.append("step")
    r1 = float(acf(x - c.sen_slope * t, 1)[1])
    p = c.primary.p_value
    slope = c.sen_slope * 10
    if not (np.isfinite(p) and np.isfinite(slope) and np.all(np.isfinite(c.sen_ci))):
        status = "invalid"
    elif p < alpha and slope > 0:
        status = "increasing"
    elif p < alpha and slope < 0:
        status = "decreasing"
    else:
        status = "inconclusive"
    ols = c.ols
    ols_slope = ols.slope * 10 if ols is not None else None
    ols_p = (ols.adj_p_value if ols.adj_valid else None) if ols is not None else None
    mean = float(np.mean(x))
    pct = list(_NO_PCT)
    if relative_change and status != "invalid":
        pct = pct_of_mean(slope, (c.sen_ci[0] * 10, c.sen_ci[1] * 10), mean)
    slope_out = _r(slope, 6)
    line_mid = _r(sen_line_mid(t, x, c.sen_slope, start, end), 6) if slope_out is not None else None
    row = [start, end, n, slope_out, _r(c.sen_ci[0] * 10, 6), _r(c.sen_ci[1] * 10, 6), _p(p), _p(c.mk.p_value),
           _r(r1, 4), _r(ols_slope, 6), _p(ols_p), status, flags, line_mid] + pct
    slope_pct = slope / mean * 100 if pct[0] is not None else None
    return WindowStats(row, float(slope), mean, slope_pct)


# --------------------------------------------------------------------------------------
# Documentos
# --------------------------------------------------------------------------------------
@dataclass
class SeriesResult:
    doc: dict[str, Any]
    map_values: dict[str, float | None]


def build_series(region: Region, cw: CellWeights, var: VarDef, data: GridData, first_year: int, last_year: int,
                 manifest_ref: str) -> SeriesResult:
    spec, info = var.spec, data.info
    monthly = regional_monthly(data, cw)
    bundle = regional_bundle(region, spec, data.months, monthly, info.source, info.product, info.grid_text)
    clean, rep = clean_monthly(bundle, first_year, last_year)
    annual = to_annual(clean, spec)
    years = annual["year"].to_numpy(dtype=int)
    values = annual["value"].to_numpy(dtype=float)

    partial = None
    nxt = [k for k, (y, _) in enumerate(data.months) if y == last_year + 1]
    if nxt:
        valid = int(np.isfinite(monthly[nxt]).sum())
        if valid:
            partial = {"year": last_year + 1, "months_valid": valid}

    rows, map_values = [], {}
    for s, e in contract.window_keys(first_year, last_year):
        ws = analyze_window(s, e, years, values, cw.small_region, relative_change=var.relative_change)
        rows.append(ws.row)
        # El valor del mapa ES el de la serie (contrato): mismo número y mismo redondeo que su columna
        # (slope_decade con 6 decimales; slope_decade_pct con 4 en variables con relative_change).
        cols = dict(zip(contract.WINDOW_COLUMNS_EXT, ws.row))
        map_values[f"{s}-{e}"] = cols["slope_decade_pct"] if var.relative_change else cols["slope_decade"]

    # Diagnósticos del periodo completo (first_year–last_year), no de la primera fila.
    m_full = (years >= first_year) & (years <= last_year)
    step = step_vs_linear(years[m_full].astype(float), values[m_full]) if m_full.sum() >= MIN_YEARS_FOR_TEST else None
    full_row = next(dict(zip(contract.WINDOW_COLUMNS_EXT, r)) for r in rows if (r[0], r[1]) == (first_year, last_year))

    transformations = list(region.transformations)
    transformations += [
        "relleno declarado por la fuente → faltante",
        var.conversion,
        f"promedio de área de {cw.n_cells} celdas de {info.grid_text} (peso = cos(latitud) × fracción cubierta); "
        "un mes regional solo es válido si todas sus celdas lo son",
    ]
    if rep.n_out_of_range:
        transformations.append(f"{rep.n_out_of_range} meses fuera de rango físico → faltante")
    if spec.aggregation != "sum_from_rate":
        transformations.append("media anual ponderada por los días de cada mes")
    transformations.append("años incompletos excluidos, sin interpolar")
    transformations.append("line_mid = valor de la recta de Theil-Sen en el año central c = (start + end) / 2: "
                           "mediana(y − b·(t − c)) sobre los años completos de la ventana, b = slope_decade / 10; "
                           "null si slope_decade es null")
    if var.relative_change:
        transformations.append("cambio relativo (slope_decade_pct, ci_low_pct, ci_high_pct) = pendiente e intervalo "
                               "por década ÷ media de los valores anuales de la ventana × 100; null si la media es ≤ 0")

    doc = {
        "schema_version": contract.SCHEMA_VERSION,
        "region": region.id,
        "variable": var.id,
        "unit": var.unit_annual,
        "years": [int(y) for y in years],
        "values": [_r(v, 4) for v in values],
        "excluded_years": sorted(int(y) for y in rep.incomplete_years),
        "partial_year": partial,
        "provenance": {
            "source": info.source,
            "product": info.product,
            "short_name": info.short_name,
            "version": info.version,
            "doi": info.doi,
            "api_version": info.api_version,
            "parameter": info.parameter,
            "unit_declared": info.unit_declared,
            "grid": info.grid_text,
            "spatial_method": SPATIAL_METHOD,
            "n_cells": cw.n_cells,
            "granules": data.granules_by_region.get(region.id),
            "retrieved_at_utc": data.retrieved_by_region.get(region.id),
            "requests": manifest_ref,
            "transformations": transformations,
            "is_synthetic": False,
        },
        "diagnostics": {
            "step_year": step.change_year if step is not None and step.favors_step else None,
            "autocorr_significant": "autocorr" in full_row["flags"],
        },
        "windows": {"columns": contract.WINDOW_COLUMNS_EXT, "rows": rows},
    }
    return SeriesResult(doc, map_values)


def map_doc(var: VarDef, region_ids: list[str], results: dict[str, SeriesResult], first_year: int, last_year: int
            ) -> dict[str, Any]:
    keys = [f"{s}-{e}" for s, e in contract.window_keys(first_year, last_year)]
    windows = {k: [results[r].map_values[k] if r in results else None for r in region_ids] for k in keys}
    return {"schema_version": contract.SCHEMA_VERSION, "variable": var.id, "unit": var.map_unit,
            "regions": region_ids, "windows": windows,
            "classes": {"breaks": var.breaks, "labels": MAP_LABELS}}


def catalog_doc(regions: list[Region], coarse: dict[str, CellWeights], vars_: list[VarDef],
                periods: dict[str, tuple[int, int]], infos: dict[str, Any], built_at: str) -> dict[str, Any]:
    fy = min(p[0] for p in periods.values())
    ly = max(p[1] for p in periods.values())
    return {
        "schema_version": contract.SCHEMA_VERSION,
        "built_at_utc": built_at,
        "alpha": ALPHA_DEFAULT,
        "period": {"first_year": fy, "last_complete_year": ly, "min_window_years": contract.MIN_WINDOW},
        "method": METHOD,
        "variables": [{"id": v.id, **v.catalog_fields, "first_year": periods[v.id][0],
                       "last_complete_year": periods[v.id][1], "product_short_name": infos[v.id].short_name,
                       "product_version": infos[v.id].version} for v in vars_],
        "regions": [{"id": r.id, "name": r.name, "country": r.country, "n_cells": coarse[r.id].n_cells,
                     "small_region": coarse[r.id].small_region} for r in regions],
    }


# --------------------------------------------------------------------------------------
# Validación conjunta y escritura «todo o nada»
# --------------------------------------------------------------------------------------
def validate_outputs(files: dict[str, dict], region_ids: list[str], vars_: list[VarDef],
                     cells: dict[str, dict[str, int]], periods: dict[str, tuple[int, int]]) -> None:
    problems: list[str] = []
    cat = files.get("catalog.json")
    if cat is None:
        problems.append("falta catalog.json")
    else:
        problems += [f"catalog.json: {p}" for p in contract.validate_catalog(cat)]
        if [r["id"] for r in cat["regions"]] != region_ids:
            problems.append("catalog.json: las regiones no son exactamente las pedidas")
    for var in vars_:
        fy, ly = periods[var.id]
        series = {}
        for rid in region_ids:
            path = f"series/{var.id}/{rid}.json"
            if cells[var.id][rid] == 0:
                if path in files:
                    problems.append(f"{path}: una región sin celdas no debe tener archivo")
                continue
            doc = files.get(path)
            if doc is None:
                problems.append(f"falta {path}")
                continue
            problems += [f"{path}: {p}" for p in contract.validate_series(doc, fy, ly)]
            if doc["provenance"].get("is_synthetic") is not False:
                problems.append(f"{path}: los datos publicados no pueden ser sintéticos")
            if not var.relative_change:
                n_pct = len(contract.PCT_COLUMNS)
                if any(v is not None for row in doc["windows"]["rows"] for v in row[-n_pct:]):
                    problems.append(f"{path}: las columnas de % deben ser null en una variable sin relative_change")
            series[rid] = doc
        mp = files.get(f"map/{var.id}.json")
        if mp is None:
            problems.append(f"falta map/{var.id}.json")
        else:
            problems += [f"map/{var.id}.json: {p}" for p in contract.validate_map(mp, series)]
            if mp["regions"] != region_ids:
                problems.append(f"map/{var.id}.json: las regiones no son las del catálogo")
            if len(mp["windows"]) != len(contract.window_keys(fy, ly)):
                problems.append(f"map/{var.id}.json: número de ventanas distinto del periodo {fy}–{ly}")
    contract.assert_valid("La salida", problems)


def write_all_or_nothing(out_dir: Path, files: dict[str, dict]) -> None:
    """Escribe todo en un directorio temporal y lo intercambia con `out_dir` al final."""
    out_dir = Path(out_dir)
    out_dir.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix=".trends-tmp-", dir=out_dir.parent))
    try:
        for rel, doc in files.items():
            p = tmp / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(doc, ensure_ascii=False, allow_nan=False, separators=(",", ":")), encoding="utf-8")
        old = None
        if out_dir.exists():
            old = out_dir.with_name(out_dir.name + ".old-" + _dt.datetime.now().strftime("%Y%m%d%H%M%S"))
            os.replace(out_dir, old)
        os.replace(tmp, out_dir)
        if old is not None:
            shutil.rmtree(old, ignore_errors=True)
    except BaseException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


def write_manifest(path: Path, entries: list[dict[str, Any]]) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    run_at = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    path.write_text(json.dumps({"run_at_utc": run_at, "requests": entries}, ensure_ascii=False, indent=1),
                    encoding="utf-8")
    return path


# --------------------------------------------------------------------------------------
# Orquestación
# --------------------------------------------------------------------------------------
def default_sources(source: str) -> dict[str, Any]:
    """Fuente por variable. `gesdisc` es la de producción; `power` solo si se elige a mano."""
    if source == "gesdisc":
        from sources.gesdisc import GesDiscSource
        from sources.imerg import IMERG_PRECIP
        from sources.merra2 import MERRA2_T2M

        return {"air_temperature": GesDiscSource(MERRA2_T2M), "precipitation": GesDiscSource(IMERG_PRECIP)}
    if source == "power":
        from sources.power import PowerSource

        p = PowerSource()
        return {"air_temperature": p, "precipitation": p}
    raise ValueError(f"Fuente desconocida: {source!r} (gesdisc | power).")


def build(region_ids: list[str], var_ids: list[str], out_dir: Path, sources: dict[str, Any],
          manifest_dir: Path = MANIFEST_DIR, today: _dt.date | None = None,
          last_year_max: int | None = None) -> dict[str, dict]:
    today = today or _dt.date.today()
    last_year_max = last_year_max if last_year_max is not None else today.year - 1
    manifest_path = unique_manifest_path(manifest_dir, today.isoformat())
    manifest_ref = f"manifest/{manifest_path.name}"

    regions = load_regions(region_ids)
    region_ids = [r.id for r in regions]
    all_regions = load_regions()  # la caché de GES DISC guarda siempre las celdas de las 84 regiones
    weights_by_grid: dict[str, dict[str, CellWeights]] = {}

    def grid_weights(grid: GridSpec) -> dict[str, CellWeights]:
        if grid.name not in weights_by_grid:
            weights_by_grid[grid.name] = {r.id: region_weights(r.geometry, grid) for r in all_regions}
        return weights_by_grid[grid.name]

    files: dict[str, dict] = {}
    vars_: list[VarDef] = []
    periods: dict[str, tuple[int, int]] = {}
    infos: dict[str, Any] = {}
    cells: dict[str, dict[str, int]] = {}
    used_sources: list[Any] = []
    try:
        for var_id in var_ids:
            src = sources[var_id]
            if src not in used_sources:
                used_sources.append(src)
            var = variables.get(var_id, src.id)
            vars_.append(var)
            w_all = grid_weights(var.grid)
            union = {(round(float(a), 4), round(float(o), 4)) for w in w_all.values() for a, o in zip(w.lats, w.lons)}
            ulats, ulons = (np.array(c) for c in zip(*sorted(union)))
            w = {r.id: w_all[r.id] for r in regions}
            data = src.read(var, regions, w, ulats, ulons, var.first_request_year, today.year)
            fy, ly = complete_period(data.months, var.first_request_year, last_year_max)
            periods[var_id], infos[var_id] = (fy, ly), data.info
            cells[var_id] = {r.id: w[r.id].n_cells for r in regions}
            results: dict[str, SeriesResult] = {}
            for r in regions:
                if w[r.id].n_cells == 0:
                    continue
                res = build_series(r, w[r.id], var, data, fy, ly, manifest_ref)
                results[r.id] = res
                files[f"series/{var_id}/{r.id}.json"] = res.doc
            files[f"map/{var_id}.json"] = map_doc(var, region_ids, results, fy, ly)
    finally:
        write_manifest(manifest_path, [e for s in used_sources for e in s.manifest])

    built_at = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    coarse = grid_weights(MERRA2_GRID)
    files["catalog.json"] = catalog_doc(regions, coarse, vars_, periods, infos, built_at)
    validate_outputs(files, region_ids, vars_, cells, periods)
    write_all_or_nothing(out_dir, files)
    return files


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--regions", default=",".join(ALL_REGION_IDS), help="ids ISO 3166-2 separados por coma")
    ap.add_argument("--variables", default=",".join(variables.VARIABLE_IDS))
    ap.add_argument("--source", default="gesdisc", choices=["gesdisc", "power"],
                    help="gesdisc (MERRA-2 e IMERG, por omisión) o power (alternativa; solo a mano)")
    ap.add_argument("--out", default=str(PIPELINE_DIR / "out" / "trends"))
    ap.add_argument("--last-year", type=int, default=None, help="tope del último año completo (por omisión, el año pasado)")
    args = ap.parse_args(argv)
    region_ids = [r.strip() for r in args.regions.split(",") if r.strip()]
    var_ids = [c.strip() for c in args.variables.split(",") if c.strip()]
    t0 = _dt.datetime.now()
    try:
        files = build(region_ids, var_ids, Path(args.out), default_sources(args.source), last_year_max=args.last_year)
    except ReadFailed as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print(f"Regiones afectadas: {', '.join(exc.affected_regions)}", file=sys.stderr)
        print("No se escribió nada. Vuelve a ejecutar: la caché reutiliza lo ya leído.", file=sys.stderr)
        return 2
    except contract.ContractError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print("No se escribió nada.", file=sys.stderr)
        return 3
    secs = (_dt.datetime.now() - t0).total_seconds()
    size = sum(p.stat().st_size for p in Path(args.out).rglob("*.json"))
    print(f"OK: {len(files)} archivos en {args.out} · {size / 1e6:.2f} MB · {secs:.0f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
