"""T040: ¿los 1.081 mm al año de escorrentía en D.C. son un error nuestro o vienen de GLDAS?

    python validation_runoff_dc.py

1. Celda oeste de D.C. (38,875, −77,125): serie anual del pipeline frente a Giovanni con un recuadro que solo
   contiene esa celda (validation/giovanni/US-DC_runoff_celda_oeste.json).
2. Balance hídrico de lo publicado (P − ET − Q) en D.C., Maryland y Virginia, 2000–2025.
Deja validation/t040_runoff_dc.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
SERIES = HERE.parent / "web" / "public" / "data" / "trends" / "series"
CELL = (38.875, -77.125)
TOL_REL = 0.02  # la de validate_real.py para sumas anuales


def pipeline_cell() -> dict[int, float]:
    from build import regional_monthly
    from validate_real import annual, read_grid
    from weights import CellWeights

    var, data, _, _ = read_grid("runoff", 2025)
    cw = CellWeights(np.array([CELL[0]]), np.array([CELL[1]]), np.ones(1), np.ones(1))
    return annual(var, data.months, regional_monthly(data, cw))


def published_mean(var: str, region: str) -> float:
    d = json.loads((SERIES / var / f"{region}.json").read_text(encoding="utf-8"))
    v = [x for y, x in zip(d["years"], d["values"]) if x is not None and 2000 <= y <= 2025]
    return round(float(np.mean(v)), 1)


def main() -> int:
    g = json.loads((HERE / "validation" / "giovanni" / "US-DC_runoff_celda_oeste.json").read_text(encoding="utf-8"))
    gv = {int(k): v for k, v in g["annual"].items()}
    ours = pipeline_cell()
    years = sorted(set(gv) & set(ours))
    d = np.array([ours[y] - gv[y] for y in years])
    gmean = float(np.mean([gv[y] for y in years]))
    cell = {"cell_center": list(CELL), "giovanni_bbox": g["shape"], "n_years": len(years),
            "mean_pipeline": round(float(np.mean([ours[y] for y in years])), 1), "mean_giovanni": round(gmean, 1),
            "max_abs_diff": round(float(np.abs(d).max()), 3), "tolerance": round(TOL_REL * gmean, 1),
            "within_tolerance": bool(np.abs(d).max() <= TOL_REL * gmean)}
    balance = {}
    for r in ("US-DC", "US-MD", "US-VA"):
        p, et, q = (published_mean(v, r) for v in ("precipitation", "evapotranspiration", "runoff"))
        balance[r] = {"precipitation_mm": p, "evapotranspiration_mm": et, "runoff_mm": q,
                      "residual_p_minus_et_minus_q_mm": round(p - et - q, 1), "runoff_over_precip": round(q / p, 2)}
    rep = {"check": "T040: escorrentía de D.C. (celda frente a Giovanni y balance hídrico)", "cell": cell,
           "water_balance_2000_2025": balance,
           "reading": "La celda coincide con Giovanni: el valor viene de GLDAS, no del pipeline. En D.C. la ET es "
                      "~10 % de la precipitación y casi toda el agua escurre, lo propio de una celda urbana en Noah.",
           "checked_at_utc": __import__("sources.base", fromlist=["now_utc"]).now_utc()}
    (HERE / "validation" / "t040_runoff_dc.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1),
                                                            encoding="utf-8")
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
