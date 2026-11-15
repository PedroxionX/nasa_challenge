"""Publica variables nuevas en una carpeta ya publicada sin tocar las demás (T027).

    python merge_outputs.py --src out/gldas --dst ../web/public/data/trends

Copia `series/<variable>/` y `map/<variable>.json` de cada variable de `--src`, y añade (o sustituye) sus
entradas en `catalog.json` de `--dst`, conservando el orden y el contenido de las variables que ya estaban.
Las regiones de los dos catálogos deben ser idénticas. `catalog.period` se recalcula como la envolvente.

Antes de escribir nada valida en memoria la carpeta COMPLETA resultante con contract.py; si algo falla no
escribe. Los archivos de las variables existentes no se abren para escribir: quedan byte a byte iguales.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import contract


def _load(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def merged_catalog(dst_cat: dict, src_cat: dict) -> dict:
    if [r["id"] for r in dst_cat["regions"]] != [r["id"] for r in src_cat["regions"]]:
        raise ValueError("Las regiones de los dos catálogos no coinciden.")
    new_ids = [v["id"] for v in src_cat["variables"]]
    variables = [v for v in dst_cat["variables"] if v["id"] not in new_ids] + src_cat["variables"]
    out = dict(dst_cat)
    out["variables"] = variables
    out["period"] = dict(dst_cat["period"], first_year=min(v["first_year"] for v in variables),
                         last_complete_year=max(v["last_complete_year"] for v in variables))
    out["built_at_utc"] = max(dst_cat["built_at_utc"], src_cat["built_at_utc"])
    return out


def validate_folder(cat: dict, root: Path, overrides: dict[str, Path]) -> list[str]:
    """Valida el catálogo y todas las series y mapas; `overrides` mapea id de variable → carpeta de origen."""
    problems = [f"catalog.json: {p}" for p in contract.validate_catalog(cat)]
    for v in cat["variables"]:
        base = overrides.get(v["id"], root)
        series = {}
        for r in cat["regions"]:
            p = base / "series" / v["id"] / f"{r['id']}.json"
            if not p.exists():
                problems.append(f"falta series/{v['id']}/{r['id']}.json")
                continue
            s = _load(p)
            problems += [f"series/{v['id']}/{r['id']}.json: {x}"
                         for x in contract.validate_series(s, v["first_year"], v["last_complete_year"])]
            if s["provenance"].get("is_synthetic") is not False:
                problems.append(f"series/{v['id']}/{r['id']}.json: datos sintéticos")
            series[r["id"]] = s
        mp = base / "map" / f"{v['id']}.json"
        if not mp.exists():
            problems.append(f"falta map/{v['id']}.json")
        else:
            problems += [f"map/{v['id']}.json: {x}" for x in contract.validate_map(_load(mp), series)]
    return problems


def merge(src: Path, dst: Path) -> list[str]:
    src_cat, dst_cat = _load(src / "catalog.json"), _load(dst / "catalog.json")
    cat = merged_catalog(dst_cat, src_cat)
    new_ids = [v["id"] for v in src_cat["variables"]]
    problems = validate_folder(cat, dst, {vid: src for vid in new_ids})
    contract.assert_valid("La carpeta resultante", problems)
    for vid in new_ids:
        target = dst / "series" / vid
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(src / "series" / vid, target)
        shutil.copy2(src / "map" / f"{vid}.json", dst / "map" / f"{vid}.json")
    (dst / "catalog.json").write_text(json.dumps(cat, ensure_ascii=False, allow_nan=False, separators=(",", ":")),
                                      encoding="utf-8")
    return new_ids


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", required=True)
    ap.add_argument("--dst", required=True)
    a = ap.parse_args(argv)
    try:
        ids = merge(Path(a.src), Path(a.dst))
    except (contract.ContractError, ValueError) as exc:
        print(f"ERROR: {exc}\nNo se escribió nada.", file=sys.stderr)
        return 1
    print(f"OK: publicadas {', '.join(ids)} en {a.dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
