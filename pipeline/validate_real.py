"""Validación de las fuentes reales de GES DISC (T022).

    python validate_real.py sanity --out out/gesdisc_all           # sanidad física de las 84 regiones
    python validate_real.py cells                                   # US-DC (una celda) frente al gránulo original
    python validate_real.py giovanni --region US-TX --var air_temperature --giovanni validation/giovanni/US-TX_air_temperature.json

`giovanni` compara las medias anuales de Giovanni (Time Series, Area-Averaged, forma del estado) con el
pipeline usando DOS reglas espaciales: la nuestra (cos(lat) × fracción cubierta, FR-D02) y la de «centro
dentro» que usa Giovanni (research D4). Tolerancias con la regla de Giovanni: 0,1 °C en temperatura y 2 % de
la media anual del periodo en precipitación. Los informes se guardan en validation/.
"""

from __future__ import annotations

import argparse
import calendar
import json
import sys
from pathlib import Path

import numpy as np
import shapely

import variables
from build import complete_period, default_sources, regional_monthly
from power_regional import PIPELINE_DIR
from sources.base import now_utc
from weights import CellWeights, candidate_cells, load_regions, region_weights

VALIDATION_DIR = PIPELINE_DIR / "validation"
TOL_T = 0.1
TOL_P_REL = 0.02


# --------------------------------------------------------------------------------------
# Lectura de la rejilla (desde la caché que dejó build.py)
# --------------------------------------------------------------------------------------
def read_grid(var_id: str):
    var = variables.get(var_id, "gesdisc")
    src = default_sources("gesdisc")[var_id]
    all_regions = load_regions()
    w_all = {r.id: region_weights(r.geometry, var.grid) for r in all_regions}
    union = sorted({(round(float(a), 4), round(float(o), 4)) for w in w_all.values() for a, o in zip(w.lats, w.lons)})
    ulats, ulons = (np.array(c) for c in zip(*union))
    import datetime as dt

    data = src.read(var, all_regions, w_all, ulats, ulons, var.first_request_year, dt.date.today().year)
    return var, data, w_all, src


def annual(var, months, monthly) -> dict[int, float]:
    """Media anual ponderada por días (temperatura) o suma de acumulados (precipitación), solo años completos."""
    out: dict[int, float] = {}
    by_year: dict[int, list[tuple[int, float]]] = {}
    for (y, m), v in zip(months, monthly):
        by_year.setdefault(y, []).append((m, v))
    for y, items in by_year.items():
        if len(items) != 12 or any(not np.isfinite(v) for _, v in items):
            continue
        days = np.array([calendar.monthrange(y, m)[1] for m, _ in items], float)
        vals = np.array([v for _, v in items])
        out[y] = float(np.sum(vals * days) / days.sum()) if var.spec.aggregation == "mean" else float(np.sum(vals * days))
    return out


def center_inside_weights(geom, grid) -> CellWeights:
    lats, lons = candidate_cells(geom.bounds, grid)
    inside = shapely.contains_xy(geom, lons, lats)
    la, lo = lats[inside], lons[inside]
    return CellWeights(la, lo, np.ones(len(la)), np.cos(np.deg2rad(la)))


# --------------------------------------------------------------------------------------
# 1. Sanidad física
# --------------------------------------------------------------------------------------
def sanity(out_dir: Path) -> dict:
    cat = json.loads((out_dir / "catalog.json").read_text(encoding="utf-8"))
    checks, flags = [], []
    for v in cat["variables"]:
        vid = v["id"]
        for r in cat["regions"]:
            p = out_dir / "series" / vid / f"{r['id']}.json"
            if not p.exists():
                checks.append({"variable": vid, "region": r["id"], "ok": False, "why": "sin archivo"})
                continue
            s = json.loads(p.read_text(encoding="utf-8"))
            vals = np.array([x for x in s["values"] if x is not None], float)
            mean = float(vals.mean()) if len(vals) else float("nan")
            if vid == "air_temperature":
                lo, hi = (10.0, 30.0) if r["country"] == "MX" else (-20.0, 30.0)
                ok = len(vals) > 0 and lo <= mean <= hi
                jumps = np.abs(np.diff(vals)) > 2.5
            else:
                ok = len(vals) > 0 and vals.min() >= 0 and mean < 6000
                jumps = np.abs(np.diff(vals)) > 0.6 * mean
            for k in np.where(jumps)[0]:
                flags.append({"variable": vid, "region": r["id"], "years": [s["years"][k], s["years"][k + 1]],
                              "values": [round(vals[k], 2), round(vals[k + 1], 2)]})
            checks.append({"variable": vid, "region": r["id"], "mean": round(mean, 3), "n_years": len(vals),
                           "ok": bool(ok)})
    rep = {"check": "sanidad física de las 84 regiones", "out": str(out_dir), "checked_at_utc": now_utc(),
           "n_checks": len(checks), "failed": [c for c in checks if not c["ok"]],
           "jumps_to_review": flags, "all_pass": all(c["ok"] for c in checks)}
    ak = next((c for c in checks if c["region"] == "US-AK" and c["variable"] == "air_temperature"), None)
    rep["examples"] = {c["region"]: c["mean"] for c in checks if c["variable"] == "air_temperature"
                       and c["region"] in ("US-AK", "US-TX", "MX-BCN", "MX-YUC", "US-HI")}
    rep["examples_precip_mm"] = {c["region"]: c["mean"] for c in checks if c["variable"] == "precipitation"
                                 and c["region"] in ("MX-BCS", "MX-SON", "MX-TAB", "US-LA", "US-NV")}
    if ak is not None:
        rep["alaska_colder_than_texas"] = bool(ak["mean"] < rep["examples"].get("US-TX", 99))
    return rep


