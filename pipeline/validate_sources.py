"""Contraste de la T005: el pipeline no altera los datos de la fuente.

Para cada región y variable:
0. Región de una sola celda (US-DC): su valor regional coincide mes a mes con el endpoint por punto (≤ 0.01).
1. Celda frente al endpoint por punto: la celda de mayor peso, leída del endpoint regional, debe coincidir
   mes a mes con el endpoint por punto consultado en el centro de esa celda (≤ 0.01).
2. Serie anual frente a la clave anual (mes 13) de POWER: la media ponderada, con los mismos pesos, de
   los valores anuales que publica POWER para cada celda debe coincidir con nuestro valor anual (≤ 0.01).
   En T2M se compara en °C. En PRECTOTCORR POWER publica la tasa media anual (mm/día), así que se compara
   nuestro acumulado anual ÷ días del año, en mm/día.

Alternativa POWER (salida de build.py --source power).
Uso: python validate_sources.py --out out/t005_power [--regions MX-BCN,US-TX]
Escribe el informe en validation/t005.json.
"""

from __future__ import annotations

import argparse
import calendar
import json
import sys
from pathlib import Path

import numpy as np

from power_regional import PIPELINE_DIR, Downloader, merge_grids, tiles_for_bounds
from trendlens.config import VARIABLES, Location
from trendlens.data.nasa_power import NasaPowerSource
from weights import load_regions, region_weights

TOL = 0.01
POWER_TO_ID = {"T2M": "air_temperature", "PRECTOTCORR": "precipitation"}  # ids del contrato revisado


def check(region_ids: list[str], codes: list[str], out_dir: Path, first_year: int, last_year: int) -> dict:
    regions = load_regions(region_ids)
    dl = Downloader()
    point = NasaPowerSource(cache_dir=PIPELINE_DIR / "cache" / "point", ttl_days=3650)
    report = {"tolerance": TOL, "period": [first_year, last_year], "checks": []}
    for code in codes:
        var = VARIABLES[code]
        for r in regions:
            cw = region_weights(r.geometry)
            tiles = tiles_for_bounds(r.bbox)
            grids = dl.fetch_many(var, tiles, first_year, last_year + 1)
            grid = merge_grids([grids[t] for t in tiles])

            # 1. Celda de mayor peso frente al endpoint por punto
            k = int(np.argmax(cw.weights))
            lat, lon = float(cw.lats[k]), float(cw.lons[k])
            i = grid.index_of(lat, lon)
            b = point.fetch(var, Location(f"{r.id}-cell", f"{r.id} celda", lat, lon), first_year, last_year)
            pt = {(t.year, t.month): v for t, v in zip(b.data["timestamp"], b.data["value"])}
            diffs = [abs(grid.values[i, j] - pt[m]) for j, m in enumerate(grid.months)
                     if m in pt and np.isfinite(grid.values[i, j]) and np.isfinite(pt[m])]
            cell_max = float(np.max(diffs))
            report["checks"].append({
                "check": "celda regional = endpoint por punto", "region": r.id, "variable": code,
                "cell": [lat, lon], "point_grid_cell": b.provenance.grid_cell, "n_months": len(diffs),
                "max_abs_diff": round(cell_max, 6), "unit": grid.unit_declared, "pass": cell_max <= TOL,
            })

            # 2. Serie anual frente a la media ponderada de la clave anual de POWER
            s = json.loads((out_dir / "series" / POWER_TO_ID[code] / f"{r.id}.json").read_text(encoding="utf-8"))
            lookup = {(round(a, 4), round(o, 4)): j for j, (a, o) in enumerate(zip(grid.lats, grid.lons))}
            idx = np.array([lookup[(round(float(a), 4), round(float(o), 4))] for a, o in zip(cw.lats, cw.lons)])
            ann_diffs = []
            for y, v in zip(s["years"], s["values"]):
                src = float(np.sum(cw.weights * grid.annual[y][idx]) / cw.weights.sum())
                ours = v if code == "T2M" else v / (366 if calendar.isleap(y) else 365)
                ann_diffs.append(abs(ours - src))
            ann_max = float(np.max(ann_diffs))
            report["checks"].append({
                "check": "valor anual = clave anual de POWER (media ponderada)", "region": r.id, "variable": code,
                "n_years": len(ann_diffs), "max_abs_diff": round(ann_max, 6),
                "unit": "°C" if code == "T2M" else "mm/día (tasa media anual)", "pass": ann_max <= TOL,
            })
    report["all_pass"] = all(c["pass"] for c in report["checks"])
    return report


