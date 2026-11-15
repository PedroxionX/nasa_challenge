"""T041: ¿la bajada del polvo de MERRA-2 en 2003–2025 se ve también en una medida que MERRA-2 no asimila?

    python validation_dust_reference.py

Compara, por estado, la tendencia (Sen, %/década sobre la media del periodo; Mann-Kendall con corrección AR(1)) de:
  · polvo de MERRA-2 (DUEXTTAU, Giovanni), lo que publicamos;
  · AOD total de MERRA-2 (TOTEXTTAU, serie publicada);
  · AOD total de MODIS Aqua Deep Blue (Giovanni), la referencia independiente.
MODIS da el AOD de todos los aerosoles, no solo del polvo: coincidir en el signo apoya la tendencia, no la prueba.
Lee validation/giovanni/<región>_{dust_optical_depth,modis_deep_blue_aod}.json y deja validation/t041_dust_reference.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

from sources.base import now_utc
from trendlens.stats.engine import trend_core

HERE = Path(__file__).resolve().parent
GIO = HERE / "validation" / "giovanni"
SERIES = HERE.parent / "web" / "public" / "data" / "trends" / "series"
REGIONS = ("US-AZ", "US-TX")
FIRST, LAST = 2003, 2025


def trend(years, values) -> dict:
    y = np.array(years, float)
    v = np.array(values, float)
    t = trend_core(y, v)
    mean = float(np.mean(v))
    return {"n_years": int(t.n), "mean": round(mean, 4), "sen_per_decade": round(t.sen_slope * 10, 5),
            "pct_per_decade": round(t.sen_slope * 10 / mean * 100, 2),
            "ci_pct_per_decade": [round(c * 10 / mean * 100, 2) for c in t.sen_ci],
            "p_value": round(float(t.primary.p_value), 4), "verdict": t.verdict}


def giovanni_series(region: str, var: str) -> tuple[list[int], list[float]]:
    a = json.loads((GIO / f"{region}_{var}.json").read_text(encoding="utf-8"))["annual"]
    ys = [y for y in sorted(map(int, a)) if FIRST <= y <= LAST]
    return ys, [a[str(y)] for y in ys]


def published(region: str, var: str) -> tuple[list[int], list[float]]:
    d = json.loads((SERIES / var / f"{region}.json").read_text(encoding="utf-8"))
    pairs = [(y, v) for y, v in zip(d["years"], d["values"]) if v is not None and FIRST <= y <= LAST]
    return [p[0] for p in pairs], [p[1] for p in pairs]


def main() -> int:
    out = []
    for r in REGIONS:
        dust = trend(*giovanni_series(r, "dust_optical_depth"))
        aod = trend(*published(r, "aerosol_optical_depth"))
        modis = trend(*giovanni_series(r, "modis_deep_blue_aod"))
        my, mv = giovanni_series(r, "modis_deep_blue_aod")
        dy, dv = giovanni_series(r, "dust_optical_depth")
        common = sorted(set(my) & set(dy))
        corr = float(np.corrcoef([mv[my.index(y)] for y in common], [dv[dy.index(y)] for y in common])[0, 1])
        out.append({"region": r, "merra2_dust": dust, "merra2_total_aod": aod, "modis_aqua_deep_blue_aod": modis,
                    "same_sign_dust_vs_modis": bool(np.sign(dust["sen_per_decade"]) == np.sign(modis["sen_per_decade"])),
                    "interannual_corr_dust_vs_modis": round(corr, 3)})
    rep = {"check": "T041: tendencia del polvo de MERRA-2 frente a MODIS Aqua Deep Blue (no asimilado por MERRA-2 sobre tierra)",
           "period": f"{FIRST}–{LAST}",
           "sources": {"merra2_dust": "M2TMNXAER_5_12_4_DUEXTTAU (Giovanni ArAvTs, forma del estado)",
                       "merra2_total_aod": "serie publicada aerosol_optical_depth (TOTEXTTAU)",
                       "modis": "MYD08_M3_6_1_Deep_Blue_Aerosol_Optical_Depth_550_Land_Mean_Mean (Giovanni ArAvTs)"},
           "caveat": "MODIS mide todos los aerosoles; el signo común apoya la bajada del polvo, no la aísla.",
           "regions": out, "checked_at_utc": now_utc()}
    (HERE / "validation" / "t041_dust_reference.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1),
                                                                  encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
