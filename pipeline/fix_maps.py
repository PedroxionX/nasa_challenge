"""Rehace map/{variable}.json a partir de sus propias series (mismo número y redondeo que la columna).

Uso: python fix_maps.py <carpeta de salida>. No recalcula estadística: copia slope_decade (o slope_decade_pct en
variables con relative_change) de cada fila de cada serie. Sirve para salidas generadas antes de que build.py
igualara el redondeo del mapa con el de la serie.
"""

import json
import sys
from pathlib import Path

import contract


def fix(out: Path) -> int:
    cat = json.loads((out / "catalog.json").read_text(encoding="utf-8"))
    rel = {v["id"]: v["relative_change"] for v in cat["variables"]}
    changed = 0
    for vid, is_rel in rel.items():
        p = out / "map" / f"{vid}.json"
        m = json.loads(p.read_text(encoding="utf-8"))
        col = "slope_decade_pct" if is_rel else "slope_decade"
        for i, rid in enumerate(m["regions"]):
            sp = out / "series" / vid / f"{rid}.json"
            if not sp.exists():
                continue
            s = json.loads(sp.read_text(encoding="utf-8"))
            for row in s["windows"]["rows"]:
                d = dict(zip(s["windows"]["columns"], row))
                k = f"{d['start']}-{d['end']}"
                if m["windows"][k][i] != d[col]:
                    m["windows"][k][i] = d[col]
                    changed += 1
        assert not contract.validate_map(m), contract.validate_map(m)
        p.write_text(json.dumps(m, ensure_ascii=False, allow_nan=False, separators=(",", ":")), encoding="utf-8")
    return changed


if __name__ == "__main__":
    print("valores corregidos:", fix(Path(sys.argv[1])))
