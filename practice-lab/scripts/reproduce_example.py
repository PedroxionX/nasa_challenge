"""Reproduce un análisis desde la línea de comandos (sin interfaz).

Ejemplos (desde la carpeta practice-lab):
  python scripts/reproduce_example.py synthetic --a opuesta_pos --b opuesta_neg --code T2M
  python scripts/reproduce_example.py fixture --code T2M            # datos reales GRABADOS (sin red)
  python scripts/reproduce_example.py power --a mexicali --b ensenada --code PRECTOTCORR --start 1991 --end 2025
  python scripts/reproduce_example.py experiment --phi 0.75 --sims 500
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from trendlens.config import PRESETS_BY_ID, VARIABLES, last_complete_year  # noqa: E402
from trendlens.data.nasa_power import NasaPowerSource, parse_power_monthly  # noqa: E402
from trendlens.data.synthetic import SCENARIOS, generate_monthly  # noqa: E402
from trendlens.explain import explain_comparison, explain_trend  # noqa: E402
from trendlens.export import results_table  # noqa: E402
from trendlens.stats.compare import compare_results  # noqa: E402
from trendlens.stats.engine import analyze_bundle  # noqa: E402
from trendlens.stats.experiments import rejection_rates  # noqa: E402

FIXTURES = {"mexicali": "power_mexicali_1981_2025.json", "ushuaia": "power_ushuaia_1981_2025.json"}


def _plain(md: str) -> str:
    return md.replace("**", "")


def report(ra, rb) -> None:
    cmp = compare_results(ra, rb)
    for slot, r in (("A", ra), ("B", rb)):
        print(f"\n=== Sitio {slot}: {r.location.name} ({'SINTÉTICO' if r.is_synthetic else r.provenance.source}) ===")
        e = explain_trend(r)
        for k in ("resumen", "interpretacion", "incertidumbre", "verdad_sintetica"):
            if e[k]:
                print("·", _plain(e[k]))
        for w in r.warnings:
            print(f"  [{w.level}] {w.message}")
    print("\n=== Comparación (Opposite Trends Explorer) ===")
    for p in explain_comparison(cmp, ra, rb):
        print("·", _plain(p))
    print("\n=== Tabla de resultados ===")
    print(results_table({"A": ra, "B": rb}, cmp).drop(columns=["url_solicitud"], errors="ignore").to_string(index=False))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["synthetic", "fixture", "power", "experiment"])
    ap.add_argument("--a", default=None)
    ap.add_argument("--b", default=None)
    ap.add_argument("--code", default="T2M", choices=list(VARIABLES))
    ap.add_argument("--start", type=int, default=1981)
    ap.add_argument("--end", type=int, default=None)
    ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--phi", type=float, default=0.5)
    ap.add_argument("--years", type=int, default=45)
    ap.add_argument("--sims", type=int, default=500)
    args = ap.parse_args()
    var = VARIABLES[args.code]

    if args.mode == "experiment":
        print(rejection_rates(args.phi, args.years, args.sims, args.alpha).to_string(index=False))
        return
    if args.mode == "synthetic":
        a, b = args.a or "opuesta_pos", args.b or "opuesta_neg"
        end = args.end or 2025
        ra = analyze_bundle(generate_monthly(SCENARIOS[a], var, "A"), args.start, end, args.alpha)
        rb = analyze_bundle(generate_monthly(SCENARIOS[b], var, "B"), args.start, end, args.alpha)
    elif args.mode == "fixture":
        a, b = args.a or "mexicali", args.b or "ushuaia"
        end = args.end or 2025
        rs = []
        for loc in (a, b):
            payload = json.loads((ROOT / "tests" / "fixtures" / FIXTURES[loc]).read_text(encoding="utf-8"))
            bundle = parse_power_monthly(payload, var, PRESETS_BY_ID[loc], request_url=f"fixture:{FIXTURES[loc]}",
                                         retrieved_at_utc="2026-11-06 (respuesta grabada)")
            rs.append(analyze_bundle(bundle, args.start, end, args.alpha))
        ra, rb = rs
    else:
        a, b = args.a or "mexicali", args.b or "ushuaia"
        end = args.end or last_complete_year()
        src = NasaPowerSource()
        ra = analyze_bundle(src.fetch(var, PRESETS_BY_ID[a], 1981, end), args.start, end, args.alpha)
        rb = analyze_bundle(src.fetch(var, PRESETS_BY_ID[b], 1981, end), args.start, end, args.alpha)
    report(ra, rb)


if __name__ == "__main__":
    main()
