"""Series regionales, tabla de ventanas, mapa y catálogo; escritura validada «todo o nada» (FR-D02 a FR-D05, T004).

Uso:
    python build.py --regions MX-BCN,US-TX --out out/t005           # prueba con dos regiones
    python build.py --out ../web/public/data/trends                  # las 84 regiones (T006)

Método (specs/001-trend-explorer-mvp/plan.md, «Método de principio a fin»):
1. Descargar la cuadrícula mensual por teselas (power_regional).
2. Pesos por celda: cos(latitud) × fracción cubierta (weights).
3. Serie mensual regional = media ponderada; un mes regional solo es válido si todas sus celdas lo son.
4. Validación y años completos con el núcleo del laboratorio (trendlens.processing): unidad, relleno,
   rango físico, precipitación tasa × días → mm/mes, año completo = 12 meses válidos, sin interpolar.
5. Para cada ventana de al menos 10 años: Theil-Sen, intervalo de Sen, Mann-Kendall original y con
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
from power_regional import (CellGrid, DownloadFailed, Downloader, PIPELINE_DIR, Tile, merge_grids,
                            tiles_for_bounds, unique_manifest_path)
from regions import ALL_REGION_IDS
from trendlens.config import ALPHA_DEFAULT, MIN_YEARS_FOR_TEST, POWER_FIRST_YEAR, VARIABLES, Location, VariableSpec
from trendlens.processing import clean_monthly, to_annual
from trendlens.schema import Provenance, SeriesBundle, make_frame
from trendlens.stats.diagnostics import acf, step_vs_linear
from trendlens.stats.engine import trend_core
from weights import CellWeights, Region, load_regions, region_weights

SHORT_SERIES_YEARS = 30
GRID_TEXT = "0.5° × 0.625°"
SPATIAL_METHOD = "Promedio de área ponderado por cos(latitud) y cobertura del polígono"
MANIFEST_DIR = PIPELINE_DIR / "manifest"

VARIABLE_META: dict[str, dict[str, Any]] = {
    "T2M": {
        "label": "Temperatura del aire",
        "definition": ("Temperatura media del aire a 2 m sobre la superficie, del reanálisis MERRA-2 (modelo con "
                       "asimilación de observaciones). No es la temperatura de una estación ni la del suelo."),
        "kind": "reanalysis", "unit_annual": "°C", "aggregation": "mean_day_weighted", "relative_change": False,
        "map_unit": "°C/década",
        # Provisionales: se fijan al ver la distribución real (contrato, «map»).
        "breaks": [-0.4, -0.1, 0.1, 0.4],
    },
    "PRECTOTCORR": {
        "label": "Precipitación",
        "definition": ("Precipitación total corregida con observaciones, del reanálisis MERRA-2. La tasa mensual "
                       "(mm/día) se convierte a acumulado con los días reales de cada mes y se suma por año."),
        "kind": "reanalysis", "unit_annual": "mm/año", "aggregation": "sum_from_rate", "relative_change": True,
        "map_unit": "%/década",
        "breaks": [-10.0, -3.0, 3.0, 10.0],
    },
}
MAP_LABELS = ["Baja mucho", "Baja", "Casi sin cambio", "Sube", "Sube mucho"]
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
def regional_monthly(grid: CellGrid, cw: CellWeights) -> np.ndarray:
    """Media ponderada por mes; NaN si falta cualquiera de las celdas con peso."""
    lookup = {(round(float(a), 4), round(float(o), 4)): i for i, (a, o) in enumerate(zip(grid.lats, grid.lons))}
    try:
        idx = np.array([lookup[(round(float(a), 4), round(float(o), 4))] for a, o in zip(cw.lats, cw.lons)])
    except KeyError as exc:
        raise KeyError(f"La descarga no incluye la celda {exc.args[0]}: revisa las teselas.") from exc
    vals = grid.values[idx]
    out = (cw.weights[:, None] * vals).sum(axis=0) / cw.weights.sum()
    out[np.isnan(vals).any(axis=0)] = np.nan
    return out


def regional_bundle(region: Region, variable: VariableSpec, months: list[tuple[int, int]], values: np.ndarray
                    ) -> SeriesBundle:
    pt = region.geometry.representative_point()
    loc = Location(region.id, region.name, float(pt.y), float(pt.x))
    ts = [pd.Timestamp(year=y, month=m, day=1) for y, m in months]
    df = make_frame(ts, values, variable=variable, location=loc, unit=variable.native_unit, source="NASA POWER",
                    product="MERRA2", spatial_resolution=GRID_TEXT, is_synthetic=False,
                    quality_flags=np.where(np.isnan(values), "fill_value", "ok"))
    prov = Provenance(source="NASA POWER — API mensual regional", product="MERRA2", is_synthetic=False,
                      retrieved_at_utc="", origin="nasa_power")
    return SeriesBundle(df, variable, loc, prov)


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


def build_series(region: Region, cw: CellWeights, variable: VariableSpec, grid: CellGrid, first_year: int,
                 last_year: int, retrieved_at: str, manifest_ref: str) -> SeriesResult:
    monthly = regional_monthly(grid, cw)
    bundle = regional_bundle(region, variable, grid.months, monthly)
    clean, rep = clean_monthly(bundle, first_year, last_year)
    annual = to_annual(clean, variable)
    years = annual["year"].to_numpy(dtype=int)
    values = annual["value"].to_numpy(dtype=float)

    partial = None
    nxt = [k for k, (y, _) in enumerate(grid.months) if y == last_year + 1]
    if nxt:
        valid = int(np.isfinite(monthly[nxt]).sum())
        if valid:
            partial = {"year": last_year + 1, "months_valid": valid}

    meta = VARIABLE_META[variable.code]
    rows, map_values = [], {}
    for s, e in contract.window_keys(first_year, last_year):
        ws = analyze_window(s, e, years, values, cw.small_region, relative_change=meta["relative_change"])
        rows.append(ws.row)
        # El mapa de precipitación usa el mismo % por década que la columna slope_decade_pct.
        mv = ws.slope_pct_raw if meta["relative_change"] else ws.slope_decade_raw
        map_values[f"{s}-{e}"] = _r(mv, 4)

    # Diagnósticos del periodo completo (first_year–last_year), no de la primera fila.
    m_full = (years >= first_year) & (years <= last_year)
    step = step_vs_linear(years[m_full].astype(float), values[m_full]) if m_full.sum() >= MIN_YEARS_FOR_TEST else None
    full_row = next(dict(zip(contract.WINDOW_COLUMNS_EXT, r)) for r in rows if (r[0], r[1]) == (first_year, last_year))

    transformations = list(region.transformations)
    transformations += [
        "relleno −999 → faltante",
        f"promedio de área de {cw.n_cells} celdas (peso = cos(latitud) × fracción cubierta); "
        "un mes regional solo es válido si todas sus celdas lo son",
    ]
    if rep.n_out_of_range:
        transformations.append(f"{rep.n_out_of_range} meses fuera de rango físico → faltante")
    if variable.aggregation == "sum_from_rate":
        transformations.append("tasa mm/día × días reales del mes → mm/mes; suma de 12 meses → mm/año")
    else:
        transformations.append("media anual ponderada por los días de cada mes")
    transformations.append("años incompletos excluidos, sin interpolar")
    transformations.append("line_mid = valor de la recta de Theil-Sen en el año central c = (start + end) / 2: "
                           "mediana(y − b·(t − c)) sobre los años completos de la ventana, b = slope_decade / 10; "
                           "null si slope_decade es null")
    if meta["relative_change"]:
        transformations.append("cambio relativo (slope_decade_pct, ci_low_pct, ci_high_pct) = pendiente e intervalo "
                               "por década ÷ media de los valores anuales de la ventana × 100; null si la media es ≤ 0")

    doc = {
        "schema_version": contract.SCHEMA_VERSION,
        "region": region.id,
        "variable": variable.code,
        "unit": variable.annual_unit,
        "years": [int(y) for y in years],
        "values": [_r(v, 4) for v in values],
        "excluded_years": sorted(int(y) for y in rep.incomplete_years),
        "partial_year": partial,
        "provenance": {
            "source": "NASA POWER — API mensual regional",
            "product": "+".join(grid.sources),
            "api_version": grid.api_version,
            "parameter": variable.code,
            "unit_declared": grid.unit_declared,
            "grid": GRID_TEXT,
            "spatial_method": SPATIAL_METHOD,
            "n_cells": cw.n_cells,
            "retrieved_at_utc": retrieved_at,
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


def map_doc(code: str, region_ids: list[str], results: dict[str, SeriesResult], first_year: int, last_year: int
            ) -> dict[str, Any]:
    meta = VARIABLE_META[code]
    keys = [f"{s}-{e}" for s, e in contract.window_keys(first_year, last_year)]
    windows = {k: [results[r].map_values[k] if r in results else None for r in region_ids] for k in keys}
    return {"schema_version": contract.SCHEMA_VERSION, "variable": code, "unit": meta["map_unit"],
            "regions": region_ids, "windows": windows,
            "classes": {"breaks": meta["breaks"], "labels": MAP_LABELS}}


def catalog_doc(regions: list[Region], weights: dict[str, CellWeights], codes: list[str], first_year: int,
                last_year: int, built_at: str) -> dict[str, Any]:
    return {
        "schema_version": contract.SCHEMA_VERSION,
        "built_at_utc": built_at,
        "alpha": ALPHA_DEFAULT,
        "period": {"first_year": first_year, "last_complete_year": last_year, "min_window_years": contract.MIN_WINDOW},
        "method": METHOD,
        "variables": [{"id": c, **{k: VARIABLE_META[c][k] for k in
                                   ("label", "definition", "kind", "unit_annual", "aggregation", "relative_change")}}
                      for c in codes],
        "regions": [{"id": r.id, "name": r.name, "country": r.country, "n_cells": weights[r.id].n_cells,
                     "small_region": weights[r.id].small_region} for r in regions],
    }


# --------------------------------------------------------------------------------------
# Validación conjunta y escritura «todo o nada»
# --------------------------------------------------------------------------------------
def validate_outputs(files: dict[str, dict], region_ids: list[str], codes: list[str], cells: dict[str, int],
                     first_year: int, last_year: int) -> None:
    problems: list[str] = []
    cat = files.get("catalog.json")
    if cat is None:
        problems.append("falta catalog.json")
    else:
        problems += [f"catalog.json: {p}" for p in contract.validate_catalog(cat)]
        if [r["id"] for r in cat["regions"]] != region_ids:
            problems.append("catalog.json: las regiones no son exactamente las pedidas")
    for code in codes:
        series = {}
        for rid in region_ids:
            path = f"series/{code}/{rid}.json"
            if cells[rid] == 0:
                if path in files:
                    problems.append(f"{path}: una región sin celdas no debe tener archivo")
                continue
            doc = files.get(path)
            if doc is None:
                problems.append(f"falta {path}")
                continue
            problems += [f"{path}: {p}" for p in contract.validate_series(doc, first_year, last_year)]
            if doc["provenance"].get("is_synthetic") is not False:
                problems.append(f"{path}: los datos publicados no pueden ser sintéticos")
            if not VARIABLE_META[code]["relative_change"]:
                n_pct = len(contract.PCT_COLUMNS)
                if any(v is not None for row in doc["windows"]["rows"] for v in row[-n_pct:]):
                    problems.append(f"{path}: las columnas de % deben ser null en una variable sin relative_change")
            series[rid] = doc
        mp = files.get(f"map/{code}.json")
        if mp is None:
            problems.append(f"falta map/{code}.json")
        else:
            problems += [f"map/{code}.json: {p}" for p in contract.validate_map(mp, series)]
            if mp["regions"] != region_ids:
                problems.append(f"map/{code}.json: las regiones no son las del catálogo")
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


# --------------------------------------------------------------------------------------
# Orquestación
# --------------------------------------------------------------------------------------
def build(region_ids: list[str], codes: list[str], out_dir: Path, downloader: Downloader,
          first_year: int = POWER_FIRST_YEAR, last_year: int | None = None, manifest_dir: Path = MANIFEST_DIR,
          today: _dt.date | None = None) -> dict[str, dict]:
    today = today or _dt.date.today()
    last_year = last_year if last_year is not None else today.year - 1
    end_request = min(last_year + 1, today.year)
    manifest_path = unique_manifest_path(manifest_dir, today.isoformat())
    manifest_ref = f"manifest/{manifest_path.name}"

    regions = load_regions(region_ids)
    region_ids = [r.id for r in regions]
    weights = {r.id: region_weights(r.geometry) for r in regions}
    tiles_by_region = {r.id: tiles_for_bounds(r.bbox) for r in regions if weights[r.id].n_cells}
    all_tiles = sorted({t for ts in tiles_by_region.values() for t in ts})

    files: dict[str, dict] = {}
    try:
        for code in codes:
            var = VARIABLES[code]
            try:
                grids = downloader.fetch_many(var, all_tiles, first_year, end_request)
            except DownloadFailed as exc:
                failed = {f["tile"] for f in exc.failures}
                affected = sorted(r for r, ts in tiles_by_region.items() if any(t.label in failed for t in ts))
                exc.affected_regions = affected  # type: ignore[attr-defined]
                raise
            retrieved_by_tile = {e["tile"]: e["retrieved_at_utc"] for e in downloader.manifest
                                 if e.get("variable") == code and e["status"] == "ok"}
            results: dict[str, SeriesResult] = {}
            for r in regions:
                cw = weights[r.id]
                if cw.n_cells == 0:
                    continue
                grid = merge_grids([grids[t] for t in tiles_by_region[r.id]])
                # Fecha de consulta de ESTA región: la más reciente de las teselas que usa, no de toda la variable.
                retrieved = max(retrieved_by_tile[t.label] for t in tiles_by_region[r.id])
                res = build_series(r, cw, var, grid, first_year, last_year, retrieved, manifest_ref)
                results[r.id] = res
                files[f"series/{code}/{r.id}.json"] = res.doc
            files[f"map/{code}.json"] = map_doc(code, region_ids, results, first_year, last_year)
    finally:
        downloader.write_manifest(manifest_path)

    built_at = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    files["catalog.json"] = catalog_doc(regions, weights, codes, first_year, last_year, built_at)
    validate_outputs(files, region_ids, codes, {r: w.n_cells for r, w in weights.items()}, first_year, last_year)
    write_all_or_nothing(out_dir, files)
    return files


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--regions", default=",".join(ALL_REGION_IDS), help="ids ISO 3166-2 separados por coma")
    ap.add_argument("--variables", default="T2M,PRECTOTCORR")
    ap.add_argument("--out", default=str(PIPELINE_DIR / "out" / "trends"))
    ap.add_argument("--last-year", type=int, default=None, help="último año completo (por omisión, el año pasado)")
    args = ap.parse_args(argv)
    region_ids = [r.strip() for r in args.regions.split(",") if r.strip()]
    codes = [c.strip() for c in args.variables.split(",") if c.strip()]
    t0 = _dt.datetime.now()
    try:
        files = build(region_ids, codes, Path(args.out), Downloader(), last_year=args.last_year)
    except DownloadFailed as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print(f"Regiones afectadas: {', '.join(getattr(exc, 'affected_regions', []))}", file=sys.stderr)
        print("No se escribió nada. Vuelve a ejecutar: la caché reutiliza lo ya descargado.", file=sys.stderr)
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