def check_single_cell_regions(region_ids: list[str], codes: list[str], first_year: int, last_year: int) -> list[dict]:
    """US1, prueba independiente al pie de la letra: el valor REGIONAL (pipeline) de una región de una sola celda
    coincide mes a mes con el endpoint por punto consultado en esa celda."""
    from build import regional_monthly  # import local: build importa este módulo indirectamente vía power_regional

    dl = Downloader()
    point = NasaPowerSource(cache_dir=PIPELINE_DIR / "cache" / "point", ttl_days=3650)
    out = []
    for code in codes:
        var = VARIABLES[code]
        for r in load_regions(region_ids):
            cw = region_weights(r.geometry)
            if cw.n_cells != 1:
                raise ValueError(f"{r.id} tiene {cw.n_cells} celdas; esta prueba exige una región de una sola celda.")
            tiles = tiles_for_bounds(r.bbox)
            grids = dl.fetch_many(var, tiles, first_year, last_year + 1)
            grid = merge_grids([grids[t] for t in tiles])
            regional = regional_monthly(grid, cw)
            lat, lon = float(cw.lats[0]), float(cw.lons[0])
            b = point.fetch(var, Location(f"{r.id}-cell", f"{r.id} celda", lat, lon), first_year, last_year)
            pt = {(t.year, t.month): v for t, v in zip(b.data["timestamp"], b.data["value"])}
            diffs = [abs(regional[j] - pt[m]) for j, m in enumerate(grid.months)
                     if m in pt and np.isfinite(regional[j]) and np.isfinite(pt[m])]
            mx = float(np.max(diffs))
            out.append({"check": "región de una sola celda = endpoint por punto", "region": r.id, "variable": code,
                        "n_cells": cw.n_cells, "cell": [lat, lon], "point_grid_cell": b.provenance.grid_cell,
                        "n_months": len(diffs), "max_abs_diff": round(mx, 6), "unit": grid.unit_declared,
                        "pass": mx <= TOL})
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Contraste de la T005")
    ap.add_argument("--out", default=str(PIPELINE_DIR / "out" / "t005_power"))
    ap.add_argument("--regions", default="MX-BCN,US-TX")
    ap.add_argument("--variables", default="T2M,PRECTOTCORR")
    ap.add_argument("--single-cell", default="US-DC", help="regiones de una sola celda para el contraste literal de US1")
    ap.add_argument("--report", default=str(PIPELINE_DIR / "validation" / "t005.json"))
    args = ap.parse_args(argv)
    cat = json.loads((Path(args.out) / "catalog.json").read_text(encoding="utf-8"))
    rep = check(args.regions.split(","), args.variables.split(","), Path(args.out),
                cat["period"]["first_year"], cat["period"]["last_complete_year"])
    if args.single_cell:
        rep["checks"] += check_single_cell_regions(args.single_cell.split(","), args.variables.split(","),
                                                   cat["period"]["first_year"], cat["period"]["last_complete_year"])
        rep["all_pass"] = all(c["pass"] for c in rep["checks"])
    rep["catalog_built_at_utc"] = cat["built_at_utc"]
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    for c in rep["checks"]:
        print(f"{'OK ' if c['pass'] else 'FALLA'} {c['region']:7} {c['variable']:12} {c['check']}: "
              f"máx |dif| = {c['max_abs_diff']} {c['unit']}")
    print("TODO CORRECTO" if rep["all_pass"] else "HAY DIFERENCIAS FUERA DE TOLERANCIA")
    return 0 if rep["all_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