# --------------------------------------------------------------------------------------
# 2. Región de una sola celda frente al gránulo original
# --------------------------------------------------------------------------------------
def cells(months_to_check=((1990, 1), (2005, 7), (2024, 7))) -> dict:
    import earthaccess

    from sources.gesdisc import ensure_login, open_granule, search_granules

    ensure_login()
    (dc,) = load_regions(["US-DC"])
    out = []
    for var_id in variables.VARIABLE_IDS:
        var, data, w_all, src = read_grid(var_id)
        prod = src.product
        merra_cw = region_weights(dc.geometry, var.grid)
        cw = merra_cw if merra_cw.n_cells == 1 else CellWeights(merra_cw.lats[:1], merra_cw.lons[:1],
                                                                 np.ones(1), np.ones(1))
        series = regional_monthly(data, cw)
        for y, m in months_to_check:
            if (y, m) not in data.months:
                continue
            k = data.months.index((y, m))
            (g,) = [g for g in search_granules(prod, y, y) if g.month == (y, m)]
            lats, lons, arr = prod.read(open_granule(g))
            i = int(np.argmin(np.abs(lats - cw.lats[0])))
            j = int(np.argmin(np.abs(lons - cw.lons[0])))
            diff = abs(float(series[k]) - float(arr[i, j]))
            out.append({"variable": var_id, "month": f"{y}-{m:02d}", "cell": [float(cw.lats[0]), float(cw.lons[0])],
                        "pipeline": round(float(series[k]), 5), "granule": round(float(arr[i, j]), 5),
                        "abs_diff": round(diff, 6), "pass": diff <= 0.01,
                        "note": "US-DC tiene 1 celda en MERRA-2; en IMERG se compara su primera celda"
                        if merra_cw.n_cells != 1 else "US-DC: región de una sola celda"})
    return {"check": "serie regional de una celda = valor de la celda en el gránulo (≤ 0,01)",
            "earthaccess": getattr(earthaccess, "__version__", "?"), "checked_at_utc": now_utc(),
            "checks": out, "all_pass": all(c["pass"] for c in out)}


# --------------------------------------------------------------------------------------
# 3. Giovanni con dos reglas
# --------------------------------------------------------------------------------------
def giovanni(region_id: str, var_id: str, giovanni_file: Path) -> dict:
    g = json.loads(Path(giovanni_file).read_text(encoding="utf-8"))
    gv = {int(k): float(v) for k, v in g["annual"].items()}
    var, data, w_all, _ = read_grid(var_id)
    (reg,) = load_regions([region_id])
    fy, ly = complete_period(data.months, var.first_request_year, max(gv))
    rules = {"fraccion_cubierta": w_all[region_id], "centro_dentro": center_inside_weights(reg.geometry, var.grid)}
    res = {}
    from trendlens.stats.engine import trend_core

    for name, cw in rules.items():
        ours = annual(var, data.months, regional_monthly(data, cw))
        years = sorted(y for y in gv if y in ours and fy <= y <= ly)
        d = np.array([ours[y] - gv[y] for y in years])
        gmean = float(np.mean([gv[y] for y in years]))
        so = trend_core(np.array(years, float), np.array([ours[y] for y in years])).sen_slope * 10
        sg = trend_core(np.array(years, float), np.array([gv[y] for y in years])).sen_slope * 10
        tol = TOL_T if var_id == "air_temperature" else TOL_P_REL * gmean
        res[name] = {"n_cells": cw.n_cells, "n_years": len(years), "mean_diff": round(float(d.mean()), 4),
                     "max_abs_diff": round(float(np.abs(d).max()), 4),
                     "max_abs_diff_rel": round(float(np.abs(d).max() / gmean), 5),
                     "slope_decade_pipeline": round(so, 4), "slope_decade_giovanni": round(sg, 4),
                     "tolerance": round(tol, 4), "within_tolerance": bool(np.abs(d).max() <= tol)}
    return {"check": "Giovanni frente al pipeline con dos reglas espaciales", "region": region_id, "variable": var_id,
            "unit": var.unit_annual, "giovanni": {k: v for k, v in g.items() if k != "annual"},
            "rules": res, "pass_with_giovanni_rule": res["centro_dentro"]["within_tolerance"],
            "checked_at_utc": now_utc()}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Validación de las fuentes reales (T022)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s1 = sub.add_parser("sanity")
    s1.add_argument("--out", default=str(PIPELINE_DIR / "out" / "gesdisc_all"))
    sub.add_parser("cells")
    s3 = sub.add_parser("giovanni")
    s3.add_argument("--region", required=True)
    s3.add_argument("--var", required=True, choices=list(variables.VARIABLE_IDS))
    s3.add_argument("--giovanni", required=True)
    a = ap.parse_args(argv)
    VALIDATION_DIR.mkdir(exist_ok=True)
    if a.cmd == "sanity":
        rep, name = sanity(Path(a.out)), "real_sanity.json"
        ok = rep["all_pass"]
    elif a.cmd == "cells":
        rep, name = cells(), "real_single_cell.json"
        ok = rep["all_pass"]
    else:
        rep, name = giovanni(a.region, a.var, Path(a.giovanni)), f"real_giovanni_{a.region}_{a.var}.json"
        ok = True
    (VALIDATION_DIR / name).write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rep, ensure_ascii=False, indent=1)[:3000])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
